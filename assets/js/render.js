/* ==========================================================================
   render.js — Tiny data-binding layer. Turns data/*.json into page content
   so the same HTML templates stay layout-only and the admin edits the data.

   Bindings (attributes on any element):
     data-bind="path"        -> textContent
     data-bind-html="path"   -> innerHTML (rich text / markdown-rendered)
     data-bind-src="path"    -> img/src (+ data-bind-alt="path" for alt)
     data-bind-href="path"   -> a/href
     data-bind-attr="name:path; name2:path2"  -> arbitrary attributes
     data-show="path"        -> remove element if value is falsy/empty
     data-list="path"        -> repeat inner <template> for each array item
                                (item fields bind relative to the item)

   Namespaces: prefix a path with "site:" to read from data/site.json.
   Default (no prefix) reads the current page's data file (body[data-page]).
   ========================================================================== */
(function () {
  "use strict";

  function get(obj, path) {
    if (!path) return obj;
    return path.split(".").reduce(function (o, k) {
      if (o == null) return undefined;
      // support arr[0] style
      var m = k.match(/^(.+)\[(\d+)\]$/);
      if (m) { var a = o[m[1]]; return a ? a[Number(m[2])] : undefined; }
      return o[k];
    }, obj);
  }

  function resolve(path, ctx) {
    var ns = "";
    var p = path;
    var i = path.indexOf(":");
    if (i > -1) { ns = path.slice(0, i); p = path.slice(i + 1); }
    return get(ctx[ns], p);
  }

  function fetchJSON(url) {
    return fetch(url, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // Admin preview: when the page is opened with ?preview=1, use any draft
  // data the admin stashed in localStorage instead of the committed file.
  function isPreview() { return /[?&]preview=1\b/.test(location.search); }
  function previewOverride(name) {
    if (!isPreview()) return null;
    try {
      var raw = localStorage.getItem("uuwh-preview:" + name);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function bindElement(el, ctx) {
    var v;
    if (el.hasAttribute("data-bind")) {
      v = resolve(el.getAttribute("data-bind"), ctx);
      if (v != null) el.textContent = v;
    }
    if (el.hasAttribute("data-bind-html")) {
      v = resolve(el.getAttribute("data-bind-html"), ctx);
      if (v != null) el.innerHTML = v;
    }
    if (el.hasAttribute("data-bind-src")) {
      v = resolve(el.getAttribute("data-bind-src"), ctx);
      if (v) el.setAttribute("src", v);
    }
    if (el.hasAttribute("data-bind-alt")) {
      v = resolve(el.getAttribute("data-bind-alt"), ctx);
      if (v != null) el.setAttribute("alt", v);
    }
    if (el.hasAttribute("data-bind-href")) {
      v = resolve(el.getAttribute("data-bind-href"), ctx);
      if (v) el.setAttribute("href", v);
    }
    if (el.hasAttribute("data-bind-attr")) {
      el.getAttribute("data-bind-attr").split(";").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length >= 2) {
          var name = parts[0].trim();
          var val = resolve(parts.slice(1).join(":").trim(), ctx);
          if (val != null && val !== "") el.setAttribute(name, val);
        }
      });
    }
    if (el.hasAttribute("data-show")) {
      v = resolve(el.getAttribute("data-show"), ctx);
      var empty = v == null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
      if (empty) { el.remove(); return false; }
    }
    return true;
  }

  function renderList(host, ctx) {
    var path = host.getAttribute("data-list");
    var items = resolve(path, ctx);
    var tpl = host.querySelector("template");
    if (!tpl) return;
    host.querySelectorAll(":scope > :not(template)").forEach(function (n) { n.remove(); });
    if (!Array.isArray(items)) return;
    items.forEach(function (item) {
      var frag = tpl.content.cloneNode(true);
      var itemCtx = { "": item, site: ctx.site, page: ctx.page };
      // bind everything inside the clone against the item
      walk(frag, itemCtx);
      host.appendChild(frag);
    });
  }

  function walk(root, ctx) {
    // lists first (so nested binds use item context)
    var lists = (root.querySelectorAll ? root.querySelectorAll("[data-list]") : []);
    Array.prototype.forEach.call(lists, function (host) {
      // only handle lists that are direct (not inside another unprocessed list clone)
      renderList(host, ctx);
    });
    var sel = "[data-bind],[data-bind-html],[data-bind-src],[data-bind-alt],[data-bind-href],[data-bind-attr],[data-show]";
    var nodes = root.querySelectorAll ? root.querySelectorAll(sel) : [];
    Array.prototype.forEach.call(nodes, function (el) {
      // Skip template internals and nodes already bound inside a rendered list.
      if (el.closest("template") || el.closest("[data-list]")) return;
      bindElement(el, ctx);
    });
  }

  function run() {
    var page = document.body.getAttribute("data-page");
    // Extra shared datasets a page wants, e.g. <body data-datasets="events,announcements">
    var extras = (document.body.getAttribute("data-datasets") || "")
      .split(",").map(function (s) { return s.trim(); }).filter(Boolean);

    var names = ["site"];
    var jobs = [fetchJSON("data/site.json")];
    if (page) { names.push("page"); jobs.push(fetchJSON("data/" + page + ".json")); }
    extras.forEach(function (n) { names.push(n); jobs.push(fetchJSON("data/" + n + ".json")); });

    return Promise.all(jobs).then(function (res) {
      var ctx = {};
      names.forEach(function (n, i) {
        // page data file is named after the page; others share their name
        var fileName = (n === "page" && page) ? page : n;
        ctx[n] = previewOverride(fileName) || res[i] || {};
      });
      // default (empty) namespace for page templates is the page data
      ctx[""] = ctx.page || {};
      walk(document, ctx);
      document.dispatchEvent(new CustomEvent("uu:rendered", { detail: ctx }));
    });
  }

  window.UURender = { run: run, _get: get };
})();
