(function () {
  "use strict";
  var root = document.querySelector("[data-quiz]");
  if (!root) return;
  var SITE = window.SITE || {};

  /* Each answer carries points (0–3) and, when weak, a gap note shown in the result. */
  var Q = [
    { k: "entity", q: "Is your company a legally formed U.S. entity?",
      a: [["Yes — Delaware or another U.S. state", 3], ["Not yet, but forming one soon", 1, "Reg CF is only open to companies organized in the U.S. Form your entity (and clean up founder equity) before anything else."], ["No, we're organized outside the U.S.", 0, "Non-U.S. companies can't use Reg CF directly. Some founders set up a U.S. parent company first — talk to counsel."]] },
    { k: "stage", q: "Where is the product today?",
      a: [["Live, with paying customers", 3], ["Launched, mostly free users or pilots", 2], ["Prototype or beta", 1, "Crowd investors back traction. A working product with real users makes a campaign far easier."], ["Idea stage", 0, "Idea-stage raises rarely fund on Reg CF. Build an MVP and gather early users first."]] },
    { k: "revenue", q: "What's your trailing 12-month revenue?",
      a: [["$1M or more", 3], ["$100K – $1M", 3], ["Under $100K", 2], ["Pre-revenue", 1, "Pre-revenue raises do happen, but you'll need a strong story, community, or waitlist to compensate."]] },
    { k: "community", q: "How big is the audience you can reach directly — customers, email list, social followers?",
      a: [["10,000+ people", 3], ["2,000 – 10,000", 2], ["Under 2,000", 1, "Most successful campaigns raise a large share of their first dollars from their own community. Start growing an email list now."], ["Not sure / none", 0, "Without an existing audience you'd be relying on platform traffic alone, which is rarely enough. Map out who already knows and likes your brand."]] },
    { k: "consumer", q: "Would an everyday person understand and get excited about what you do?",
      a: [["Yes — it's a consumer brand people use", 3], ["Mostly — it's B2B but easy to explain", 2], ["It takes some explaining", 1, "Crowd investors fund what they understand. Work on a one-sentence pitch a non-expert can repeat."]] },
    { k: "books", q: "How are your financials?",
      a: [["Clean books, GAAP-ready, accountant on board", 3], ["Organized, but we'd need help to get GAAP-ready", 2], ["Pretty messy", 0, "You'll need GAAP financial statements (reviewed or audited above $124K). Engage a bookkeeper and CPA early — this is the most common source of delays."]] },
    { k: "amount", q: "How much are you looking to raise?",
      a: [["$250K – $5M", 3], ["Under $250K", 2], ["More than $5M", 1, "Reg CF caps raises at $5M per 12 months. Many companies pair Reg CF with a Reg D round for accredited investors, or look at Reg A+."]] },
    { k: "timeline", q: "When would you want to launch?",
      a: [["Within 3 months", 3], ["3 – 6 months", 3], ["6 – 12 months", 2], ["Just exploring", 1]] },
    { k: "time", q: "Can someone on your team commit serious time to the campaign while it's live?",
      a: [["Yes, a founder will lead it", 3], ["Part-time, alongside other work", 2], ["Not really", 0, "Campaigns are a marketing sprint — usually 60–90 days of daily updates, emails, and investor questions. Plan who owns it."]] }
  ];

  var answers = new Array(Q.length);
  var i = 0;
  var stage = root.querySelector("[data-stage]");
  var bar = root.querySelector(".quiz-progress span");

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function renderQ() {
    var item = Q[i];
    bar.style.width = (i / Q.length * 100) + "%";
    var h = '<p class="quiz-count">Question ' + (i + 1) + ' of ' + Q.length + '</p>' +
      '<h2 id="qh" tabindex="-1">' + esc(item.q) + '</h2><div class="opts" role="group" aria-labelledby="qh">';
    item.a.forEach(function (opt, j) {
      h += '<button type="button" class="opt" data-j="' + j + '" aria-pressed="' + (answers[i] === j) + '"><span class="dot" aria-hidden="true"></span>' + esc(opt[0]) + '</button>';
    });
    h += '</div><div class="quiz-nav">' +
      (i > 0 ? '<button type="button" class="btn btn-ghost" data-back>Back</button>' : '<span></span>') +
      '<button type="button" class="btn btn-primary" data-next ' + (answers[i] == null ? "disabled" : "") + '>' + (i === Q.length - 1 ? "See my result" : "Next question") + '</button></div>';
    stage.innerHTML = h;
    var hEl = stage.querySelector("#qh"); if (hEl && i > 0) hEl.focus();
  }

  stage.addEventListener("click", function (e) {
    var opt = e.target.closest(".opt");
    if (opt) {
      answers[i] = +opt.getAttribute("data-j");
      stage.querySelectorAll(".opt").forEach(function (b) { b.setAttribute("aria-pressed", b === opt ? "true" : "false"); });
      stage.querySelector("[data-next]").disabled = false;
      return;
    }
    if (e.target.closest("[data-back]")) { i--; renderQ(); return; }
    if (e.target.closest("[data-next]")) {
      if (answers[i] == null) return;
      if (i < Q.length - 1) { i++; renderQ(); } else { renderResult(); }
    }
  });

  function renderResult() {
    bar.style.width = "100%";
    var pts = 0, max = Q.length * 3, gaps = [], summary = {};
    Q.forEach(function (item, n) {
      var a = item.a[answers[n]];
      pts += a[1];
      summary[item.k] = a[0];
      if (a[2]) gaps.push(a[2]);
    });
    var score = Math.round(pts / max * 100);
    var hardStop = answers[0] === 2; // non-U.S.
    var v, cls, blurb;
    if (hardStop) { v = "Not eligible as structured"; cls = "later"; blurb = "Reg CF requires a U.S. company. That can be solved, but it comes first."; }
    else if (score >= 75) { v = "Strong candidate"; cls = "go"; blurb = "You look like the kind of company that does well on Reg CF platforms. The next step is choosing the right platform and planning your pre-launch."; }
    else if (score >= 50) { v = "Getting close"; cls = "soon"; blurb = "Reg CF could work for you with some preparation. Close the gaps below and you'll launch from a much stronger position."; }
    else { v = "Not yet"; cls = "later"; blurb = "A Reg CF raise would be an uphill climb today. The gaps below are the things to work on first — none of them are permanent."; }

    var h = '<p class="quiz-count">Your result</p>' +
      '<div class="score-band"><div class="score-num" aria-label="Readiness score ' + score + ' out of 100">' + score + '<small>/100</small></div><span class="verdict ' + cls + '">' + v + '</span></div>' +
      '<h2 tabindex="-1" id="rh">' + esc(blurb) + '</h2>';
    if (gaps.length) {
      h += '<h3 class="mt-2">What to work on</h3><ul class="gaps">' + gaps.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul>";
    }
    h += '<div class="panel mt-3"><h3 class="mt-0">Get your personalized platform shortlist</h3>' +
      '<p class="muted">Tell us where to send it. We\'ll review your answers and reply within two business days with which funding portals fit your company, typical fees, and a pre-launch checklist. Free, no obligation.</p>' +
      '<form id="lead"><div class="field-row"><div class="field"><label for="ln">Your name</label><input id="ln" name="name" type="text" autocomplete="name" required></div>' +
      '<div class="field"><label for="le">Work email</label><input id="le" name="email" type="email" autocomplete="email" required></div></div>' +
      '<div class="field-row"><div class="field"><label for="lc">Company</label><input id="lc" name="company" type="text" autocomplete="organization" required></div>' +
      '<div class="field"><label for="lw">Website</label><input id="lw" name="companyUrl" type="text" inputmode="url" placeholder="yourcompany.com"></div></div>' +
      '<div class="field"><label for="lnote">Anything else we should know? <span class="muted">(optional)</span></label><textarea id="lnote" name="notes" rows="3"></textarea></div>' +
      '<label class="check field"><input type="checkbox" name="consent" required> I agree to be contacted about my raise. Fundraise Scout may receive referral compensation from platforms — see our disclosures.</label>' +
      '<div class="hp" aria-hidden="true"><input name="website_hp" tabindex="-1" autocomplete="off"></div>' +
      '<button class="btn btn-primary" type="submit">Send me my shortlist</button><p class="form-msg" role="status"></p></form></div>' +
      '<p class="mt-2"><button type="button" class="btn btn-ghost btn-sm" data-restart>Retake the quiz</button></p>';
    stage.innerHTML = h;
    stage.querySelector("#rh").focus();

    var form = stage.querySelector("#lead");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.website_hp.value) return;
      var msg = form.querySelector(".form-msg"), btn = form.querySelector("button[type=submit]");
      var data = { formType: "founder-quiz", score: score, verdict: v, answers: summary };
      new FormData(form).forEach(function (val, key) { if (key !== "website_hp") data[key] = val; });
      btn.disabled = true; msg.classList.remove("err"); msg.textContent = "Sending…";
      window.FSSubmit(data).then(function () {
        var done = '<div class="callout callout--green"><p><strong>Got it — thanks, ' + esc(data.name.split(" ")[0]) + '.</strong> Your shortlist will land in your inbox within two business days.</p></div>';
        if (SITE.bookingUrl) done += '<p class="mt-2">Want to talk it through sooner? <a href="' + esc(SITE.bookingUrl) + '" target="_blank" rel="noopener">Book a 20-minute call</a>.</p>';
        form.outerHTML = done;
      }).catch(function () {
        btn.disabled = false; msg.classList.add("err");
        msg.textContent = "That didn't go through. Try again, or email " + (SITE.contactEmail || "us") + ".";
      });
    });
    stage.querySelector("[data-restart]").addEventListener("click", function () { answers = new Array(Q.length); i = 0; renderQ(); });
  }

  renderQ();
})();
