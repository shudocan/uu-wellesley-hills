/* ==========================================================================
   site.js — Shared behavior: theme/skin switching, partial injection,
   navigation, and scroll-reveal. No framework, no build step.
   ========================================================================== */
(function () {
  "use strict";

  var THEME_KEY = "uuwh-theme";
  var SKIN_KEY = "uuwh-skin";
  var THEMES = ["light", "dark"];
  var SKINS = ["classic", "modern", "seasonal"];

  /* ---- Theme + skin -------------------------------------------------------
     The inline <head> snippet already applied saved values before paint.
     Here we expose setters and build the picker UI. */
  function getTheme() {
    var t = localStorage.getItem(THEME_KEY);
    if (THEMES.indexOf(t) === -1) {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return t;
  }
  function getSkin() {
    var s = localStorage.getItem(SKIN_KEY);
    return SKINS.indexOf(s) === -1 ? "classic" : s;
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(THEME_KEY, t);
    syncPicker();
  }
  function applySkin(s) {
    document.documentElement.setAttribute("data-skin", s);
    localStorage.setItem(SKIN_KEY, s);
    syncPicker();
  }
  function toggleTheme() { applyTheme(getTheme() === "dark" ? "light" : "dark"); }

  // Expose for inline onclicks / admin preview.
  window.UUTheme = { applyTheme: applyTheme, applySkin: applySkin, toggleTheme: toggleTheme, getTheme: getTheme, getSkin: getSkin };

  function syncPicker() {
    var pop = document.getElementById("theme-pop");
    if (!pop) return;
    pop.querySelectorAll("[data-set-theme]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-theme") === getTheme()));
    });
    pop.querySelectorAll("[data-set-skin]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-skin") === getSkin()));
    });
  }

  /* ---- Partial injection (header / footer) -------------------------------- */
  function injectPartials() {
    var slots = document.querySelectorAll("[data-include]");
    return Promise.all(Array.prototype.map.call(slots, function (slot) {
      var url = slot.getAttribute("data-include");
      return fetch(url)
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (html) { slot.outerHTML = html; })
        .catch(function () { /* leave slot as-is on failure */ });
    }));
  }

  /* ---- Navigation wiring -------------------------------------------------- */
  function wireNav() {
    var nav = document.querySelector(".nav");
    if (!nav) return;

    var toggle = nav.querySelector(".nav__toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.getAttribute("data-open") === "true";
        nav.setAttribute("data-open", String(!open));
        toggle.setAttribute("aria-expanded", String(!open));
      });
    }

    // Mark current page link.
    var here = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
    nav.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#" || /^https?:/.test(href)) return;
      var path = href.replace(/index\.html$/, "").replace(/^\.\//, "/").replace(/\/$/, "") || "/";
      if (path !== "/" && (here === path || here.endsWith(path))) {
        a.setAttribute("aria-current", "page");
      } else if (path === "/" && here === "/") {
        a.setAttribute("aria-current", "page");
      }
    });

    // Mobile: tapping a parent with submenu expands it instead of navigating.
    nav.querySelectorAll(".nav__link[aria-expanded]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        if (window.matchMedia("(max-width: 880px)").matches) {
          e.preventDefault();
          var exp = link.getAttribute("aria-expanded") === "true";
          link.setAttribute("aria-expanded", String(!exp));
          var sub = link.nextElementSibling;
          if (sub) sub.style.display = exp ? "none" : "block";
        }
      });
    });
  }

  /* ---- Theme picker popover ----------------------------------------------- */
  function wireThemePicker() {
    var btn = document.getElementById("theme-btn");
    var pop = document.getElementById("theme-pop");
    if (!btn || !pop) return;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
    });
    document.addEventListener("click", function (e) {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) pop.hidden = true;
    });
    pop.addEventListener("click", function (e) {
      var t = e.target.closest("[data-set-theme]");
      var s = e.target.closest("[data-set-skin]");
      if (t) applyTheme(t.getAttribute("data-set-theme"));
      if (s) applySkin(s.getAttribute("data-set-skin"));
    });

    var quick = document.getElementById("theme-quick");
    if (quick) quick.addEventListener("click", toggleTheme);

    syncPicker();
  }

  /* ---- Scroll reveal ------------------------------------------------------ */
  function wireReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    // Stagger index within stagger groups.
    document.querySelectorAll("[data-stagger]").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty("--i", i);
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- Year + dismissible banner ------------------------------------------ */
  function wireMisc() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---- Boot --------------------------------------------------------------- */
  function boot() {
    injectPartials().then(function () {
      wireNav();
      wireThemePicker();
      wireMisc();
      // Render page content from data/*.json, then reveal (content may add nodes).
      var done = (window.UURender && window.UURender.run) ? window.UURender.run() : Promise.resolve();
      Promise.resolve(done).then(wireReveal);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
