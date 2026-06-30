/* ==========================================================================
   admin.js — Friendly, git-based website editor for UU Wellesley Hills.
   Static page; talks to the GitHub REST API. Edits data/*.json (+ blog .md),
   commits straight to the live branch, shows history, and offers one-click Undo.
   No "commit / branch / PR" vocabulary is shown to the user.
   ========================================================================== */
(function () {
  "use strict";

  var API = "https://api.github.com";
  var CFG_KEY = "uuwh-admin-config";

  /* ---- What the secretary may edit (layout/code stay out of this list) ---- */
  var REGISTRY = [
    { group: "pages", key: "home",         label: "Home page",     icon: "🏠", color: "#e0533d", file: "data/home.json",         preview: "index.html" },
    { group: "pages", key: "worship",      label: "Worship",       icon: "⛪", color: "#e8893b", file: "data/worship.json",      preview: "worship.html" },
    { group: "pages", key: "music",        label: "Music",         icon: "🎵", color: "#d9a328", file: "data/music.json",        preview: "music.html" },
    { group: "pages", key: "about",        label: "About Us",      icon: "👋", color: "#5aa544", file: "data/about.json",        preview: "about.html" },
    { group: "pages", key: "engage",       label: "Engage & Connect", icon: "🤝", color: "#2c9e8f", file: "data/engage.json",  preview: "engage.html" },
    { group: "pages", key: "visitor-faqs", label: "Visitor FAQs",  icon: "❓", color: "#3a8fd0", file: "data/visitor-faqs.json", preview: "visitor-faqs.html" },
    { group: "pages", key: "contact",      label: "Contact",       icon: "✉️", color: "#5566cf", file: "data/contact.json",      preview: "contact.html" },
    { group: "pages", key: "rentals",      label: "Rentals",       icon: "🔑", color: "#8a5cd0", file: "data/rentals.json",      preview: "rentals.html" },
    { group: "pages", key: "members",      label: "Members",       icon: "👥", color: "#c44d97", file: "data/members.json",      preview: "members.html" },
    { group: "lists", key: "events",        label: "Events",        icon: "📅", color: "#e0533d", file: "data/events.json",       preview: "events.html" },
    { group: "lists", key: "announcements", label: "Announcements", icon: "📣", color: "#e8893b", file: "data/announcements.json", preview: "index.html" },
    { group: "lists", key: "__blog",        label: "Blog posts",    icon: "✍️", color: "#2c9e8f", blog: true,                     preview: "blog.html" },
    { group: "other", key: "site",          label: "Site info (address, hours, links)", icon: "⚙️", color: "#5566cf", file: "data/site.json", preview: "index.html" }
  ];

  var FRIENDLY = {
    text: "Body text", body: "Body text", lead: "Intro line", heading: "Heading", title: "Title",
    summary: "Summary", details: "Details", intro: "Intro", a: "Answer", q: "Question",
    datetime: "Date & time", date: "Date", location: "Location", image: "Image",
    linkText: "Link label", linkHref: "Link address (URL)", href: "Link address (URL)",
    buttonText: "Button label", buttonHref: "Button address (URL)", show: "Show this?",
    watchText: "Button label", watchHref: "Button address (URL)", capacity: "Capacity",
    eyebrow: "Small label above heading", tagline: "Tagline", name: "Name", role: "Role", email: "Email"
  };
  var TEXTAREA_KEYS = ["body","text","details","summary","intro","a","lead","note","footerNote","directions","policiesText","description"];

  /* ---- tiny DOM helpers --------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "class") n.className = props[k];
      else if (k === "html") n.innerHTML = props[k];
      else if (k === "text") n.textContent = props[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), props[k]);
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function humanize(k) {
    if (FRIENDLY[k]) return FRIENDLY[k];
    return k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function toast(msg, kind) {
    var t = $("toast"); t.textContent = msg; t.setAttribute("data-kind", kind || ""); t.setAttribute("data-show", "true");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.setAttribute("data-show", "false"); }, 3200);
  }
  function status(msg) { $("status").textContent = msg || ""; }

  /* ---- base64 (UTF-8 safe) ------------------------------------------------ */
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(b64) { return decodeURIComponent(escape(atob((b64 || "").replace(/\s/g, "")))); }

  /* ---- GitHub client ------------------------------------------------------ */
  var cfg = null;
  function loadCfg() { try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || "null"); } catch (_) { cfg = null; } return cfg; }
  function saveCfg(c) { cfg = c; localStorage.setItem(CFG_KEY, JSON.stringify(c)); }
  function clearCfg() { cfg = null; localStorage.removeItem(CFG_KEY); }

  function gh(path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: {
        "Authorization": "Bearer " + cfg.token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = t ? JSON.parse(t) : {};
        if (!r.ok) { var e = new Error((data && data.message) || ("HTTP " + r.status)); e.status = r.status; throw e; }
        return data;
      });
    });
  }
  function repoPath(p) { return "/repos/" + cfg.owner + "/" + cfg.repo + p; }

  function getFile(path) {
    return gh(repoPath("/contents/" + path + "?ref=" + encodeURIComponent(cfg.branch)))
      .then(function (d) { return { sha: d.sha, text: b64dec(d.content) }; });
  }
  function getFileAt(path, ref) {
    return gh(repoPath("/contents/" + path + "?ref=" + encodeURIComponent(ref)))
      .then(function (d) { return { sha: d.sha, text: b64dec(d.content) }; })
      .catch(function (e) { if (e.status === 404) return null; throw e; });
  }
  function putFile(path, text, message, sha) {
    var body = { message: message, content: b64enc(text), branch: cfg.branch };
    if (sha) body.sha = sha;
    return gh(repoPath("/contents/" + path), { method: "PUT", body: body });
  }
  function putBinary(path, base64, message) {
    return gh(repoPath("/contents/" + path), { method: "PUT", body: { message: message, content: base64, branch: cfg.branch } });
  }
  function deleteFile(path, sha, message) {
    return gh(repoPath("/contents/" + path), { method: "DELETE", body: { message: message, sha: sha, branch: cfg.branch } });
  }
  function listCommits(n) { return gh(repoPath("/commits?sha=" + encodeURIComponent(cfg.branch) + "&per_page=" + (n || 10))); }
  function getCommit(sha) { return gh(repoPath("/commits/" + sha)); }

  /* ---- model path helpers ------------------------------------------------- */
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function getPath(obj, path) { return path.reduce(function (o, k) { return o == null ? o : o[k]; }, obj); }
  function setPath(obj, path, val) {
    var o = obj; for (var i = 0; i < path.length - 1; i++) o = o[path[i]];
    o[path[path.length - 1]] = val;
  }

  /* ---- auto-form builder -------------------------------------------------- */
  var state = { entry: null, current: null, sha: null, sub: "" };

  function isImageKey(k) { return k === "image" || /image$/i.test(k); }

  function buildField(key, value, path) {
    var label = humanize(key);

    if (typeof value === "boolean") {
      var cb = el("input", { type: "checkbox", onchange: function () { setPath(state.current, path, cb.checked); } });
      cb.checked = value;
      return el("div", { class: "field" }, [el("label", {}, [cb, " " + label])]);
    }

    if (typeof value === "string" && isImageKey(key)) {
      return buildImageField(label, value, path);
    }

    if (typeof value === "string" || typeof value === "number") {
      var useArea = TEXTAREA_KEYS.indexOf(key) > -1 || String(value).length > 90;
      var input = useArea
        ? el("textarea", { rows: "4", oninput: function () { setPath(state.current, path, input.value); } })
        : el("input", { type: /href$|url/i.test(key) ? "url" : "text", oninput: function () { setPath(state.current, path, input.value); } });
      input.value = value;
      return el("div", { class: "field" }, [el("label", { text: label }), input]);
    }

    if (Array.isArray(value)) return buildArray(key, value, path);

    if (value && typeof value === "object") {
      var fs = el("fieldset", { class: "group" }, [el("legend", { text: label })]);
      Object.keys(value).forEach(function (k) { fs.appendChild(buildField(k, value[k], path.concat(k))); });
      return fs;
    }
    return el("div");
  }

  function blankLike(sample) {
    if (typeof sample === "string") return "";
    if (typeof sample === "number") return 0;
    if (typeof sample === "boolean") return false;
    if (Array.isArray(sample)) return [];
    if (sample && typeof sample === "object") {
      var o = {}; Object.keys(sample).forEach(function (k) { o[k] = blankLike(sample[k]); }); return o;
    }
    return "";
  }

  function buildArray(key, arr, path) {
    var wrap = el("fieldset", { class: "group" }, [el("legend", { text: humanize(key) + " (" + arr.length + ")" })]);
    arr.forEach(function (item, i) {
      var box = el("div", { class: "repeat-item" });
      var bar = el("div", { class: "repeat-item__bar" }, [
        el("button", { type: "button", class: "btn btn--ghost btn--small", title: "Move up", onclick: function () { moveItem(path, i, -1); } }, ["↑"]),
        el("button", { type: "button", class: "btn btn--ghost btn--small", title: "Move down", onclick: function () { moveItem(path, i, 1); } }, ["↓"]),
        el("button", { type: "button", class: "btn btn--danger btn--small", onclick: function () { removeItem(path, i); } }, ["Remove"])
      ]);
      box.appendChild(bar);
      if (item && typeof item === "object" && !Array.isArray(item)) {
        Object.keys(item).forEach(function (k) { box.appendChild(buildField(k, item[k], path.concat(i, k))); });
      } else {
        box.appendChild(buildField("item", item, path.concat(i)));
      }
      wrap.appendChild(box);
    });
    wrap.appendChild(el("button", {
      type: "button", class: "btn btn--ghost repeat-add",
      onclick: function () { addItem(path); }
    }, ["+ Add"]));
    return wrap;
  }

  function addItem(path) {
    var arr = getPath(state.current, path);
    arr.push(blankLike(arr[0] !== undefined ? arr[0] : ""));
    renderForm();
  }
  function removeItem(path, i) { getPath(state.current, path).splice(i, 1); renderForm(); }
  function moveItem(path, i, dir) {
    var arr = getPath(state.current, path), j = i + dir;
    if (j < 0 || j >= arr.length) return;
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; renderForm();
  }

  /* ---- image field + upload ----------------------------------------------- */
  function buildImageField(label, value, path) {
    var thumb = el("img", { src: value ? "../" + value : "", alt: "" });
    var pathInput = el("input", { type: "text", value: value, oninput: function () { setPath(state.current, path, pathInput.value); thumb.src = "../" + pathInput.value; } });
    var file = el("input", { type: "file", accept: "image/*", class: "hide" });
    var btn = el("button", { type: "button", class: "btn btn--ghost btn--small", onclick: function () { file.click(); } }, ["Upload image"]);
    file.addEventListener("change", function () {
      if (!file.files[0]) return;
      uploadImage(file.files[0]).then(function (p) {
        setPath(state.current, path, p); pathInput.value = p; thumb.src = "../" + p;
        toast("Image uploaded. Click Publish to make it live.", "ok");
      }).catch(function (e) { toast("Upload failed: " + e.message, "error"); });
    });
    return el("div", { class: "field" }, [
      el("label", { text: label }),
      el("div", { class: "imgfield" }, [thumb, el("div", { class: "imgctrls" }, [pathInput, el("div", {}, [btn]), el("span", { class: "hint", text: "Or paste an image path above." })])])
    ]);
  }

  function uploadImage(fileObj) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var max = 1600, w = img.width, h = img.height;
        if (w > max || h > max) { var s = Math.min(max / w, max / h); w = Math.round(w * s); h = Math.round(h * s); }
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        var dataUrl = c.toDataURL("image/jpeg", 0.85);
        var base64 = dataUrl.split(",")[1];
        var safe = fileObj.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40) || "image";
        var path = "assets/img/" + safe + "-" + Date.now() + ".jpg";
        status("Uploading image…");
        putBinary(path, base64, "Add image " + path + " [admin]").then(function () { status(""); resolve(path); }).catch(reject);
      };
      img.onerror = function () { reject(new Error("could not read image")); };
      img.src = URL.createObjectURL(fileObj);
    });
  }

  /* ---- editor view -------------------------------------------------------- */
  function renderForm() {
    var form = $("editor-form"); form.innerHTML = "";
    if (state.entry && state.entry.blog) return; // blog handled separately
    Object.keys(state.current).forEach(function (k) {
      // hide machine-only "meta" block from the secretary
      if (k === "meta") return;
      form.appendChild(buildField(k, state.current[k], [k]));
    });
  }

  function openEntry(entry) {
    state.entry = entry;
    setActiveNav(entry.key);
    var t = $("editor-title"); t.innerHTML = "";
    t.appendChild(el("span", { class: "title-ico", text: entry.icon || "" }));
    t.appendChild(document.createTextNode(" " + entry.label));
    document.documentElement.style.setProperty("--accent-now", entry.color || "#2c9e8f");
    $("history-panel").classList.toggle("hide", false);
    if (entry.blog) return openBlog();
    $("editor-sub").textContent = "Loading…";
    getFile(entry.file).then(function (f) {
      state.current = JSON.parse(f.text); state.sha = f.sha; state.sub = "";
      $("editor-sub").textContent = "Make your changes, Preview, then Publish.";
      renderForm();
    }).catch(function (e) { $("editor-sub").textContent = "Could not load: " + e.message; });
  }

  function doPreview() {
    if (!state.entry) return;
    if (state.entry.blog) { window.open("../" + state.entry.preview, "_blank"); return; }
    try { localStorage.setItem("uuwh-preview:" + state.entry.key, JSON.stringify(state.current)); } catch (_) {}
    window.open("../" + state.entry.preview + "?preview=1", "_blank");
    toast("Opened a preview in a new tab. It shows your unsaved changes.", "ok");
  }

  function doPublish() {
    if (!state.entry || state.entry.blog) return;
    var btn = $("btn-publish"); btn.disabled = true; status("Publishing…");
    var text = JSON.stringify(state.current, null, 2) + "\n";
    putFile(state.entry.file, text, "Update " + state.entry.label + " [admin]", state.sha)
      .then(function (res) {
        state.sha = res.content.sha;
        try { localStorage.removeItem("uuwh-preview:" + state.entry.key); } catch (_) {}
        toast("✅ Published — your change will be live in about a minute.", "ok");
        status(""); btn.disabled = false; loadHistory();
      })
      .catch(function (e) {
        btn.disabled = false; status("");
        if (e.status === 409) toast("Someone else just saved this page. Reopen it and redo your change.", "error");
        else toast("Publish failed: " + e.message, "error");
      });
  }

  /* ---- blog editor (index.json + markdown files) -------------------------- */
  var blog = { index: null, sha: null };
  function openBlog() {
    $("editor-sub").textContent = "Loading posts…";
    getFile("data/posts/index.json").then(function (f) {
      blog.index = JSON.parse(f.text); blog.sha = f.sha;
      renderBlogList();
    }).catch(function (e) { $("editor-sub").textContent = "Could not load posts: " + e.message; });
  }
  function renderBlogList() {
    $("editor-sub").textContent = "Choose a post to edit, or add a new one.";
    var form = $("editor-form"); form.innerHTML = "";
    form.appendChild(el("button", { type: "button", class: "btn btn--primary", onclick: function () { editPost(null); } }, ["+ New post"]));
    (blog.index.posts || []).forEach(function (p, i) {
      form.appendChild(el("div", { class: "repeat-item" }, [
        el("div", { class: "field" }, [el("strong", { text: p.title }), el("div", { class: "hint", text: p.date + " · " + p.slug })]),
        el("div", { class: "repeat-item__bar" }, [
          el("button", { type: "button", class: "btn btn--ghost btn--small", onclick: function () { editPost(i); } }, ["Edit"]),
          el("button", { type: "button", class: "btn btn--danger btn--small", onclick: function () { deletePost(i); } }, ["Delete"])
        ])
      ]));
    });
  }
  function editPost(i) {
    var isNew = i == null;
    var meta = isNew ? { slug: "", title: "", date: new Date().toISOString().slice(0, 10), author: "UU Wellesley Hills", summary: "", image: "" } : deepClone(blog.index.posts[i]);
    var form = $("editor-form"); form.innerHTML = "";
    var fields = {};
    ["title", "date", "author", "summary", "slug"].forEach(function (k) {
      var inp = el("input", { type: k === "date" ? "date" : "text", value: meta[k] || "" });
      fields[k] = inp;
      form.appendChild(el("div", { class: "field" }, [el("label", { text: humanize(k) + (k === "slug" ? " (web address id, lowercase-dashes)" : "") }), inp]));
    });
    var body = el("textarea", { rows: "16" });
    form.appendChild(el("div", { class: "field" }, [el("label", { text: "Post text (Markdown: # heading, **bold**, - list)" }), body]));
    var actions = el("div", {}, [
      el("button", { type: "button", class: "btn btn--primary", onclick: save }, ["Publish post"]),
      " ",
      el("button", { type: "button", class: "btn btn--ghost", onclick: renderBlogList }, ["Cancel"])
    ]);
    form.appendChild(actions);

    if (!isNew) getFileAt("data/posts/" + meta.slug + ".md", cfg.branch).then(function (f) { if (f) body.value = f.text; });

    function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
    function save() {
      var m = {};
      ["title", "date", "author", "summary"].forEach(function (k) { m[k] = fields[k].value.trim(); });
      m.slug = (fields.slug.value.trim() || slugify(fields.title.value)) ;
      m.image = meta.image || "";
      if (!m.title || !m.slug) { toast("Title and a web id are required.", "error"); return; }
      if (!/^[a-z0-9-]+$/.test(m.slug)) { toast("Web id must be lowercase letters, numbers, and dashes.", "error"); return; }
      status("Publishing post…");
      // 1) write markdown file
      getFileAt("data/posts/" + m.slug + ".md", cfg.branch).then(function (existing) {
        return putFile("data/posts/" + m.slug + ".md", body.value.replace(/\s*$/, "") + "\n", "Update post: " + m.title + " [admin]", existing && existing.sha);
      }).then(function () {
        // 2) update index.json
        var posts = blog.index.posts || (blog.index.posts = []);
        var idx = posts.findIndex(function (p) { return p.slug === m.slug; });
        if (idx > -1) posts[idx] = m; else posts.unshift(m);
        return putFile("data/posts/index.json", JSON.stringify(blog.index, null, 2) + "\n", "Update blog index [admin]", blog.sha);
      }).then(function (res) {
        blog.sha = res.content.sha;
        status(""); toast("✅ Post published — live in about a minute.", "ok"); loadHistory(); renderBlogList();
      }).catch(function (e) { status(""); toast("Could not publish post: " + e.message, "error"); });
    }
  }
  function deletePost(i) {
    var p = blog.index.posts[i];
    if (!confirm('Delete the post "' + p.title + '"? You can restore it later from Recent changes.')) return;
    status("Deleting…");
    getFileAt("data/posts/" + p.slug + ".md", cfg.branch).then(function (f) {
      return f ? deleteFile("data/posts/" + p.slug + ".md", f.sha, "Delete post: " + p.title + " [admin]") : null;
    }).then(function () {
      blog.index.posts.splice(i, 1);
      return putFile("data/posts/index.json", JSON.stringify(blog.index, null, 2) + "\n", "Remove post from index [admin]", blog.sha);
    }).then(function (res) { blog.sha = res.content.sha; status(""); toast("Post deleted.", "ok"); loadHistory(); renderBlogList(); })
      .catch(function (e) { status(""); toast("Delete failed: " + e.message, "error"); });
  }

  /* ---- history + undo ----------------------------------------------------- */
  function loadHistory() {
    var host = $("history-list"); host.innerHTML = "<p class='topbar__status'>Loading…</p>";
    listCommits(8).then(function (commits) {
      host.innerHTML = "";
      commits.forEach(function (c) {
        var msg = (c.commit.message || "").split("\n")[0].replace(/\s*\[admin\]\s*$/, "");
        var when = new Date(c.commit.author.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        host.appendChild(el("div", { class: "history-item" }, [
          el("span", { class: "when", text: when }),
          el("span", { class: "msg", text: msg })
        ]));
      });
      if (!commits.length) host.innerHTML = "<p class='topbar__status'>No changes yet.</p>";
    }).catch(function (e) { host.innerHTML = "<p class='topbar__status'>Could not load history: " + e.message + "</p>"; });
  }

  function undoLast() {
    if (!confirm("Undo the most recent change? This puts the website back the way it was just before it.")) return;
    status("Undoing…");
    listCommits(1).then(function (cs) {
      var head = cs[0]; if (!head) throw new Error("nothing to undo");
      return getCommit(head.sha);
    }).then(function (commit) {
      var parent = commit.parents && commit.parents[0] && commit.parents[0].sha;
      var files = commit.files || [];
      // Restore each changed file to its state in the parent commit.
      var chain = Promise.resolve();
      files.forEach(function (f) {
        chain = chain.then(function () {
          if (!parent) return null;
          return getFileAt(f.filename, parent).then(function (prev) {
            return getFileAt(f.filename, cfg.branch).then(function (cur) {
              if (prev === null && cur) return deleteFile(f.filename, cur.sha, "Undo: remove " + f.filename + " [admin]");
              if (prev && cur) return putFile(f.filename, prev.text, "Undo change to " + f.filename + " [admin]", cur.sha);
              if (prev && !cur) return putFile(f.filename, prev.text, "Undo: restore " + f.filename + " [admin]");
              return null;
            });
          });
        });
      });
      return chain;
    }).then(function () {
      status(""); toast("✅ Change undone — the site will update in about a minute.", "ok");
      loadHistory();
      if (state.entry && !state.entry.blog) openEntry(state.entry); else if (state.entry) openBlog();
    }).catch(function (e) { status(""); toast("Undo failed: " + e.message, "error"); });
  }

  /* ---- nav + views -------------------------------------------------------- */
  function setActiveNav(key) {
    document.querySelectorAll(".navlist button").forEach(function (b) {
      b.setAttribute("aria-current", String(b.getAttribute("data-key") === key));
    });
  }
  function buildNav() {
    var groups = { pages: $("nav-pages"), lists: $("nav-lists"), other: $("nav-other") };
    Object.keys(groups).forEach(function (g) { groups[g].innerHTML = ""; });
    REGISTRY.forEach(function (entry) {
      var btn = el("button", { "data-key": entry.key, onclick: function () { openEntry(entry); } });
      btn.style.setProperty("--c", entry.color || "#777");
      btn.appendChild(el("span", { class: "nav-ico", text: entry.icon || "•" }));
      btn.appendChild(el("span", { class: "nav-lbl", text: entry.label }));
      groups[entry.group].appendChild(el("li", {}, [btn]));
    });
  }

  function showView(which) {
    $("view-login").classList.toggle("hide", which !== "login");
    $("view-editor").classList.toggle("hide", which !== "editor");
    $("logout").classList.toggle("hide", which !== "editor");
  }

  function enterEditor() {
    showView("editor"); status("");
    var g = $("greeting"); if (g) { g.textContent = "Pick a page, make your change, then Publish ✨"; g.classList.remove("hide"); }
    buildNav(); openEntry(REGISTRY[0]); loadHistory();
  }

  /* ---- login -------------------------------------------------------------- */
  function tryLogin() {
    var owner = $("in-owner").value.trim(), repo = $("in-repo").value.trim(),
        branch = $("in-branch").value.trim() || "main", token = $("in-token").value.trim();
    if (!owner || !repo || !token) { $("login-msg").textContent = "Please fill in all fields."; return; }
    $("login-msg").textContent = "Checking…";
    cfg = { owner: owner, repo: repo, branch: branch, token: token };
    gh(repoPath("")).then(function (r) {
      if (r.permissions && !r.permissions.push) { $("login-msg").textContent = "That access code can read but not edit this site. Please check with Andrew."; return; }
      saveCfg(cfg); $("login-msg").textContent = ""; enterEditor();
    }).catch(function (e) {
      cfg = null;
      $("login-msg").textContent = e.status === 401 ? "That access code wasn't accepted. Please re-check it." :
        e.status === 404 ? "Couldn't find that account/repository (or no access)." : "Sign-in problem: " + e.message;
    });
  }

  /* ---- boot --------------------------------------------------------------- */
  function boot() {
    $("btn-login").addEventListener("click", tryLogin);
    $("btn-publish").addEventListener("click", doPublish);
    $("btn-preview").addEventListener("click", doPreview);
    $("btn-refresh-history").addEventListener("click", loadHistory);
    $("btn-undo").addEventListener("click", undoLast);
    $("logout").addEventListener("click", function () { clearCfg(); location.reload(); });

    if (loadCfg() && cfg.token) {
      // Validate silently; fall back to login if the token was revoked.
      gh(repoPath("")).then(enterEditor).catch(function () { showView("login"); });
    } else {
      showView("login");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
