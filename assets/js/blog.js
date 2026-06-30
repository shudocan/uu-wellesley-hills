/* ==========================================================================
   blog.js — Blog list + single-post rendering.
   Posts: data/posts/index.json (metadata) + data/posts/<slug>.md (content).
   Markdown is rendered by a tiny built-in parser (no network dependency).
   ========================================================================== */
(function () {
  "use strict";

  function fmtDate(iso) {
    try {
      var d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch (_) { return iso; }
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Minimal, safe-enough Markdown -> HTML for our own authored posts.
  function md(src) {
    var lines = src.replace(/\r\n/g, "\n").split("\n");
    var html = [], i = 0;
    function inline(t) {
      t = esc(t);
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
      t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
      return t;
    }
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { var lvl = h[1].length; html.push("<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">"); i++; continue; }
      if (/^\s*[-*]\s+/.test(line)) {
        html.push("<ul>");
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { html.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>"); i++; }
        html.push("</ul>"); continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        html.push("<ol>");
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { html.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>"); i++; }
        html.push("</ol>"); continue;
      }
      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,4})\s/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      html.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return html.join("\n");
  }

  function getJSON(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function getText(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { return r.ok ? r.text() : null; }).catch(function () { return null; }); }

  function renderList() {
    var host = document.getElementById("blog-list");
    if (!host) return;
    getJSON("data/posts/index.json").then(function (data) {
      var posts = (data && data.posts) || [];
      host.innerHTML = "";
      posts.forEach(function (p) {
        var a = document.createElement("article");
        a.className = "card";
        a.setAttribute("data-reveal", "");
        a.innerHTML =
          (p.image ? '<div class="card__media"><img src="' + esc(p.image) + '" alt="" onerror="this.closest(\'.card__media\').style.display=\'none\'"></div>' : "") +
          '<p class="card__meta">' + esc(fmtDate(p.date)) + (p.author ? " · " + esc(p.author) : "") + "</p>" +
          "<h3>" + esc(p.title) + "</h3>" +
          '<p class="muted">' + esc(p.summary || "") + "</p>" +
          '<a href="blog-post.html?slug=' + encodeURIComponent(p.slug) + '">Read more →</a>';
        host.appendChild(a);
      });
    });
  }

  function renderPost() {
    var host = document.getElementById("blog-post");
    if (!host) return;
    var slug = new URLSearchParams(location.search).get("slug") || "";
    if (!/^[a-z0-9-]+$/.test(slug)) { host.innerHTML = "<p>Post not found.</p>"; return; }
    Promise.all([getJSON("data/posts/index.json"), getText("data/posts/" + slug + ".md")]).then(function (res) {
      var idx = res[0], body = res[1];
      var meta = (idx && idx.posts || []).filter(function (p) { return p.slug === slug; })[0];
      if (!body) { host.innerHTML = '<p>Sorry, we couldn\'t find that post. <a href="blog.html">Back to the blog</a>.</p>'; return; }
      var head = meta ? '<p class="card__meta">' + esc(fmtDate(meta.date)) + (meta.author ? " · " + esc(meta.author) : "") + "</p>" : "";
      if (meta) document.title = meta.title + " — UU Wellesley Hills";
      host.innerHTML = head + md(body) + '<p style="margin-top:2rem"><a class="btn btn--ghost" href="blog.html">← Back to all posts</a></p>';
    });
  }

  document.addEventListener("DOMContentLoaded", function () { renderList(); renderPost(); });
  window.UUBlog = { md: md };
})();
