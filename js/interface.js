/*
 * MakiInterface: per-panel interface settings shared by the Makimchi panels.
 * Two presets (Classic = everything, Minimal = only the essentials) plus free customization:
 * which parts are shown, density and accent colour. Saved per panel in localStorage.
 * The settings window is drawn as an After Effects dialog.
 *
 * Usage: MakiInterface.init({
 *   key, title,
 *   options:  [{ id, label, behavior? }],          // behavior options change logic, not visibility
 *   presets:  { classic: { show, density }, minimal: { show, density } },
 *   accents:  [{ id, label, swatch, vars }],       // first one is the default look
 *   mount:    "#selector"                          // where the gear button goes
 * });
 * Hidden parts get the class "ui-hide-<id>" on <html>; density lands in <html data-density>.
 */
(function () {
  "use strict";

  var GEAR =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.6 2h2.8l.5 2.3 1.6.7 2-1.3 2 2-1.3 2 .7 1.6 2.3.5v2.8l-2.3.5-.7 1.6 1.3 2-2 2-2-1.3-1.6.7-.5 2.3H8.6l-.5-2.3-1.6-.7-2 1.3-2-2 1.3-2-.7-1.6L.8 11.4V8.6l2.3-.5.7-1.6-1.3-2 2-2 2 1.3 1.6-.7z" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.6"/></svg>';
  var CLOSE = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1L1 9"/></svg>';
  var TICK = '<svg viewBox="0 0 10 8" aria-hidden="true"><path d="M1 4l3 3 5-6"/></svg>';

  var cfg = null;
  var state = null;
  var snapshot = null;
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
  function clone(s) { return JSON.parse(JSON.stringify(s)); }

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
      '<MenuItem Id="mi-open" Label="Interface settings…" Enabled="true" Checked="false"/></Menu>';
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

  // ---------- settings dialog ----------

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
      else if (kind === "cancel") api.cancel();
      else if (kind === "preset") api.usePreset(val);
      else if (kind === "toggle") { state.show[val] = !state.show[val]; apply(); }
      else if (kind === "density") { state.density = val; apply(); }
      else if (kind === "accent") { state.accent = val; apply(); }
      else if (kind === "reset") { state = fromPreset("classic"); state.accent = cfg.accents[0].id; apply(); }
    });
    document.addEventListener("keydown", function (e) {
      if (!sheet.classList.contains("open")) return;
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); api.cancel(); }
      else if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); api.close(); }
    }, true);
  }

  function renderSheet() {
    if (!sheet) return;
    var p = presetName();
    var looks = cfg.options.filter(function (o) { return !o.behavior; });
    var behaviors = cfg.options.filter(function (o) { return o.behavior; });

    var radio = function (name, title, sub) {
      var on = p === name;
      return '<button class="mi-opt' + (on ? " on" : "") + '" data-mi="preset" data-v="' + name + '" role="radio" aria-checked="' + on + '">' +
        '<span class="mi-radio"></span><span class="mi-name">' + title + '</span><span class="mi-sub">' + sub + "</span></button>";
    };
    var check = function (o) {
      var on = !!state.show[o.id];
      return '<button class="mi-opt' + (on ? " on" : "") + '" data-mi="toggle" data-v="' + o.id + '" role="checkbox" aria-checked="' + on + '">' +
        '<span class="ae-check">' + TICK + '</span><span class="mi-name">' + esc(o.label) + "</span></button>";
    };

    sheet.firstChild.innerHTML =
      '<header class="mi-title"><span>Interface<em>' + esc(cfg.title) + "</em></span>" +
      '<button class="mi-x" data-mi="cancel" aria-label="Close">' + CLOSE + "</button></header>" +
      '<div class="mi-body">' +
      '<div class="mi-label">Preset</div><div class="mi-group" role="radiogroup">' +
      radio("classic", "Classic", "everything in view") + radio("minimal", "Minimal", "only the essentials") +
      (p === "custom" ? '<div class="mi-opt on mi-static"><span class="mi-radio"></span><span class="mi-name">Custom</span><span class="mi-sub">your own mix</span></div>' : "") +
      "</div>" +
      '<div class="mi-label">Show</div><div class="mi-group">' + looks.map(check).join("") + "</div>" +
      (behaviors.length ? '<div class="mi-label">Behavior</div><div class="mi-group">' + behaviors.map(check).join("") + "</div>" : "") +
      '<div class="mi-line"><span class="mi-line-label">Density</span><div class="ae-seg mi-density">' +
      '<button data-mi="density" data-v="comfortable" class="' + (state.density === "comfortable" ? "on" : "") + '">Comfortable</button>' +
      '<button data-mi="density" data-v="compact" class="' + (state.density === "compact" ? "on" : "") + '">Compact</button></div></div>' +
      '<div class="mi-line"><span class="mi-line-label">Accent</span><div class="mi-accents">' +
      cfg.accents.map(function (a) {
        return '<button class="mi-swatch' + (state.accent === a.id ? " on" : "") + '" data-mi="accent" data-v="' + a.id +
          '" title="' + esc(a.label) + '" aria-label="' + esc(a.label) + '" style="background:' + a.swatch + '"></button>';
      }).join("") + "</div></div>" +
      "</div>" +
      '<footer class="mi-foot"><button class="mi-link" data-mi="reset">Reset</button><span class="mi-spacer"></span>' +
      '<button class="ae-btn" data-mi="cancel">Cancel</button><button class="ae-btn primary" data-mi="close">OK</button></footer>';
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
        gear.setAttribute("aria-label", "Interface settings");
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
    open: function () { snapshot = clone(state); renderSheet(); sheet.classList.add("open"); },
    close: function () { snapshot = null; sheet.classList.remove("open"); },
    // Cancel puts back what was there when the dialog opened.
    cancel: function () {
      if (snapshot) { state = snapshot; snapshot = null; apply(); }
      sheet.classList.remove("open");
    },
    onChange: function (fn) { listeners.push(fn); }
  };

  window.MakiInterface = api;
})();
