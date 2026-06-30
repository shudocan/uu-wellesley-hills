/* ==========================================================================
   forms.js — Client-side validation + submission for static forms.

   Submission strategy (configurable, decided in Phase 5):
     - If window.UU_FORM_ENDPOINT is set (e.g. a Formspree URL), POST there.
     - Otherwise fall back to opening a pre-filled mailto: to the office.
   The honeypot field "_gotcha" must stay empty (spam guard).
   ========================================================================== */
(function () {
  "use strict";

  // Set this to your Formspree (or Basin) endpoint to enable direct submission.
  // Left null for now -> graceful mailto fallback. Configured in Phase 5.
  var ENDPOINT = window.UU_FORM_ENDPOINT || null;
  var FALLBACK_EMAIL = "info@uuwellesley.org";

  function setStatus(el, state, msg) {
    if (!el) return;
    el.setAttribute("data-state", state);
    el.textContent = msg;
  }

  function validate(form) {
    var ok = true;
    form.querySelectorAll("[required]").forEach(function (input) {
      var field = input.closest(".field");
      var valid = input.value.trim() !== "" && input.checkValidity();
      if (field) field.setAttribute("data-invalid", String(!valid));
      if (!valid && ok) { input.focus(); ok = false; }
    });
    return ok;
  }

  function toMailto(form) {
    var data = new FormData(form);
    var lines = [];
    data.forEach(function (v, k) {
      if (k === "_gotcha" || !String(v).trim()) return;
      lines.push(k.replace(/_/g, " ") + ": " + v);
    });
    var subject = "Rental Inquiry — " + (data.get("name") || "Website");
    return "mailto:" + FALLBACK_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function wireForm(form) {
    var status = form.querySelector(".form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Honeypot: silently succeed for bots.
      if (form.querySelector('[name="_gotcha"]') && form.querySelector('[name="_gotcha"]').value) return;
      if (!validate(form)) { setStatus(status, "error", "Please complete the required fields."); return; }

      if (ENDPOINT) {
        setStatus(status, "sending", "Sending…");
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json" },
          body: new FormData(form)
        }).then(function (r) {
          if (r.ok) {
            form.reset();
            setStatus(status, "ok", "Thank you! We'll be in touch soon.");
          } else {
            setStatus(status, "error", "Something went wrong — please email us directly.");
          }
        }).catch(function () {
          setStatus(status, "error", "Network error — please email us directly.");
        });
      } else {
        // Fallback: open the visitor's email client pre-filled.
        setStatus(status, "ok", "Opening your email app to send the inquiry…");
        window.location.href = toMailto(form);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-form]").forEach(wireForm);
  });
})();
