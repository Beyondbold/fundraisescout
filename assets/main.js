(function () {
  "use strict";
  var SITE = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var setFig = function (el, text) { if (window.RL_setFig) window.RL_setFig(el, text); else el.textContent = text; };
  var usd = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var usdShort = function (n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
    return "$" + n;
  };

  /* ---------- Mobile nav ---------- */
  var toggle = $(".nav-toggle"), nav = $(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Form submission ---------- */
  function submitLead(payload) {
    payload.page = location.pathname;
    payload.submittedAt = new Date().toISOString();
    if (!SITE.formEndpoint) {
      console.info("[Fundraise Scout] No formEndpoint set in assets/config.js. Submission:", payload);
      return Promise.resolve();
    }
    return fetch(SITE.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); });
  }
  window.FSSubmit = submitLead;

  $$("form[data-lead]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $(".form-msg", form);
      if (form.querySelector(".hp input") && form.querySelector(".hp input").value) return; // bot
      var data = { formType: form.getAttribute("data-lead") };
      new FormData(form).forEach(function (v, k) { if (k !== "website_hp") data[k] = v; });
      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; }
      if (msg) { msg.classList.remove("err"); msg.textContent = "Sending…"; }
      submitLead(data).then(function () {
        if (msg) msg.textContent = form.getAttribute("data-success") || "Thanks — you're in.";
        form.reset();
      }).catch(function () {
        if (msg) { msg.classList.add("err"); msg.textContent = "That didn't go through. Check your connection and try again, or email " + (SITE.contactEmail || "us") + "."; }
      }).then(function () { if (btn) btn.disabled = false; });
    });
  });

  /* ---------- Raise sizer (home + founders) ---------- */
  var sizer = $("[data-sizer]");
  if (sizer) {
    var range = $("input[type=range]", sizer);
    var first = $("input[type=checkbox]", sizer);
    var out = {
      amount: $("[data-out=amount]", sizer),
      fs: $("[data-out=fs]", sizer),
      fsCost: $("[data-out=fscost]", sizer),
      fee: $("[data-out=fee]", sizer),
      net: $("[data-out=net]", sizer)
    };
    var tiers = $$(".tier-bar div", sizer);
    // Slider is non-linear so small raises get resolution
    var stops = [];
    (function () {
      var v = 25000;
      while (v < 5000000) {
        stops.push(v);
        v += v < 250000 ? 25000 : v < 1000000 ? 50000 : 100000;
      }
      stops.push(5000000);
    })();
    range.min = 0; range.max = stops.length - 1;
    if (!range.dataset.init) range.value = stops.indexOf(500000);

    function render() {
      var amt = stops[+range.value];
      var firstTime = first ? first.checked : true;
      var tier, fs, cost;
      if (amt <= 124000) { tier = 0; fs = "Certified by your CEO"; cost = "Minimal — your own books"; }
      else if (amt <= 618000) { tier = 1; fs = "Reviewed by an independent CPA"; cost = "≈ $2K–$10K"; }
      else if (amt <= 1235000 && firstTime) { tier = 2; fs = "Reviewed (first-time issuer relief)"; cost = "≈ $3K–$12K"; }
      else { tier = 3; fs = "Audited by an independent CPA"; cost = "≈ $10K–$40K+"; }
      out.amount.textContent = usd(amt);
      setFig(out.fs, fs);
      setFig(out.fsCost, cost);
      setFig(out.fee, usdShort(amt * 0.05) + " – " + usdShort(amt * 0.10));
      setFig(out.net, usdShort(amt * 0.88) + " – " + usdShort(amt * 0.93));
      range.setAttribute("aria-valuetext", usd(amt));
      range.style.setProperty("--pct", (range.value / range.max * 100) + "%");
      tiers.forEach(function (t, i) { t.classList.toggle("on", i === tier); });
    }
    range.addEventListener("input", render);
    if (first) first.addEventListener("change", render);
    render();
  }

  /* ---------- Investor limit calculator ---------- */
  var calc = $("[data-limit-calc]");
  if (calc) {
    var inc = $("#inc", calc), nw = $("#nw", calc), acc = $("#acc", calc);
    var big = $("[data-out=limit]", calc), why = $("[data-out=why]", calc);
    var T = 124000;
    var num = function (el) { return Math.max(0, parseFloat(String(el.value).replace(/[^0-9.]/g, "")) || 0); };
    function renderLimit() {
      if (acc.checked) {
        setFig(big, "No limit");
        why.textContent = "Accredited investors aren't subject to Reg CF investment limits. Platforms will still ask you to confirm your status.";
        return;
      }
      var i = num(inc), n = num(nw), greater = Math.max(i, n), limit, text;
      if (i < T || n < T) {
        limit = Math.max(2500, greater * 0.05);
        text = "Because your income or net worth is under " + usd(T) + ", your limit is the greater of $2,500 or 5% of the greater of the two (" + usd(greater) + ").";
      } else {
        limit = Math.min(T, greater * 0.10);
        text = "Because both your income and net worth are at least " + usd(T) + ", your limit is 10% of the greater of the two, capped at " + usd(T) + ".";
      }
      setFig(big, usd(limit));
      why.textContent = text + " This is the total across all Reg CF offerings in any 12-month period, not per company.";
    }
    [inc, nw, acc].forEach(function (el) { el.addEventListener("input", renderLimit); el.addEventListener("change", renderLimit); });
    renderLimit();
  }
})();
