import { POSE_KEYS, samplePose } from "./galaxyPose";

const EPSILON = 1e-3;
const CSS_STEP = 0.001;
const NAV_OFFSET = 64;
const FADED_AT = 0.4;
// 페이드가 시작되기 전(0.1 이하)에는 텍스트가 보이므로 되돌리지 않는다.
const REFOCUS_AFTER = 0.1;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const WIDE_QUERY = "(min-width: 1024px)";

const subscribers = new Set();
let invalidateFn = null;
let teardown = null;
let scrollListeners = 0;

export const rig = {
  mode: "flow",
  heroStart: 0,
  heroEnd: 0,
  vh: 0,
  width: 0,
  wide: false,
  maxScroll: 0,
  aspect: 1,
  scrollY: 0,
  heroP: 0,
  measured: false,
  target: null,
  current: null,
  settled: false,
  navScrolled: false,
  subscribe: (cb) => {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },
};

// 디버그·검증용 카운터. CameraRig가 frames와 projectedWidth를 채운다.
export const galaxyDebug = {
  frames: 0,
  projectedWidth: () => null,
};

export const setInvalidate = (fn) => {
  invalidateFn = fn;
};

const notify = () => {
  subscribers.forEach((cb) => cb(rig));
};

const changedBeyond = (previous, next) =>
  !previous ||
  POSE_KEYS.some((key) => Math.abs(previous[key] - next[key]) >= EPSILON);

const shouldWrite = (previous, next) =>
  previous === null ||
  Math.abs(next - previous) >= CSS_STEP ||
  (next !== previous && (next === 0 || next === 1));

const installDebug = () => {
  if (typeof window === "undefined") return;
  const enabled =
    import.meta.env.DEV || window.location.search.includes("galaxyDebug");
  if (!enabled || window.__galaxy) return;

  window.__galaxy = {
    rig,
    get frames() {
      return galaxyDebug.frames;
    },
    get listeners() {
      return scrollListeners;
    },
    projectedWidth: () => galaxyDebug.projectedWidth(),
  };
};

export const mountScrollRig = ({ track, stage }) => {
  if (teardown) teardown();
  installDebug();

  const reducedQuery = window.matchMedia(REDUCED_QUERY);
  const wideQuery = window.matchMedia(WIDE_QUERY);
  const layer = document.querySelector(".galaxy-layer");
  const veilElement = document.querySelector(".galaxy-veil");
  let frame = 0;
  let needsMeasure = true;
  let lastNotifiedTarget = null;
  let lastHeroP = null;
  let lastVeil = null;
  let lastScrolled = null;
  let fadedOn = false;

  const setFaded = (on) => {
    if (on === fadedOn) return;
    fadedOn = on;
    stage.toggleAttribute("data-hero-faded", on);
    // 투명해진 링크에 포커스가 남지 않게 한다(남아 있으면 탭 복귀 때 포커스 복원으로 다시 잡힌다).
    const focused = document.activeElement;
    if (on && focused instanceof HTMLElement && focused.closest("[data-hero-fade]")) {
      focused.blur();
    }
  };

  const measure = () => {
    const scrollY = window.scrollY;
    const mode =
      getComputedStyle(stage).position === "sticky"
        ? "pinned"
        : reducedQuery.matches
          ? "reduced"
          : "flow";
    const heroStart = track.getBoundingClientRect().top + scrollY;
    const heroEnd =
      mode === "pinned"
        ? heroStart + track.offsetHeight - stage.offsetHeight
        : heroStart + track.offsetHeight;
    const vh = (layer && layer.offsetHeight) || window.innerHeight;
    const width = (layer && layer.offsetWidth) || window.innerWidth;
    // 치우침 방향은 CSS 미디어쿼리와 같은 기준(스크롤바 포함 폭)으로 정한다.
    const wide = wideQuery.matches;
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );

    const changed =
      !rig.measured ||
      mode !== rig.mode ||
      heroStart !== rig.heroStart ||
      heroEnd !== rig.heroEnd ||
      vh !== rig.vh ||
      width !== rig.width ||
      wide !== rig.wide ||
      maxScroll !== rig.maxScroll;

    if (!changed) return false;

    Object.assign(rig, {
      mode,
      heroStart,
      heroEnd,
      vh,
      width,
      wide,
      maxScroll,
      aspect: vh > 0 ? width / vh : 1,
      measured: true,
    });
    return true;
  };

  const update = (measuredChanged) => {
    const scrollY = window.scrollY;
    const span = rig.heroEnd - rig.heroStart;
    const heroP =
      span > 0
        ? Math.min(Math.max((scrollY - rig.heroStart) / span, 0), 1)
        : scrollY > rig.heroStart
          ? 1
          : 0;

    rig.scrollY = scrollY;
    rig.heroP = heroP;
    rig.target = samplePose({
      scrollY,
      heroStart: rig.heroStart,
      heroEnd: rig.heroEnd,
      vh: rig.vh,
      maxScroll: rig.maxScroll,
      aspect: rig.aspect,
      mode: rig.mode,
      wide: rig.wide,
    });

    if (shouldWrite(lastHeroP, heroP)) {
      lastHeroP = heroP;
      stage.style.setProperty("--hero-p", heroP.toFixed(4));
    }

    const veil = rig.target.veil;
    if (shouldWrite(lastVeil, veil)) {
      lastVeil = veil;
      if (veilElement) veilElement.style.setProperty("--veil", veil.toFixed(4));
    }

    setFaded(rig.mode === "pinned" && heroP >= FADED_AT);

    if (changedBeyond(lastNotifiedTarget, rig.target)) {
      lastNotifiedTarget = rig.target;
      if (invalidateFn) {
        rig.settled = false;
        invalidateFn();
      }
    }

    const threshold =
      rig.mode === "pinned" ? rig.heroEnd - NAV_OFFSET : NAV_OFFSET;
    const scrolled = scrollY > threshold;
    rig.navScrolled = scrolled;
    if (measuredChanged || scrolled !== lastScrolled) {
      lastScrolled = scrolled;
      notify();
    }
  };

  const run = () => {
    frame = 0;
    const measuredChanged = needsMeasure ? measure() : false;
    needsMeasure = false;
    update(measuredChanged);
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(run);
  };

  const requestMeasure = () => {
    needsMeasure = true;
    schedule();
  };

  const onScroll = () => schedule();

  // 페이드된 Hero로 포커스가 들어오면 텍스트가 보이는 인트로 시작 위치로 되돌린다.
  const onFocusIn = (event) => {
    if (rig.mode !== "pinned" || rig.heroP <= REFOCUS_AFTER) return;
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest("[data-hero-fade]")) return;
    // 마우스 클릭이나 포커스 복원으로 들어온 포커스는 제외하고 키보드 탐색일 때만 되돌린다.
    if (!event.target.matches(":focus-visible")) return;
    window.scrollTo({ top: rig.heroStart });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  scrollListeners += 1;
  window.addEventListener("resize", requestMeasure);
  reducedQuery.addEventListener("change", requestMeasure);
  wideQuery.addEventListener("change", requestMeasure);
  stage.addEventListener("focusin", onFocusIn);

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(requestMeasure);
  if (resizeObserver) resizeObserver.observe(document.documentElement);

  let active = true;
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (active) requestMeasure();
    });
  }

  run();

  const dispose = () => {
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener("scroll", onScroll);
    scrollListeners -= 1;
    window.removeEventListener("resize", requestMeasure);
    reducedQuery.removeEventListener("change", requestMeasure);
    wideQuery.removeEventListener("change", requestMeasure);
    stage.removeEventListener("focusin", onFocusIn);
    if (resizeObserver) resizeObserver.disconnect();
    setFaded(false);
    if (teardown === dispose) teardown = null;
  };

  teardown = dispose;
  return dispose;
};
