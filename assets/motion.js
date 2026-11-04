/* Raiseline motion layer.
   Every effect is skipped when the visitor has "reduce motion" turned on. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  var onView = function (el, fn, threshold) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold: threshold || 0.35 });
    io.observe(el);
  };

  /* 1. Capital flow — investor dots streaming into the raise panel */
  var hero = $(".hero");
  var heroSizer = hero && $("[data-sizer]", hero);
  if (hero && heroSizer && window.HTMLCanvasElement) {
    var cv = document.createElement("canvas");
    cv.className = "flow";
    cv.setAttribute("aria-hidden", "true");
    hero.insertBefore(cv, hero.firstChild);
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1, parts = [], last = 0, spawnT = 0, visible = true, lastPing = 0, raf;

    var geo = { stacked: false, sx: 0, sy: 0, sw: 0, sh: 0 };
    var size = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var h = hero.getBoundingClientRect(), s = heroSizer.getBoundingClientRect();
      geo = { sx: s.left - h.left, sy: s.top - h.top, sw: s.width, sh: s.height };
      geo.stacked = geo.sy > H * 0.45; // sizer sits below the text on small screens
      // Keep the headline clean: particles only become visible near the panel
      var m = geo.stacked
        ? "linear-gradient(180deg, transparent 0, transparent " + (geo.sy - 150) + "px, #000 " + (geo.sy - 30) + "px)"
        : "linear-gradient(90deg, transparent 0, transparent " + (geo.sx - 150) + "px, #000 " + (geo.sx - 40) + "px)";
      cv.style.webkitMaskImage = m; cv.style.maskImage = m;
    };
    var target = function () {
      return geo.stacked
        ? { x: geo.sx + geo.sw * (0.12 + Math.random() * 0.76), y: geo.sy + 2 }
        : { x: geo.sx + 2, y: geo.sy + geo.sh * (0.12 + Math.random() * 0.76) };
    };
    var spawn = function () {
      var t = target(), big = Math.random() < 0.08, x, y, vx, vy;
      if (geo.stacked) { x = Math.random() * W; y = geo.sy - 230 - Math.random() * 60; vx = (Math.random() - 0.5) * 1.6; vy = 1.2 + Math.random() * 1.2; }
      else { x = geo.sx - 300 - Math.random() * 80; y = H * (0.04 + Math.random() * 0.92); vx = 1.3 + Math.random() * 1.4; vy = (Math.random() - 0.5) * 1.8; }
      parts.push({
        x: x, y: y, vx: vx, vy: vy, tx: t.x, ty: t.y,
        sp: 2 + Math.random() * 1.8,
        c: Math.random() < 0.7 ? "60,240,180" : "77,163,255",
        r: big ? 2.3 : 1 + Math.random() * 0.7,
        a: 0
      });
    };
    var ping = function () {
      var now = performance.now();
      if (now - lastPing < 380) return;
      lastPing = now;
      heroSizer.classList.remove("ping"); void heroSizer.offsetWidth; heroSizer.classList.add("ping");
    };
    var frame = function (now) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) { last = now; return; }
      var dt = Math.min(2.5, (now - (last || now)) / 16.67); last = now;
      spawnT += dt;
      var every = geo.stacked ? 8 : 4;
      while (spawnT > every) { spawnT -= every; if (parts.length < 90) spawn(); }
      ctx.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i], dx = p.tx - p.x, dy = p.ty - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        var steer = 0.018 + Math.max(0, 1 - d / 420) * 0.07;
        p.vx += (dx / d * p.sp - p.vx) * steer * dt;
        p.vy += (dy / d * p.sp - p.vy) * steer * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.a = Math.min(1, p.a + 0.03 * dt);
        var fade = Math.min(1, d / 60);
        var alpha = p.a * fade;
        var tail = 7 + p.r * 3;
        var g = ctx.createLinearGradient(p.x - p.vx * tail, p.y - p.vy * tail, p.x, p.y);
        g.addColorStop(0, "rgba(" + p.c + ",0)");
        g.addColorStop(1, "rgba(" + p.c + "," + (0.55 * alpha) + ")");
        ctx.strokeStyle = g; ctx.lineWidth = p.r; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x - p.vx * tail, p.y - p.vy * tail); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = "rgba(" + p.c + "," + (0.9 * alpha) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.9, 0, 6.283); ctx.fill();
        if (d < 8 || p.x > W + 20) { parts.splice(i, 1); if (d < 8) ping(); }
      }
    };
    size();
    window.addEventListener("resize", function () { size(); parts.forEach(function (p) { var t = target(); p.tx = t.x; p.ty = t.y; }); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
    }
    raf = requestAnimationFrame(frame);
  }

  /* 2. Raise sizer boots up: slider sweeps to its value, numbers count with it */
  $$("[data-sizer]").forEach(function (sz) {
    var range = $("input[type=range]", sz);
    if (!range) return;
    var goal = +range.value;
    range.value = 0; range.dispatchEvent(new Event("input"));
    var cancelled = false;
    range.addEventListener("pointerdown", function () { cancelled = true; sz.classList.remove("booting"); });
    range.addEventListener("keydown", function () { cancelled = true; sz.classList.remove("booting"); });
    sz.classList.add("booting");
    onView(sz, function () {
      var start = performance.now(), dur = 1700, delay = 350;
      var step = function (now) {
        if (cancelled) return;
        var t = Math.max(0, Math.min(1, (now - start - delay) / dur));
        range.value = Math.round(goal * ease(t));
        range.dispatchEvent(new Event("input"));
        if (t < 1) requestAnimationFrame(step); else sz.classList.remove("booting");
      };
      requestAnimationFrame(step);
    }, 0.4);
  });

  /* 3. Terminal-style digit scramble: figures resolve left to right onto the latest value */
  window.RL_setFig = function (el, text) {
    el._want = text;
    if (el._run) return;
    el._run = true;
    var n = 0, frames = 7;
    var tick = function () {
      n++;
      var want = el._want;
      if (n >= frames) { el.textContent = want; el._run = false; return; }
      el.textContent = want.replace(/\d/g, function (ch, idx) {
        return idx / want.length < n / frames ? ch : String((Math.random() * 10) | 0);
      });
      setTimeout(tick, 32);
    };
    tick();
  };
  // Quiz score appears later; watch its container
  var stage = $("[data-stage]");
  if (stage) {
    new MutationObserver(function () {
      var s = $(".score-num", stage);
      if (s && !s._seen) {
        s._seen = true;
        var node = s.firstChild, target = parseInt(node.nodeValue, 10) || 0, t0 = performance.now();
        var run = function (now) {
          var t = Math.min(1, (now - t0) / 1100);
          node.nodeValue = String(Math.round(target * ease(t)));
          if (t < 1) requestAnimationFrame(run);
        };
        node.nodeValue = "0"; requestAnimationFrame(run);
      }
    }).observe(stage, { childList: true });
  }

  /* 4. Process timeline draws itself, nodes light in order */
  $$(".steps").forEach(function (el) { onView(el, function () { el.classList.add("drawn"); }, 0.3); });

  /* 5. Ticker: quotes flash as if updating */
  var tickVals = $$(".ticker ul:first-child b");
  if (tickVals.length) {
    setInterval(function () {
      if (document.hidden) return;
      var b = tickVals[(Math.random() * tickVals.length) | 0];
      b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash");
    }, 1600);
  }

  /* 6. Pointer spotlight on panels */
  if (window.matchMedia("(hover: hover)").matches) {
    $$(".panel, .articles a, .split > div, .sizer, .table-scroll").forEach(function (el) {
      el.classList.add("spot");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }
})();
