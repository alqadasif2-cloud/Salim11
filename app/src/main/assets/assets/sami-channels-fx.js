/**
 * Salim Channels & Navigation Visual/Motion FX Engine
 * - GPU-friendly, visibility-aware, device-adaptive
 * - 1. Smooth traveling golden energy dock indicator across all bottom nav tabs
 * - 2. Smooth, organic golden electric arcs, flashes & sparks transferring randomly across visible channel cards
 * - Zero React re-render overhead, zero layout thrashing, auto-pauses off-screen / hidden / on page leave
 */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reducedMotionQuery = null;
  try {
    reducedMotionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  } catch (_) {}

  /* ------------------------------------------------------------------------
   * 1. ADAPTIVE DEVICE PERFORMANCE TIER
   * ------------------------------------------------------------------------ */
  function computePerfTier() {
    var isLegacy = Boolean(window.__samiIsLegacyAndroid) || docEl.classList.contains('sami-legacy-android');
    var prefersReduced = Boolean(reducedMotionQuery && reducedMotionQuery.matches);
    var cores = Number(navigator.hardwareConcurrency) || 4;
    var mem = Number(navigator.deviceMemory) || 4;

    if (isLegacy || prefersReduced || cores <= 2 || mem <= 2) {
      return 'lite';
    }
    if (cores <= 6 || mem <= 4 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '')) {
      return 'balanced';
    }
    return 'ultra';
  }

  var perfTier = computePerfTier();

  function applyPerfTier(tier) {
    perfTier = tier;
    docEl.dataset.salimFxTier = tier;
    docEl.classList.remove('salim-fx-lite', 'salim-fx-balanced', 'salim-fx-ultra');
    docEl.classList.add('salim-fx-' + tier);
  }

  applyPerfTier(perfTier);

  if (reducedMotionQuery && typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', function () {
      applyPerfTier(computePerfTier());
    });
  }

  /* ------------------------------------------------------------------------
   * 2. BOTTOM NAVIGATION TRAVELING GOLDEN ENERGY & SPARK TRANSFER
   * ------------------------------------------------------------------------ */
  var lastNavTabKey = null;
  var navBurstTimer = null;
  var navRafId = 0;

  function updateNavTraveler(forceInstant) {
    var dock = document.querySelector('.salim-nav-dock');
    if (!dock) return;

    var inner = dock.querySelector('.salim-nav-inner');
    var traveler = dock.querySelector('.salim-nav-traveler');
    if (!inner || !traveler) return;

    var activeBtn = inner.querySelector('.salim-nav-tab.is-active');
    if (!activeBtn) {
      traveler.style.opacity = '0';
      return;
    }

    var centerX = activeBtn.offsetLeft + activeBtn.offsetWidth * 0.5;
    var tabKey = activeBtn.getAttribute('data-salim-tab') || String(Math.round(centerX));

    if (forceInstant || lastNavTabKey === null) {
      traveler.classList.add('no-transition');
      traveler.style.transform = 'translate3d(' + centerX.toFixed(1) + 'px, 0, 0)';
      traveler.style.opacity = '1';
      void traveler.offsetWidth;
      traveler.classList.remove('no-transition');
      lastNavTabKey = tabKey;
      return;
    }

    traveler.style.opacity = '1';
    traveler.style.transform = 'translate3d(' + centerX.toFixed(1) + 'px, 0, 0)';

    if (lastNavTabKey !== tabKey) {
      lastNavTabKey = tabKey;
      traveler.classList.remove('is-traveling');
      void traveler.offsetWidth;
      traveler.classList.add('is-traveling');

      activeBtn.classList.remove('is-just-activated');
      void activeBtn.offsetWidth;
      activeBtn.classList.add('is-just-activated');

      if (navBurstTimer) clearTimeout(navBurstTimer);
      navBurstTimer = setTimeout(function () {
        if (traveler) traveler.classList.remove('is-traveling');
        if (activeBtn) activeBtn.classList.remove('is-just-activated');
      }, 420);
    }
  }

  function scheduleNavUpdate(forceInstant) {
    if (navRafId) cancelAnimationFrame(navRafId);
    navRafId = requestAnimationFrame(function () {
      navRafId = 0;
      updateNavTraveler(forceInstant);
    });
  }

  document.addEventListener(
    'click',
    function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') return;
      var btn = target.closest('.salim-nav-tab');
      if (!btn) return;
      scheduleNavUpdate(false);
    },
    true
  );

  window.addEventListener(
    'resize',
    function () {
      scheduleNavUpdate(true);
    },
    { passive: true }
  );

  /* ------------------------------------------------------------------------
   * 2B. ZERO-LATENCY TACTILE PRESS FEEDBACK FOR "FULL DETAILS" CTA BUTTONS
   * ------------------------------------------------------------------------ */
  var ctaPressTimers = typeof WeakMap === 'function' ? new WeakMap() : null;
  var activePressedCta = null;

  function triggerCtaPress(btn) {
    if (!btn) return;
    if (ctaPressTimers) {
      var prevTimer = ctaPressTimers.get(btn);
      if (prevTimer) clearTimeout(prevTimer);
    }
    activePressedCta = btn;
    btn.classList.add('is-pressed');
  }

  function releaseCtaPress(btn, immediate) {
    var targetBtn = btn || activePressedCta;
    if (!targetBtn) return;
    if (targetBtn === activePressedCta) {
      activePressedCta = null;
    }
    if (ctaPressTimers) {
      var prevTimer = ctaPressTimers.get(targetBtn);
      if (prevTimer) clearTimeout(prevTimer);
    }
    if (immediate) {
      targetBtn.classList.remove('is-pressed');
      return;
    }
    var tid = setTimeout(function () {
      targetBtn.classList.remove('is-pressed');
      if (ctaPressTimers) ctaPressTimers.delete(targetBtn);
    }, 110);
    if (ctaPressTimers) {
      ctaPressTimers.set(targetBtn, tid);
    }
  }

  document.addEventListener(
    'pointerdown',
    function (ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') return;
      var btn = target.closest('.salim-pkg-cta');
      if (btn) triggerCtaPress(btn);
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    'pointerup',
    function (ev) {
      var target = ev.target;
      var btn = target && typeof target.closest === 'function' ? target.closest('.salim-pkg-cta') : null;
      releaseCtaPress(btn, false);
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    'pointercancel',
    function () {
      releaseCtaPress(null, true);
    },
    { passive: true, capture: true }
  );

  /* ------------------------------------------------------------------------
   * 3. ELECTRIC GOLDEN ARCS, FLASHES & SPARKS ENGINE (VISIBLE CARDS ONLY)
   * ------------------------------------------------------------------------ */
  var MAX_SPARKS = 10;
  var JITTER_COUNT = 32;
  var visibleCards = new Set();
  var observedCards = typeof WeakSet === 'function' ? new WeakSet() : null;
  var observedGrid = null;
  var cardObserver = null;
  var gridResizeObserver = null;
  var stagePresent = false;
  var rafLoopId = 0;
  var lastFrameTs = 0;
  var nextTransferAt = 0;

  function createSlotState() {
    var canvas = document.createElement('canvas');
    canvas.className = 'salim-electric-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d', { alpha: true });

    var sparks = [];
    for (var i = 0; i < MAX_SPARKS; i++) {
      sparks.push({
        active: false,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 1.5
      });
    }

    return {
      canvas: canvas,
      ctx: ctx,
      card: null,
      w: 0,
      h: 0,
      dpr: 1,
      opacity: 0,
      targetOpacity: 0,
      phase: Math.random() * 100,
      arcOffsetA: Math.random(),
      arcOffsetB: (Math.random() + 0.45) % 1,
      arcSpeedA: 0.08 + Math.random() * 0.045,
      arcSpeedB: -(0.06 + Math.random() * 0.04),
      lastJitterAt: 0,
      jitterCurr: new Float32Array(JITTER_COUNT),
      jitterTarget: new Float32Array(JITTER_COUNT),
      flashAmp: 0.35,
      flashTarget: 0.45,
      sparks: sparks
    };
  }

  var slotPrimary = createSlotState();
  var slotFading = createSlotState();

  function refreshJitterTargets(slot) {
    for (var i = 0; i < JITTER_COUNT; i++) {
      slot.jitterTarget[i] = (Math.random() - 0.5) * 2;
    }
    slot.flashTarget = Math.random() < 0.34 ? 0.68 + Math.random() * 0.32 : 0.18 + Math.random() * 0.28;
  }
  refreshJitterTargets(slotPrimary);
  refreshJitterTargets(slotFading);
  slotPrimary.jitterCurr.set(slotPrimary.jitterTarget);
  slotFading.jitterCurr.set(slotFading.jitterTarget);

  function syncCanvasSize(slot) {
    if (!slot.card) return false;
    var cw = slot.card.offsetWidth;
    var ch = slot.card.offsetHeight;
    if (!cw || !ch) return false;

    var pad = 10; // matches CSS .salim-ch-electric-slot { inset: -10px }
    var totalW = cw + pad * 2;
    var totalH = ch + pad * 2;
    var maxDpr = perfTier === 'ultra' ? 2 : 1.5;
    var dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    if (slot.w !== totalW || slot.h !== totalH || slot.dpr !== dpr) {
      slot.w = totalW;
      slot.h = totalH;
      slot.dpr = dpr;
      slot.canvas.width = Math.round(totalW * dpr);
      slot.canvas.height = Math.round(totalH * dpr);
      if (slot.ctx) {
        slot.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    return true;
  }

  function detachSlot(slot) {
    if (slot.card) {
      slot.card.classList.remove('salim-ch-card-energized');
    }
    if (slot.canvas.parentNode) {
      slot.canvas.parentNode.removeChild(slot.canvas);
    }
    if (slot.ctx && slot.w && slot.h) {
      slot.ctx.clearRect(0, 0, slot.w, slot.h);
    }
    slot.card = null;
    slot.opacity = 0;
    slot.targetOpacity = 0;
    for (var i = 0; i < slot.sparks.length; i++) {
      slot.sparks[i].active = false;
    }
  }

  function attachSlot(slot, card) {
    if (!card || !card.isConnected) return false;
    var host = card.querySelector('.salim-ch-electric-slot') || card;
    slot.card = card;
    slot.opacity = 0.08;
    slot.targetOpacity = 1;
    slot.arcOffsetA = Math.random();
    slot.arcOffsetB = (slot.arcOffsetA + 0.42 + Math.random() * 0.2) % 1;
    refreshJitterTargets(slot);
    slot.jitterCurr.set(slot.jitterTarget);
    if (slot.canvas.parentNode !== host) {
      host.appendChild(slot.canvas);
    }
    card.classList.add('salim-ch-card-energized');
    syncCanvasSize(slot);
    return true;
  }

  // Maps normalized perimeter t in [0, 1) to (x, y, nx, ny) on a rounded rectangle
  function sampleRoundedRectPerimeter(t, x, y, w, h, r, out) {
    t = ((t % 1) + 1) % 1;
    var straightW = Math.max(0, w - 2 * r);
    var straightH = Math.max(0, h - 2 * r);
    var arcLen = 0.5 * Math.PI * r;
    var perim = 2 * straightW + 2 * straightH + 4 * arcLen;
    var d = t * perim;

    if (d < straightW) {
      out.x = x + r + d;
      out.y = y;
      out.nx = 0;
      out.ny = -1;
      return;
    }
    d -= straightW;

    if (d < arcLen) {
      var a = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
      var cos = Math.cos(a);
      var sin = Math.sin(a);
      out.x = x + w - r + cos * r;
      out.y = y + r + sin * r;
      out.nx = cos;
      out.ny = sin;
      return;
    }
    d -= arcLen;

    if (d < straightH) {
      out.x = x + w;
      out.y = y + r + d;
      out.nx = 1;
      out.ny = 0;
      return;
    }
    d -= straightH;

    if (d < arcLen) {
      var a2 = (d / arcLen) * (Math.PI / 2);
      var cos2 = Math.cos(a2);
      var sin2 = Math.sin(a2);
      out.x = x + w - r + cos2 * r;
      out.y = y + h - r + sin2 * r;
      out.nx = cos2;
      out.ny = sin2;
      return;
    }
    d -= arcLen;

    if (d < straightW) {
      out.x = x + w - r - d;
      out.y = y + h;
      out.nx = 0;
      out.ny = 1;
      return;
    }
    d -= straightW;

    if (d < arcLen) {
      var a3 = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
      var cos3 = Math.cos(a3);
      var sin3 = Math.sin(a3);
      out.x = x + r + cos3 * r;
      out.y = y + h - r + sin3 * r;
      out.nx = cos3;
      out.ny = sin3;
      return;
    }
    d -= arcLen;

    if (d < straightH) {
      out.x = x;
      out.y = y + h - r - d;
      out.nx = -1;
      out.ny = 0;
      return;
    }
    d -= straightH;

    var a4 = Math.PI + (d / arcLen) * (Math.PI / 2);
    var cos4 = Math.cos(a4);
    var sin4 = Math.sin(a4);
    out.x = x + r + cos4 * r;
    out.y = y + r + sin4 * r;
    out.nx = cos4;
    out.ny = sin4;
  }

  var ptScratch = { x: 0, y: 0, nx: 0, ny: 0 };
  var boltPtsX = new Float32Array(28);
  var boltPtsY = new Float32Array(28);

  function emitSparkFromPoint(slot, x, y, nx, ny, boost) {
    var maxSparkCount = perfTier === 'ultra' ? MAX_SPARKS : 6;
    for (var sIdx = 0; sIdx < maxSparkCount; sIdx++) {
      var sp = slot.sparks[sIdx];
      if (!sp.active) {
        sp.active = true;
        sp.x = x;
        sp.y = y;
        sp.prevX = x;
        sp.prevY = y;
        var outSpeed = (14 + Math.random() * 24) * (boost ? 1.25 : 1);
        var tangentSign = Math.random() < 0.5 ? -1 : 1;
        var tangentSpeed = tangentSign * (8 + Math.random() * 16);
        sp.vx = nx * outSpeed - ny * tangentSpeed + (Math.random() - 0.5) * 10;
        sp.vy = ny * outSpeed + nx * tangentSpeed + (Math.random() - 0.5) * 10;
        sp.life = 0;
        sp.maxLife = 0.28 + Math.random() * 0.28;
        sp.size = 1.0 + Math.random() * 1.35;
        break;
      }
    }
  }

  function drawElectricArcSpan(ctx, slot, rectX, rectY, rectW, rectH, radius, startT, spanT, seedOffset, alpha, spawnSparks) {
    var steps = perfTier === 'ultra' ? 22 : 16;
    var jitterMag = 5.0;
    var headNx = 0;
    var headNy = -1;

    for (var i = 0; i <= steps; i++) {
      var frac = i / steps;
      var t = startT + frac * spanT;
      sampleRoundedRectPerimeter(t, rectX, rectY, rectW, rectH, radius, ptScratch);

      var edgeFade = Math.sin(frac * Math.PI);
      var seed = slot.jitterCurr[(i + seedOffset) % JITTER_COUNT];
      var disp = seed * jitterMag * (0.22 + 0.78 * edgeFade);

      boltPtsX[i] = ptScratch.x + ptScratch.nx * disp;
      boltPtsY[i] = ptScratch.y + ptScratch.ny * disp;

      if (i === steps) {
        headNx = ptScratch.nx;
        headNy = ptScratch.ny;
      }

      if (spawnSparks && i > 1 && i < steps - 1 && Math.random() < (perfTier === 'ultra' ? 0.055 : 0.032)) {
        emitSparkFromPoint(slot, boltPtsX[i], boltPtsY[i], ptScratch.nx, ptScratch.ny, slot.flashAmp > 0.6);
      }
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Pass 1: Soft outer amber aura (fast multi-stroke alternative to shadowBlur)
    ctx.beginPath();
    ctx.moveTo(boltPtsX[0], boltPtsY[0]);
    for (var p1 = 1; p1 <= steps; p1++) {
      ctx.lineTo(boltPtsX[p1], boltPtsY[p1]);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, ' + (0.22 * alpha).toFixed(3) + ')';
    ctx.lineWidth = 6.5;
    ctx.stroke();

    // Pass 2: Rich metallic gold arc body
    ctx.strokeStyle = 'rgba(251, 191, 36, ' + (0.74 * alpha).toFixed(3) + ')';
    ctx.lineWidth = 2.35;
    ctx.stroke();

    // Pass 3: Bright white-gold electric core
    ctx.strokeStyle = 'rgba(254, 249, 195, ' + (0.96 * alpha).toFixed(3) + ')';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Traveling golden electric flash node at the moving head of the arc
    var hx = boltPtsX[steps];
    var hy = boltPtsY[steps];
    var flashScale = 0.7 + 0.55 * slot.flashAmp;
    ctx.fillStyle = 'rgba(251, 191, 36, ' + (0.34 * alpha).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(hx, hy, 5.2 * flashScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(254, 249, 195, ' + (0.92 * alpha).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(hx, hy, 1.9 * flashScale, 0, Math.PI * 2);
    ctx.fill();

    if (spawnSparks && slot.flashAmp > 0.62 && Math.random() < 0.24) {
      emitSparkFromPoint(slot, hx, hy, headNx, headNy, true);
    }

    // Subtle organic fork filament during higher flash pulses
    if (alpha > 0.42 && slot.flashAmp > 0.52) {
      var forkIdx = Math.floor(steps * 0.48);
      var fx = boltPtsX[forkIdx];
      var fy = boltPtsY[forkIdx];
      var ang =
        Math.atan2(boltPtsY[forkIdx + 1] - fy, boltPtsX[forkIdx + 1] - fx) +
        (seedOffset % 2 === 0 ? 0.62 : -0.62);
      var midX = fx + Math.cos(ang) * 7.2;
      var midY = fy + Math.sin(ang) * 7.2;
      var endX = midX + Math.cos(ang + (Math.random() - 0.5) * 0.6) * 6.0;
      var endY = midY + Math.sin(ang + (Math.random() - 0.5) * 0.6) * 6.0;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(midX, midY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.68 * alpha).toFixed(3) + ')';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function renderSlot(slot, dtSec, now) {
    if (!slot.card || !slot.ctx) return false;
    if (!slot.card.isConnected) {
      detachSlot(slot);
      return false;
    }

    var opacityRate = slot.targetOpacity > slot.opacity ? 3.8 : 2.3;
    slot.opacity += (slot.targetOpacity - slot.opacity) * Math.min(1, dtSec * opacityRate);

    if (slot.targetOpacity === 0 && slot.opacity < 0.025) {
      detachSlot(slot);
      return false;
    }

    var ctx = slot.ctx;
    var w = slot.w;
    var h = slot.h;
    if (!w || !h) return true;

    ctx.clearRect(0, 0, w, h);

    // Refresh organic jitter targets periodically and interpolate smoothly each frame
    if (now - slot.lastJitterAt > 95) {
      slot.lastJitterAt = now;
      refreshJitterTargets(slot);
    }

    var lerpAmt = Math.min(1, dtSec * 14);
    for (var j = 0; j < JITTER_COUNT; j++) {
      slot.jitterCurr[j] += (slot.jitterTarget[j] - slot.jitterCurr[j]) * lerpAmt;
    }
    slot.flashAmp += (slot.flashTarget - slot.flashAmp) * Math.min(1, dtSec * 9);

    // Fluid, non-uniform organic arc velocity around the perimeter
    var tSec = now * 0.001;
    var driftA = 0.72 + 0.45 * Math.sin(tSec * 1.45 + slot.phase);
    var driftB = 0.72 + 0.45 * Math.cos(tSec * 1.18 + slot.phase * 1.3);
    slot.arcOffsetA = (slot.arcOffsetA + slot.arcSpeedA * driftA * dtSec + 1) % 1;
    slot.arcOffsetB = (slot.arcOffsetB + slot.arcSpeedB * driftB * dtSec + 1) % 1;

    var pad = 10;
    var rectX = pad;
    var rectY = pad;
    var rectW = w - pad * 2;
    var rectH = h - pad * 2;
    var radius = 24;

    var flicker = 0.74 + 0.26 * slot.flashAmp;
    var alpha = Math.max(0, Math.min(1, slot.opacity * flicker));
    var allowSparks = slot.targetOpacity > 0.5;

    drawElectricArcSpan(ctx, slot, rectX, rectY, rectW, rectH, radius, slot.arcOffsetA, 0.34, 0, alpha, allowSparks);
    drawElectricArcSpan(ctx, slot, rectX, rectY, rectW, rectH, radius, slot.arcOffsetB, 0.26, 11, alpha * 0.88, allowSparks);

    if (perfTier === 'ultra' && slot.flashAmp > 0.62) {
      drawElectricArcSpan(
        ctx,
        slot,
        rectX,
        rectY,
        rectW,
        rectH,
        radius,
        (slot.arcOffsetA + 0.62) % 1,
        0.16,
        21,
        alpha * 0.72,
        false
      );
    }

    // Update and draw smooth golden micro-trail sparks
    var maxSparkCount = perfTier === 'ultra' ? MAX_SPARKS : 6;
    for (var i = 0; i < maxSparkCount; i++) {
      var sp = slot.sparks[i];
      if (!sp.active) continue;
      sp.life += dtSec;
      if (sp.life >= sp.maxLife) {
        sp.active = false;
        continue;
      }
      sp.prevX = sp.x;
      sp.prevY = sp.y;
      sp.x += sp.vx * dtSec;
      sp.y += sp.vy * dtSec;
      sp.vx *= 0.93;
      sp.vy *= 0.93;

      var lifeRatio = 1 - sp.life / sp.maxLife;
      var sAlpha = lifeRatio * slot.opacity;

      // Tiny spark streak
      ctx.strokeStyle = 'rgba(253, 224, 71, ' + (0.55 * sAlpha).toFixed(3) + ')';
      ctx.lineWidth = sp.size * 0.85;
      ctx.beginPath();
      ctx.moveTo(sp.prevX, sp.prevY);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();

      // Outer spark halo
      ctx.fillStyle = 'rgba(251, 191, 36, ' + (0.42 * sAlpha).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Hot spark core
      ctx.fillStyle = 'rgba(254, 249, 195, ' + (0.96 * sAlpha).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    return true;
  }

  function pickNextVisibleCard() {
    var candidates = [];
    visibleCards.forEach(function (card) {
      if (card.isConnected) {
        candidates.push(card);
      } else {
        visibleCards.delete(card);
      }
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    var filtered = candidates.filter(function (c) {
      return c !== slotPrimary.card;
    });
    var pool = filtered.length > 0 ? filtered : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  var TRANSFER_MIN_MS = 2200;
  var TRANSFER_MAX_MS = 4300;
  var TARGET_FPS_ULTRA = 60;
  var TARGET_FPS_BALANCED = 30;

  function nextRandomTransferDelay() {
    return TRANSFER_MIN_MS + Math.random() * (TRANSFER_MAX_MS - TRANSFER_MIN_MS);
  }

  function getTargetFps() {
    if (perfTier === 'lite') return 0;
    return perfTier === 'ultra' ? TARGET_FPS_ULTRA : TARGET_FPS_BALANCED;
  }

  function transferElectricEffect(now) {
    var nextCard = pickNextVisibleCard();
    if (!nextCard) {
      if (slotPrimary.card) {
        slotPrimary.card.classList.remove('salim-ch-card-energized');
        slotPrimary.targetOpacity = 0;
      }
      nextTransferAt = now + 900;
      return;
    }

    if (nextCard === slotPrimary.card) {
      nextTransferAt = now + nextRandomTransferDelay();
      return;
    }

    if (slotPrimary.card && slotPrimary.card.isConnected) {
      detachSlot(slotFading);
      var temp = slotFading;
      slotFading = slotPrimary;
      slotPrimary = temp;
      slotFading.card.classList.remove('salim-ch-card-energized');
      slotFading.targetOpacity = 0;
    } else {
      detachSlot(slotPrimary);
    }

    if (perfTier === 'lite') {
      if (slotFading.card) {
        slotFading.card.classList.remove('salim-ch-card-energized');
        slotFading.card = null;
      }
      slotPrimary.card = nextCard;
      nextCard.classList.add('salim-ch-card-energized');
    } else {
      attachSlot(slotPrimary, nextCard);
    }

    nextTransferAt = now + nextRandomTransferDelay();
  }

  function stopElectricLoop() {
    if (rafLoopId) {
      cancelAnimationFrame(rafLoopId);
      rafLoopId = 0;
    }
    detachSlot(slotPrimary);
    detachSlot(slotFading);
  }

  var liteIntervalId = 0;

  function stopLiteLoop() {
    if (liteIntervalId) {
      clearInterval(liteIntervalId);
      liteIntervalId = 0;
    }
    if (slotPrimary.card) {
      slotPrimary.card.classList.remove('salim-ch-card-energized');
      slotPrimary.card = null;
    }
  }

  function electricTick(now) {
    rafLoopId = 0;
    if (!stagePresent || document.hidden || perfTier === 'lite') {
      stopElectricLoop();
      return;
    }

    // Never update cards that scrolled outside the viewport
    if (slotFading.card && !visibleCards.has(slotFading.card)) {
      detachSlot(slotFading);
    }
    if (slotPrimary.card && !visibleCards.has(slotPrimary.card)) {
      slotPrimary.card.classList.remove('salim-ch-card-energized');
      if (visibleCards.size === 0) {
        detachSlot(slotPrimary);
      } else {
        transferElectricEffect(now);
      }
    }

    // Suspend rAF completely when 0 cards are visible in the viewport
    if (visibleCards.size === 0 && !slotPrimary.card && !slotFading.card) {
      lastFrameTs = 0;
      return;
    }

    var targetFps = getTargetFps();
    var minFrameMs = 1000 / Math.max(30, Math.min(60, targetFps));
    if (!lastFrameTs || now - lastFrameTs >= minFrameMs - 0.5) {
      var dtSec = lastFrameTs ? Math.min(0.08, (now - lastFrameTs) / 1000) : minFrameMs / 1000;
      lastFrameTs = now;

      if (!slotPrimary.card && visibleCards.size > 0) {
        transferElectricEffect(now);
      } else if (now >= nextTransferAt) {
        transferElectricEffect(now);
      }

      renderSlot(slotFading, dtSec, now);
      renderSlot(slotPrimary, dtSec, now);
    }

    if (visibleCards.size > 0 || slotPrimary.card || slotFading.card) {
      rafLoopId = requestAnimationFrame(electricTick);
    }
  }

  function startElectricEngine() {
    if (!stagePresent || document.hidden) return;

    if (perfTier === 'lite') {
      stopElectricLoop();
      if (!liteIntervalId && visibleCards.size > 0) {
        transferElectricEffect(performance.now());
        liteIntervalId = setInterval(function () {
          if (stagePresent && !document.hidden && visibleCards.size > 0) {
            transferElectricEffect(performance.now());
          }
        }, 3200);
      }
      return;
    }

    stopLiteLoop();
    if (!rafLoopId && (visibleCards.size > 0 || slotPrimary.card || slotFading.card)) {
      lastFrameTs = 0;
      if (!nextTransferAt) {
        nextTransferAt = performance.now() + 240;
      }
      rafLoopId = requestAnimationFrame(electricTick);
    }
  }

  function observeVisibleChannelCards() {
    var grid = document.querySelector('.salim-channels-grid');
    if (!grid) {
      visibleCards.clear();
      observedGrid = null;
      return;
    }

    if (!cardObserver) {
      cardObserver = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (entry.isIntersecting) {
              visibleCards.add(entry.target);
            } else {
              visibleCards.delete(entry.target);
            }
          }
          if (stagePresent && !document.hidden) {
            if (visibleCards.size > 0) {
              startElectricEngine();
            } else if (slotPrimary.card && !visibleCards.has(slotPrimary.card)) {
              detachSlot(slotPrimary);
            }
          }
        },
        { threshold: 0.15 }
      );
    }

    // Prune disconnected cards without wiping currently visible ones
    visibleCards.forEach(function (c) {
      if (!c.isConnected) {
        visibleCards.delete(c);
      }
    });

    var cards = grid.querySelectorAll('.salim-ch-card[data-salim-ch-id]');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (!observedCards || !observedCards.has(card)) {
        if (observedCards) observedCards.add(card);
        cardObserver.observe(card);
      }
    }

    if (!gridResizeObserver && typeof ResizeObserver === 'function') {
      gridResizeObserver = new ResizeObserver(function () {
        if (slotPrimary.card) syncCanvasSize(slotPrimary);
        if (slotFading.card) syncCanvasSize(slotFading);
      });
    }
    if (gridResizeObserver && observedGrid !== grid) {
      gridResizeObserver.disconnect();
      gridResizeObserver.observe(grid);
      observedGrid = grid;
    }
  }

  /* ------------------------------------------------------------------------
   * 4. LIFECYCLE SYNC (MOUNT / UNMOUNT / VISIBILITY)
   * ------------------------------------------------------------------------ */
  var syncScheduled = false;

  function syncDomState() {
    syncScheduled = false;
    var stage = document.querySelector('.salim-channels-stage');
    var nextPresent = Boolean(stage);

    if (nextPresent !== stagePresent) {
      stagePresent = nextPresent;
      if (!stagePresent) {
        visibleCards.clear();
        observedGrid = null;
        observedCards = typeof WeakSet === 'function' ? new WeakSet() : null;
        if (cardObserver) cardObserver.disconnect();
        if (gridResizeObserver) gridResizeObserver.disconnect();
        stopElectricLoop();
        stopLiteLoop();
      }
    }

    if (stagePresent) {
      observeVisibleChannelCards();
      startElectricEngine();
    }

    scheduleNavUpdate(false);
  }

  function scheduleSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(syncDomState);
  }

  var rootObserver = new MutationObserver(function () {
    scheduleSync();
  });

  function init() {
    var rootEl = document.getElementById('root') || document.body;
    if (rootEl) {
      rootObserver.observe(rootEl, { childList: true, subtree: true });
    }
    syncDomState();
    scheduleNavUpdate(true);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopElectricLoop();
      stopLiteLoop();
    } else if (stagePresent) {
      startElectricEngine();
    }
  });

  if (typeof window !== 'undefined') {
    window.__SalimChannelsFx = {
      getTier: function () {
        return perfTier;
      },
      getTargetFps: getTargetFps,
      getVisibleCount: function () {
        return visibleCards.size;
      },
      isRunning: function () {
        return Boolean(rafLoopId || liteIntervalId);
      },
      getActiveCardId: function () {
        return slotPrimary.card ? slotPrimary.card.getAttribute('data-salim-ch-id') : null;
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
