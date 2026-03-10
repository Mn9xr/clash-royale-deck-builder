const TILT_SELECTORS = [
  ".motion-tilt",
  ".deck-slot",
  ".coach-deck-card",
  ".profile-stat",
  ".stat-card",
  ".explorer-deck-card",
  ".status-tile",
  ".deck-modal-card",
  ".catalog-insights",
  ".insight-metric-card"
].join(", ");

const SPOTLIGHT_SELECTORS = [
  ".panel",
  ".collection-box",
  ".profile-box",
  ".owned-cards-box",
  ".one-tap-wrap",
  ".coach-results-wrap",
  ".analysis-wrap",
  ".comparison-wrap",
  ".history-wrap",
  ".pinned-wrap",
  ".status-panel",
  ".explorer-panel",
  ".status-activity-wrap",
  ".deck-modal-card"
].join(", ");

const REVEAL_SELECTORS = [
  ".hero",
  ".panel",
  ".collection-box",
  ".profile-box",
  ".owned-cards-box",
  ".one-tap-wrap",
  ".coach-results-wrap",
  ".analysis-wrap",
  ".comparison-wrap",
  ".history-wrap",
  ".pinned-wrap",
  ".status-panel",
  ".explorer-panel",
  ".project-footer"
].join(", ");

const STAGGER_GROUPS = [
  ["#deckSlots", ".deck-slot"],
  ["#suggestionList", ".suggestion-item"],
  ["#ownedCardsGrid", ".owned-card-item"],
  ["#coachDeckCards", ".coach-deck-card"],
  ["#historyList", ".history-item"],
  ["#deckExplorerGrid", ".explorer-deck-card"],
  ["#statusActivityList", ".status-activity-item"],
  ["#catalogQuickFilters", ".quick-filter-chip"]
];

const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");

let initialized = false;
let revealObserver = null;
let parallaxTargets = [];
let parallaxPointerX = 0;
let parallaxPointerY = 0;
let parallaxRafId = 0;

function reducedMotionEnabled() {
  return reducedMotionMedia.matches;
}

function pointerEffectsEnabled() {
  return !reducedMotionEnabled() && finePointerMedia.matches;
}

function listenToMedia(mediaQuery, handler) {
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handler);
    return;
  }
  mediaQuery.addListener(handler);
}

function markMotionMode() {
  document.body.classList.toggle("motion-enabled", pointerEffectsEnabled());
  document.body.classList.toggle("motion-reduced", reducedMotionEnabled());
}

function resetTilt(el) {
  el.style.setProperty("--tilt-rx", "0deg");
  el.style.setProperty("--tilt-ry", "0deg");
  el.style.setProperty("--tilt-tx", "0px");
  el.style.setProperty("--tilt-ty", "0px");
  el.classList.remove("is-tilting");
}

function bindTilt(el) {
  if (el.dataset.motionTiltBound === "1") {
    return;
  }
  el.dataset.motionTiltBound = "1";
  el.classList.add("tilt-surface");

  let rafId = 0;
  let rx = 0;
  let ry = 0;
  let tx = 0;
  let ty = 0;

  const apply = () => {
    rafId = 0;
    el.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
    el.style.setProperty("--tilt-tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--tilt-ty", `${ty.toFixed(2)}px`);
  };

  const onPointerMove = (event) => {
    if (!pointerEffectsEnabled()) {
      resetTilt(el);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;

    ry = nx * 5.5;
    rx = -ny * 5.5;
    tx = nx * 3;
    ty = ny * 3;

    el.classList.add("is-tilting");
    if (!rafId) {
      rafId = window.requestAnimationFrame(apply);
    }
  };

  const onPointerLeave = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    resetTilt(el);
  };

  el.addEventListener("pointermove", onPointerMove, { passive: true });
  el.addEventListener("pointerenter", onPointerMove, { passive: true });
  el.addEventListener("pointerleave", onPointerLeave);

  if (!pointerEffectsEnabled()) {
    resetTilt(el);
  }
}

function bindSpotlight(el) {
  if (el.dataset.motionSpotlightBound === "1") {
    return;
  }
  el.dataset.motionSpotlightBound = "1";
  el.classList.add("spotlight-surface");

  const move = (event) => {
    if (!pointerEffectsEnabled()) {
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    el.style.setProperty("--spot-x", `${x.toFixed(1)}px`);
    el.style.setProperty("--spot-y", `${y.toFixed(1)}px`);
    el.classList.add("spotlight-active");
  };

  const leave = () => {
    el.classList.remove("spotlight-active");
  };

  el.addEventListener("pointermove", move, { passive: true });
  el.addEventListener("pointerenter", move, { passive: true });
  el.addEventListener("pointerleave", leave);
}

function ensureRevealObserver() {
  if (reducedMotionEnabled()) {
    revealObserver?.disconnect();
    revealObserver = null;
    return;
  }

  if (revealObserver) {
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver?.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
  );
}

function bindReveal(el, index) {
  if (el.dataset.motionRevealBound === "1") {
    return;
  }

  el.dataset.motionRevealBound = "1";
  el.classList.add("reveal-item");
  el.style.setProperty("--reveal-delay", `${Math.min((index % 7) * 45, 270)}ms`);

  if (reducedMotionEnabled()) {
    el.classList.add("is-visible");
    return;
  }

  ensureRevealObserver();
  revealObserver?.observe(el);
}

function applyStagger(containerSelector, childSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return;
  }

  const children = container.querySelectorAll(childSelector);
  children.forEach((child, idx) => {
    child.classList.remove("stagger-item");
    child.style.removeProperty("--stagger-delay");
    // Force animation restart for dynamic lists.
    void child.offsetWidth;
    child.classList.add("stagger-item");
    child.style.setProperty("--stagger-delay", `${Math.min(idx * 26, 260)}ms`);

    if (reducedMotionEnabled()) {
      child.classList.add("is-visible");
    }
  });
}

function applyParallaxFrame() {
  parallaxRafId = 0;
  const x = (parallaxPointerX - 0.5) * 2;
  const y = (parallaxPointerY - 0.5) * 2;

  for (const target of parallaxTargets) {
    const depth = Number(target.dataset.parallaxDepth || 1);
    const px = x * depth * 2.8;
    const py = y * depth * 2.2;
    target.style.setProperty("--parallax-x", `${px.toFixed(2)}px`);
    target.style.setProperty("--parallax-y", `${py.toFixed(2)}px`);
  }
}

function onParallaxPointerMove(event) {
  if (!pointerEffectsEnabled()) {
    return;
  }

  parallaxPointerX = event.clientX / window.innerWidth;
  parallaxPointerY = event.clientY / window.innerHeight;

  if (!parallaxRafId) {
    parallaxRafId = window.requestAnimationFrame(applyParallaxFrame);
  }
}

function resetParallax() {
  for (const target of parallaxTargets) {
    target.style.setProperty("--parallax-x", "0px");
    target.style.setProperty("--parallax-y", "0px");
  }
}

function bindParallaxTargets() {
  parallaxTargets = Array.from(document.querySelectorAll(".hero, .panel, .project-footer"));
  parallaxTargets.forEach((target, index) => {
    target.classList.add("parallax-surface");
    target.dataset.parallaxDepth = String(1 + ((index % 4) * 0.18));
  });

  if (!pointerEffectsEnabled()) {
    resetParallax();
  }
}

function bindMotionTargets() {
  document.querySelectorAll(TILT_SELECTORS).forEach(bindTilt);
  document.querySelectorAll(SPOTLIGHT_SELECTORS).forEach(bindSpotlight);

  const revealTargets = document.querySelectorAll(REVEAL_SELECTORS);
  revealTargets.forEach((el, index) => bindReveal(el, index));

  STAGGER_GROUPS.forEach(([container, child]) => applyStagger(container, child));
}

function handleMediaModeChange() {
  markMotionMode();
  if (!pointerEffectsEnabled()) {
    resetParallax();
  }
  refreshInteractiveMotion();
}

export function refreshInteractiveMotion() {
  bindParallaxTargets();
  bindMotionTargets();
}

export function initializeInteractiveMotion() {
  if (initialized) {
    return;
  }
  initialized = true;

  markMotionMode();

  listenToMedia(reducedMotionMedia, handleMediaModeChange);
  listenToMedia(finePointerMedia, handleMediaModeChange);

  window.addEventListener("pointermove", onParallaxPointerMove, { passive: true });
  window.addEventListener("pointerleave", resetParallax);

  refreshInteractiveMotion();
}
