/*
 * MakiInterface: per-panel interface settings shared by the Makimchi panels.
 * Two presets (Classic = everything, Minimal = only the essentials) plus free customization:
 * which parts are shown, density and accent colour. Saved per panel in localStorage.
 *
 * Usage: MakiInterface.init({
 *   key, title,
 *   options:  [{ id, label, behavior? }],          // behavior options change logic, not visibility
 *   presets:  { classic: { show, density }, minimal: { show, density } },
 *   accents:  [{ id, label, swatch, vars }],       // first one is the panel's own look
 *   mount:    "#selector"                          // where the gear button goes
 * });
 * Hidden parts get the class "ui-hide-<id>" on <html>; density lands in <html data-density>.
 */
(function () {
  "use strict";

  var GEAR =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.31 8.05 L18.48 8.55 L18.48 11.45 L16.31 11.95 L15.84 13.08 L17.02 14.96 L14.96 17.02 L13.08 15.84 L11.95 16.31 L11.45 18.48 L8.55 18.48 L8.05 16.31 L6.92 15.84 L5.04 17.02 L2.98 14.96 L4.16 13.08 L3.69 11.95 L1.52 11.45 L1.52 8.55 L3.69 8.05 L4.16 6.92 L2.98 5.04 L5.04 2.98 L6.92 4.16 L8.05 3.69 L8.55 1.52 L11.45 1.52 L11.95 3.69 L13.08 4.16 L14.96 2.98 L17.02 5.04 L15.84 6.92Z" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.7"/></svg>';
  var CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';

  // Little drawings of the two presets for the preset cards.
  var ART = {
    classic:
      '<svg viewBox="0 0 64 40" aria-hidden="true"><rect x="1" y="1" width="62" height="38" rx="5" class="a-frame"/>' +
      '<rect x="6" y="6" width="22" height="4" rx="2" class="a-dim"/><rect x="44" y="6" width="14" height="4" rx="2" class="a-dim"/>' +
      '<rect x="6" y="14" width="30" height="20" rx="3" class="a-acc"/><rect x="40" y="14" width="18" height="3" rx="1.5" class="a-dim"/>' +
      '<rect x="40" y="20" width="14" height="3" rx="1.5" class="a-dim"/><rect x="40" y="26" width="18" height="3" rx="1.5" class="a-dim"/>' +
      '<rect x="40" y="32" width="10" height="2" rx="1" class="a-dim"/></svg>',
    minimal:
      '<svg viewBox="0 0 64 40" aria-hidden="true"><rect x="1" y="1" width="62" height="38" rx="5" class="a-frame"/>' +
      '<rect x="12" y="9" width="40" height="17" rx="3" class="a-acc"/><rect x="22" y="30" width="20" height="3" rx="1.5" class="a-dim"/></svg>'
  };

  var cfg = null;
  var state = null;
  var listeners = [];
  var sheet = null;
  var gear = null;
  var appliedAccentVars = [];

  function load() {
    try { return JSON.parse(localStorage.getItem(cfg.key)); } catch (e) { return null; }
  }
  function store() {
    try { localStorage.setItem(cfg.key, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function fromPreset(name) {
    var p = cfg.presets[name];
    var show = {};
    cfg.options.forEach(function (o) { show[o.id] = p.show[o.id] !== false; });
    return { show: show, density: p.density || "comfortable", accent: state ? state.accent : cfg.accents[0].id };
  }

  function sameShape(a, b) {
    if (a.density !== b.density) return false;
    for (var i = 0; i < cfg.options.length; i++) {
      var id = cfg.options[i].id;
      if (!!a.show[id] !== !!b.show[id]) return false;
    }
    return true;
  }

  // "classic", "minimal" or "custom", derived from the current values.
  function presetName() {
    if (sameShape(state, fromPreset("classic"))) return "classic";
    if (sameShape(state, fromPreset("minimal"))) return "minimal";
    return "custom";
  }

  function accentById(id) {
    for (var i = 0; i < cfg.accents.length; i++) if (cfg.accents[i].id === id) return cfg.accents[i];
    return cfg.accents[0];
  }

  function apply() {
    var root = document.documentElement;
    cfg.options.forEach(function (o) {
      if (!o.behavior) root.classList.toggle("ui-hide-" + o.id, !state.show[o.id]);
    });
    root.setAttribute("data-density", state.density);
    root.setAttribute("data-ui", presetName());

    appliedAccentVars.forEach(function (name) { root.style.removeProperty(name); });
    var vars = accentById(state.accent).vars || {};
    appliedAccentVars = Object.keys(vars);
    appliedAccentVars.forEach(function (name) { root.style.setProperty(name, vars[name]); });

    store();
    renderSheet();
    setFlyout();
    listeners.forEach(function (fn) { try { fn(api.get); } catch (e) { /* listener failed */ } });
  }

  // ---------- AE panel menu (the ≡ button on the panel tab) ----------

  function setFlyout() {
    var cep = window.__adobe_cep__;
    if (!cep || !cep.invokeSync) return;
    var p = presetName();
    var item = function (id, label, checked) {
      return '<MenuItem Id="' + id + '" Label="' + label + '" Enabled="true" Checkable="true" Checked="' + checked + '"/>';
    };
    var xml = "<Menu>" + item("mi-classic", "Classic interface", p === "classic") +
      item("mi-minimal", "Minimal interface", p === "minimal") +
      '<MenuItem Label="---"/>' +
      '<MenuItem Id="mi-open" Label="Customize interface…" Enabled="true" Checked="false"/></Menu>';
    try { cep.invokeSync("setPanelFlyoutMenu", xml); } catch (e) { /* older CEP */ }
  }

  function listenFlyout() {
    var cep = window.__adobe_cep__;
    if (!cep || !cep.addEventListener) return;
    try {
      cep.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", function (event) {
        var data = event && event.data;
        if (typeof data === "string") {
          try { data = JSON.parse(data); } catch (e) {
            var m = /menuId["'>:\s]*([\w-]+)/.exec(data);
            data = { menuId: m ? m[1] : "" };
          }
        }
        var id = data && data.menuId;
        if (id === "mi-classic") api.usePreset("classic");
        else if (id === "mi-minimal") api.usePreset("minimal");
        else if (id === "mi-open") api.open();
      });
    } catch (e) { /* events unavailable */ }
  }

  // ---------- settings sheet ----------

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function buildSheet() {
    sheet = document.createElement("div");
    sheet.className = "mi-backdrop";
    sheet.innerHTML = '<div class="mi-sheet" role="dialog" aria-modal="true" aria-label="Interface"></div>';
    document.body.appendChild(sheet);

    sheet.addEventListener("mousedown", function (e) { if (e.target === sheet) api.close(); });
    sheet.addEventListener("click", function (e) {
      var t = e.target.closest("[data-mi]");
      if (!t) return;
      var kind = t.getAttribute("data-mi"), val = t.getAttribute("data-v");
      if (kind === "close") api.close();
      else if (kind === "preset") api.usePreset(val);
      else if (kind === "toggle") { state.show[val] = !state.show[val]; apply(); }
      else if (kind === "density") { state.density = val; apply(); }
      else if (kind === "accent") { state.accent = val; apply(); }
      else if (kind === "reset") { state = fromPreset("classic"); state.accent = cfg.accents[0].id; apply(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("open")) { e.stopPropagation(); e.preventDefault(); api.close(); }
    }, true);
  }

  function renderSheet() {
    if (!sheet) return;
    var p = presetName();
    var looks = cfg.options.filter(function (o) { return !o.behavior; });
    var behaviors = cfg.options.filter(function (o) { return o.behavior; });

    var toggle = function (o) {
      var on = !!state.show[o.id];
      return '<button class="mi-row' + (on ? " on" : "") + '" data-mi="toggle" data-v="' + o.id + '" role="switch" aria-checked="' + on + '">' +
        '<span class="mi-row-label">' + esc(o.label) + "</span>" +
        '<span class="mi-switch"><span></span></span></button>';
    };
    var card = function (name, title, sub) {
      return '<button class="mi-preset' + (p === name ? " on" : "") + '" data-mi="preset" data-v="' + name + '">' +
        ART[name] + "<b>" + title + "</b><small>" + sub + "</small></button>";
    };

    sheet.firstChild.innerHTML =
      '<header class="mi-head"><div><b>Interface</b><small>' + esc(cfg.title) + "</small></div>" +
      '<button class="mi-icon" data-mi="close" title="Close (Esc)">' + CLOSE + "</button></header>" +
      '<div class="mi-body">' +
      '<div class="mi-presets">' + card("classic", "Classic", "Everything in view") + card("minimal", "Minimal", "Only the essentials") + "</div>" +
      (p === "custom" ? '<div class="mi-custom">Custom setup · based on your choices below</div>' : "") +
      '<div class="mi-label">Show</div><div class="mi-list">' + looks.map(toggle).join("") + "</div>" +
      (behaviors.length ? '<div class="mi-label">Behavior</div><div class="mi-list">' + behaviors.map(toggle).join("") + "</div>" : "") +
      '<div class="mi-label">Density</div>' +
      '<div class="mi-seg">' +
      '<button data-mi="density" data-v="comfortable" class="' + (state.density === "comfortable" ? "on" : "") + '">Comfortable</button>' +
      '<button data-mi="density" data-v="compact" class="' + (state.density === "compact" ? "on" : "") + '">Compact</button></div>' +
      '<div class="mi-label">Accent</div><div class="mi-accents">' +
      cfg.accents.map(function (a) {
        return '<button class="mi-swatch' + (state.accent === a.id ? " on" : "") + '" data-mi="accent" data-v="' + a.id +
          '" title="' + esc(a.label) + '" style="background:' + a.swatch + '"></button>';
      }).join("") + "</div>" +
      "</div>" +
      '<footer class="mi-foot"><span>Saved for this panel</span><button class="mi-link" data-mi="reset">Reset</button></footer>';
  }

  // ---------- public API ----------

  var api = {
    init: function (config) {
      if (cfg) { api.mount(config.mount); return api; } // already running: just re-attach the gear
      cfg = config;
      var saved = load();
      state = fromPreset("classic");
      state.accent = cfg.accents[0].id;
      if (saved && saved.show) {
        cfg.options.forEach(function (o) { if (typeof saved.show[o.id] === "boolean") state.show[o.id] = saved.show[o.id]; });
        if (saved.density === "compact" || saved.density === "comfortable") state.density = saved.density;
        if (saved.accent) state.accent = accentById(saved.accent).id;
      }
      buildSheet();
      api.mount(cfg.mount);
      listenFlyout();
      apply();
      return api;
    },
    // (Re)attach the gear button, e.g. after a React render created the slot.
    mount: function (selector) {
      var host = selector && document.querySelector(selector);
      if (!host) return;
      if (!gear) {
        gear = document.createElement("button");
        gear.type = "button";
        gear.className = "mi-gear";
        gear.title = "Interface: Classic, Minimal or your own";
        gear.innerHTML = GEAR;
        gear.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); });
        gear.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); api.open(); });
      }
      if (gear.parentNode !== host) host.appendChild(gear);
    },
    get: function (id) {
      if (id === "density") return state.density;
      return !!(state && state.show[id]);
    },
    preset: function () { return presetName(); },
    usePreset: function (name) {
      var accent = state.accent;
      state = fromPreset(name);
      state.accent = accent;
      apply();
    },
    open: function () { renderSheet(); sheet.classList.add("open"); },
    close: function () { sheet.classList.remove("open"); },
    onChange: function (fn) { listeners.push(fn); }
  };

  window.MakiInterface = api;
})();
