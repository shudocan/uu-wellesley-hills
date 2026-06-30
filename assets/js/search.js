/* ==========================================================================
   search.js — Client-side site search. Builds an index at runtime from the
   same data/*.json the pages render from (no build step), plus blog posts.
   ========================================================================== */
(function () {
  "use strict";

  var PAGES = [
    { url: "index.html",        title: "Home",               file: "home" },
    { url: "worship.html",      title: "Worship",            file: "worship" },
    { url: "music.html",        title: "Music",              file: "music" },
    { url: "about.html",        title: "About Us",           file: "about" },
    { url: "engage.html",       title: "Engage & Connect",   file: "engage" },
    { url: "visitor-faqs.html", title: "Visitor FAQs",       file: "visitor-faqs" },
    { url: "contact.html",      title: "Contact",            file: "contact" },
    { url: "events.html",       title: "Events & Calendar",  file: "events" },
    { url: "rentals.html",      title: "Rent Our Space",     file: "rentals" },
    { url: "members.html",      title: "Members",            file: "members" }
  ];

  function fetchJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  function collect(obj, out) {
    if (obj == null) return;
    if (typeof obj === "string") { out.push(obj); return; }
    if (typeof obj === "number" || typeof obj === "boolean") return;
    if (Array.isArray(obj)) { obj.forEach(function (v) { collect(v, out); }); return; }
    Object.keys(obj).forEach(function (k) {
      if (/href|image|embed|link$/i.test(k)) return; // skip URLs/paths
      collect(obj[k], out);
    });
  }

  var records = [];
  function buildIndex() {
    var jobs = PAGES.map(function (p) {
      return fetchJSON("data/" + p.file + ".json").then(function (data) {
        var parts = []; collect(data, parts);
        records.push({ url: p.url, title: p.title, text: parts.join("  ") });
      });
    });
    jobs.push(fetchJSON("data/posts/index.json").then(function (idx) {
      (idx && idx.posts || []).forEach(function (post) {
        records.push({ url: "blog-post.html?slug=" + encodeURIComponent(post.slug), title: post.title + " (Blog)", text: [post.title, post.summary, post.author].join("  ") });
      });
    }));
    return Promise.all(jobs);
  }

  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function snippet(text, terms) {
    var low = text.toLowerCase(), pos = -1;
    for (var i = 0; i < terms.length; i++) { var p = low.indexOf(terms[i]); if (p > -1) { pos = p; break; } }
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - 50), end = Math.min(text.length, pos + 120);
    var snip = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    snip = esc(snip);
    terms.forEach(function (t) { if (t) snip = snip.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); });
    return snip;
  }

  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return records.map(function (r) {
      var low = (r.title + "  " + r.text).toLowerCase(), score = 0;
      terms.forEach(function (t) {
        if (r.title.toLowerCase().indexOf(t) > -1) score += 5;
        var idx = 0; while ((idx = low.indexOf(t, idx)) > -1) { score++; idx += t.length; }
      });
      return { r: r, score: score };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (x) { return x.r; });
  }

  function render(q) {
    var host = document.getElementById("search-results");
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!q.trim()) { host.innerHTML = '<p class="muted">Type above to search the site.</p>'; return; }
    var hits = search(q);
    if (!hits.length) { host.innerHTML = '<p class="muted">No results for “' + esc(q) + '”. Try different words, or <a href="contact.html">contact us</a>.</p>'; return; }
    host.innerHTML = "";
    hits.forEach(function (r) {
      host.appendChild((function () {
        var card = document.createElement("article"); card.className = "card"; card.style.marginBottom = "1rem";
        card.innerHTML = '<h3 style="margin:0 0 .3rem"><a href="' + r.url + '">' + esc(r.title) + "</a></h3>" +
          '<p class="muted" style="margin:0">' + snippet(r.text, terms) + "</p>";
        return card;
      })());
    });
    host.insertAdjacentHTML("afterbegin", '<p class="muted">' + hits.length + " result" + (hits.length === 1 ? "" : "s") + ' for “' + esc(q) + '”.</p>');
  }

  document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("search-input");
    if (!input) return;
    var ready = buildIndex();
    var initial = new URLSearchParams(location.search).get("q") || "";
    if (initial) input.value = initial;
    function run() { ready.then(function () { render(input.value); }); }
    input.addEventListener("input", run);
    document.getElementById("search-form").addEventListener("submit", function (e) { e.preventDefault(); run(); });
    run();
  });
})();
