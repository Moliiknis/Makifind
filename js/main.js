(function () {
  "use strict";

  var CACHE_KEY = "fxc.effects.v1";
  var FAV_KEY = "fxc.favorites.v1";
  var USAGE_KEY = "fxc.usage.v1";
  var MAX_ROWS = 80;

  var cep = window.__adobe_cep__;
  var qEl = document.getElementById("q");
  var listEl = document.getElementById("list");
  var countEl = document.getElementById("count");
  var toastEl = document.getElementById("toast");
  var refreshEl = document.getElementById("refresh");

  var effects = [];      // {name, match, cat}
  var rows = [];         // currently rendered effects, in order
  var sel = 0;
  var filter = "all";

  // ---------- storage ----------

  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  var favorites = load(FAV_KEY, {});  // matchName -> true
  var usage = load(USAGE_KEY, {});    // matchName -> {n, t}

  function usageBoost(m) {
    var u = usage[m];
    if (!u) return 0;
    var days = (Date.now() - u.t) / 864e5;
    return Math.min(u.n, 20) * 6 + Math.max(0, 30 - days);
  }

  // ---------- host ----------

  function evalHost(script, done) {
    if (!cep) { toast("The panel is not running inside After Effects", true); return; }
    cep.evalScript(script, function (res) { done(String(res || "")); });
  }

  var ERRORS = {
    nocomp: "Open a composition",
    nolayers: "Select a layer (or Shift+Enter for an adjustment layer)",
    cantadd: "This effect can't be added to the selected layers"
  };

  function hostError(res) {
    var code = res.indexOf("err:") === 0 ? res.slice(4) : res;
    return ERRORS[code] || ("Error: " + (code || "no response from AE"));
  }

  function loadEffects(force) {
    var cached = load(CACHE_KEY, null);
    if (cached && cached.length && !force) {
      effects = cached;
      render();
    }
    refreshEl.classList.add("busy");
    evalHost("fxList()", function (res) {
      refreshEl.classList.remove("busy");
      if (res.indexOf("ok:") !== 0) { toast(hostError(res), true); return; }
      var seen = {};
      effects = res.slice(3).split("\n").map(function (line) {
        var p = line.split("\t");
        return { name: p[0], match: p[1], cat: p[2] || "" };
      }).filter(function (e) {
        if (!e.match || seen[e.match]) return false;
        seen[e.match] = true;
        return true;
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
      save(CACHE_KEY, effects);
      render();
      if (force) toast("Effects found: " + effects.length);
    });
    if (!cep) refreshEl.classList.remove("busy");
  }

  // ---------- search & render ----------

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function highlight(text, hits) {
    if (!hits || !hits.length) return escapeHtml(text);
    var set = {}, out = "", open = false;
    hits.forEach(function (i) { set[i] = true; });
    for (var i = 0; i < text.length; i++) {
      if (set[i] && !open) { out += "<mark>"; open = true; }
      if (!set[i] && open) { out += "</mark>"; open = false; }
      out += escapeHtml(text.charAt(i));
    }
    return out + (open ? "</mark>" : "");
  }

  function pool() {
    if (filter === "fav") return effects.filter(function (e) { return favorites[e.match]; });
    if (filter === "recent") return effects.filter(function (e) { return usage[e.match]; });
    return effects;
  }

  function search(query) {
    var src = pool(), out = [];
    query = query.trim();

    if (!query) {
      out = src.map(function (e) { return { e: e, score: usageBoost(e.match) + (favorites[e.match] ? 50 : 0), hits: [] }; });
      if (filter !== "all") out.sort(function (a, b) { return b.score - a.score; });
      else {
        // Empty query: favorites and recents first, then everything alphabetically.
        var top = out.filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; });
        var rest = out.filter(function (r) { return r.score <= 0; });
        out = top.concat(rest);
        out.topCount = top.length;
      }
      return out;
    }

    src.forEach(function (e) {
      var m = FxSearch.match(query, e.name);
      var hits = m && m.hits;
      if (!m) {
        // Also find effects by their internal English name, e.g. "gaussian" in a localized AE.
        m = FxSearch.match(query, e.match.replace(/^(ADBE|CC|APC|VISINF)\s+/i, ""));
        if (m) { m.score -= 150; hits = []; }
      }
      if (!m) {
        m = FxSearch.match(query, e.cat);
        if (m) { m.score -= 300; hits = []; }
      }
      if (m) out.push({ e: e, score: m.score + usageBoost(e.match) + (favorites[e.match] ? 25 : 0), hits: hits });
    });
    out.sort(function (a, b) { return b.score - a.score || a.e.name.localeCompare(b.e.name); });
    return out;
  }

  var STAR_SVG = '<svg viewBox="0 0 20 20"><path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>';

  function rowHtml(r, i) {
    var fav = favorites[r.e.match];
    return '<li class="row' + (i === sel ? " sel" : "") + '" data-i="' + i + '" role="option" style="animation-delay:' + Math.min(i, 12) * 12 + 'ms">' +
      '<span class="name">' + highlight(r.e.name, r.hits) + "</span>" +
      '<span class="cat">' + escapeHtml(r.e.cat) + "</span>" +
      '<button class="star' + (fav ? " on" : "") + '" data-star="' + i + '" title="Favorite (Ctrl+S)">' + STAR_SVG + "</button>" +
      "</li>";
  }

  function render() {
    var query = qEl.value;
    var results = search(query);
    rows = results.slice(0, MAX_ROWS);
    sel = Math.min(sel, Math.max(rows.length - 1, 0));
    countEl.textContent = results.length ? results.length : "";

    if (!effects.length) {
      listEl.innerHTML = '<li class="empty"><b>Loading effects…</b>If the list does not appear, open the panel in After Effects.</li>';
      return;
    }
    if (!rows.length) {
      var msg = filter === "fav" && !query ? "<b>Nothing here yet</b>Hover an effect and press ★ or Ctrl+S"
              : filter === "recent" && !query ? "<b>Nothing here yet</b>Effects you apply will show up here"
              : "<b>Nothing found</b>Try part of a word or another name";
      listEl.innerHTML = '<li class="empty">' + msg + "</li>";
      return;
    }

    var html = "";
    var topCount = results.topCount;
    rows.forEach(function (r, i) {
      if (!query && filter === "all" && topCount) {
        if (i === 0) html += '<li class="group">Favorites and recent</li>';
        if (i === topCount) html += '<li class="group">All effects</li>';
      }
      html += rowHtml(r, i);
    });
    listEl.innerHTML = html;
    scrollToSel();
  }

  function select(i) {
    if (!rows.length) return;
    sel = (i + rows.length) % rows.length;
    var prev = listEl.querySelector(".row.sel");
    if (prev) prev.classList.remove("sel");
    var cur = listEl.querySelector('.row[data-i="' + sel + '"]');
    if (cur) cur.classList.add("sel");
    scrollToSel();
  }

  function scrollToSel() {
    var cur = listEl.querySelector(".row.sel");
    if (cur) cur.scrollIntoView({ block: "nearest" });
  }

  // ---------- actions ----------

  function apply(i, asAdjustment) {
    var r = rows[i];
    if (!r) return;
    var e = r.e;
    var script = "fxApply(" + JSON.stringify(e.match) + "," + JSON.stringify(e.name) + "," + (asAdjustment ? "true" : "false") + ")";
    evalHost(script, function (res) {
      if (res.indexOf("ok:") !== 0) { toast(hostError(res), true); return; }
      var u = usage[e.match] || { n: 0, t: 0 };
      usage[e.match] = { n: u.n + 1, t: Date.now() };
      save(USAGE_KEY, usage);
      var n = +res.slice(3);
      toast(e.name + (asAdjustment ? " → new adjustment layer" : n > 1 ? " → layers: " + n : " ✓"));
      qEl.select();
    });
  }

  function toggleFav(i) {
    var r = rows[i];
    if (!r) return;
    if (favorites[r.e.match]) delete favorites[r.e.match];
    else favorites[r.e.match] = true;
    save(FAV_KEY, favorites);
    var star = listEl.querySelector('[data-star="' + i + '"]');
    if (star) star.classList.toggle("on", !!favorites[r.e.match]);
    toast(favorites[r.e.match] ? "★ " + r.e.name : "Removed from favorites");
  }

  function setFilter(f) {
    filter = f;
    Array.prototype.forEach.call(document.querySelectorAll(".chips [data-filter]"), function (b) {
      b.classList.toggle("on", b.dataset.filter === f);
    });
    sel = 0;
    render();
    qEl.focus();
  }

  // ---------- events ----------

  qEl.addEventListener("input", function () { sel = 0; render(); });

  qEl.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); select(sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); select(sel - 1); }
    else if (e.key === "PageDown") { e.preventDefault(); select(Math.min(sel + 8, rows.length - 1)); }
    else if (e.key === "PageUp") { e.preventDefault(); select(Math.max(sel - 8, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); apply(sel, e.shiftKey); }
    else if (e.key === "Escape") { qEl.value = ""; sel = 0; render(); }
    else if (e.key === "Tab") {
      e.preventDefault();
      var order = ["all", "fav", "recent"];
      setFilter(order[(order.indexOf(filter) + (e.shiftKey ? 2 : 1)) % 3]);
    }
    else if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.code === "KeyS")) { e.preventDefault(); toggleFav(sel); }
  });

  listEl.addEventListener("mousemove", function (e) {
    var row = e.target.closest(".row");
    if (row && +row.dataset.i !== sel) select(+row.dataset.i);
  });

  listEl.addEventListener("click", function (e) {
    var star = e.target.closest("[data-star]");
    if (star) { toggleFav(+star.dataset.star); return; }
    var row = e.target.closest(".row");
    if (row) apply(+row.dataset.i, e.shiftKey);
  });

  document.querySelector(".chips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (b) setFilter(b.dataset.filter);
  });

  refreshEl.addEventListener("click", function () { loadEffects(true); });

  // Typing anywhere in the panel goes to the search box.
  document.addEventListener("keydown", function (e) {
    if (document.activeElement !== qEl && e.key.length === 1 && !e.ctrlKey && !e.metaKey) qEl.focus();
  });
  window.addEventListener("focus", function () { qEl.focus(); qEl.select(); });

  // ---------- toast ----------

  var toastTimer;
  function toast(msg, isErr) {
    toastEl.textContent = msg;
    toastEl.classList.toggle("err", !!isErr);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  // ---------- init ----------

  render();
  loadEffects(false);
  qEl.focus();
})();
