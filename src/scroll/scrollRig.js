import { POSE_KEYS, samplePose } from "./galaxyPose";
import {
  ITEM_TARGET_U,
  itemOffset,
  sampleJourney,
  panelState,
} from "./journeyPose";
import { createPlanets } from "../journey/planets";

const EPSILON = 1e-3;
const CSS_STEP = 0.001;
const NAV_OFFSET = 64;
const FADED_AT = 0.4;
// 페이드가 시작되기 전(0.1 이하)에는 텍스트가 보이므로 되돌리지 않는다.
const REFOCUS_AFTER = 0.1;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const WIDE_QUERY = "(min-width: 1024px)";
// 항해 화면 구성 기준: 768px 이상이면 행성 왼쪽·패널 오른쪽(1024px 미만은 mid), 미만은 위아래.
const MID_QUERY = "(min-width: 768px)";

const subscribers = new Set();
let invalidateFn = null;
let teardown = null;
let scrollListeners = 0;
let requestMeasureFn = null;
// 항해 DOM(트랙·스테이지)과 마지막 기록값. attachJourney가 채운다.
let journeyEls = null;

export const rig = {
  mode: "flow",
  heroStart: 0,
  heroEnd: 0,
  vh: 0,
  width: 0,
  wide: false,
  // 항해 화면 구성: "wide" | "mid" | "narrow"(journeyPose의 JOURNEY_VIEWS)
  journeyView: "narrow",
  maxScroll: 0,
  aspect: 1,
  scrollY: 0,
  heroP: 0,
  measured: false,
  target: null,
  current: null,
  settled: false,
  navScrolled: false,
  // 은하 셰이더의 uTime. CameraRig가 매 프레임 기록한다.
  time: 0,
  // 항해 상태: { start, end, measured, layout, planets, index, phase, t, item, u, s, ring,
  //   count(현재 챕터 위성 수), active, panel(보이는 챕터 패널|null), cardAnchor({ x, y }) }
  journey: null,
  subscribe: (cb) => {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },
};

// 디버그·검증용 카운터. CameraRig가 frames와 projectedWidth를 채운다.
export const galaxyDebug = {
  frames: 0,
  projectedWidth: () => null,
  planetScreen: () => null,
  satelliteScreens: () => [],
  frontScreen: () => null,
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
    // journey: index(챕터), phase, item(챕터 안 위성 번호, 없으면 -1), u, s, count(위성 수), active, panel
    get journey() {
      const journey = rig.journey;
      if (!journey) return null;
      return {
        index: journey.index,
        phase: journey.phase,
        item: journey.item,
        u: journey.u,
        s: journey.s,
        count: journey.count,
        active: journey.active,
        panel: journey.panel,
      };
    },
    planetScreen: () => galaxyDebug.planetScreen(),
    satelliteScreens: () => galaxyDebug.satelliteScreens(),
    frontScreen: () => galaxyDebug.frontScreen(),
  };
};

// 현재 스크롤과 time(uTime)으로 카메라 목표 pose를 계산한다.
export const computeTarget = (time = rig.time) =>
  samplePose({
    scrollY: rig.scrollY,
    heroStart: rig.heroStart,
    heroEnd: rig.heroEnd,
    vh: rig.vh,
    maxScroll: rig.maxScroll,
    aspect: rig.aspect,
    mode: rig.mode,
    wide: rig.wide,
    view: rig.journeyView,
    journey: rig.journey && rig.journey.measured ? rig.journey : null,
    time,
    shiftTime: rig.journey ? rig.journey.shiftTime : time,
  });

const journeyUnit = (journey) =>
  journey.layout.total > 0 ? (journey.end - journey.start) / journey.layout.total : 0;

// 패널·본문·도착 안내의 투명도(--k)를 쓴다. 이번 목록에 없고 직전에 보이던 요소는 0으로 내린다.
const writeGroup = (group, list) => {
  const next = new Set();
  list.forEach(({ index, k }) => {
    if (k > 0) next.add(index);
    writeK(group, index, k);
  });
  group.visible.forEach((index) => {
    if (!next.has(index)) writeK(group, index, 0);
  });
  group.visible = next;
};

const writeK = (group, index, k) => {
  const element = group.elements[index];
  if (!element || !shouldWrite(group.values[index], k)) return;
  group.values[index] = k;
  element.style.setProperty("--k", k.toFixed(3));
};

const createGroup = (elements) => ({
  elements,
  values: new Array(elements.length).fill(null),
  visible: new Set(),
});

// 반환값: 챕터·단계·위성이 바뀌었는지
const updateJourney = (scrollY) => {
  const journey = rig.journey;
  if (!journey || !journeyEls || !journey.measured) return false;

  const unit = journeyUnit(journey);
  const distance =
    unit > 0
      ? (scrollY - journey.start) / unit
      : scrollY > journey.start
        ? journey.layout.total
        : 0;
  const state = sampleJourney(journey.layout, distance);
  // 첫 이동 구간에서는 방위각 정규화 시각을 고정한다(journeyPose의 shiftTime 설명 참고).
  if (!(distance > 0 && state.index === 0 && state.phase === "travel")) {
    journey.shiftTime = rig.time;
  }
  const changed =
    state.index !== journey.index ||
    state.phase !== journey.phase ||
    state.item !== journey.item;
  const panels = panelState(journey.layout, state);
  // 고리 회전·고리 펼침은 카메라 목표와 무관하게 바뀌므로 demand 모드에서도 다시 그리게 한다.
  const sceneChanged =
    changed ||
    Math.abs(state.ring - journey.ring) > EPSILON ||
    Math.abs(state.t - journey.t) > EPSILON;
  const shownPanel = panels.panels.find((entry) => entry.k >= 0.5);
  Object.assign(journey, state, {
    count: journey.layout.segments[state.index].count,
    active: scrollY >= journey.start && scrollY <= journey.end,
    panel: shownPanel ? shownPanel.index : null,
  });

  writeGroup(journeyEls.panels, panels.panels);
  writeGroup(journeyEls.items, panels.items);
  writeGroup(journeyEls.hints, panels.hints);
  if (journey.panel !== journeyEls.activePanel) {
    const { elements } = journeyEls.panels;
    if (journeyEls.activePanel !== null) {
      elements[journeyEls.activePanel].removeAttribute("data-active");
    }
    if (journey.panel !== null) elements[journey.panel].setAttribute("data-active", "");
    journeyEls.activePanel = journey.panel;
  }

  const { stage } = journeyEls;
  // 연결선은 현재 위성 본문의 투명도를 따른다.
  const current =
    state.phase === "item"
      ? panels.items.find(
          (entry) => entry.index === journey.layout.segments[state.index].firstItem + state.item
        )
      : null;
  const lineK = current ? current.k : 0;
  if (shouldWrite(journeyEls.lineK, lineK)) {
    journeyEls.lineK = lineK;
    stage.style.setProperty("--ck", lineK.toFixed(3));
  }
  // 위성 라벨·행성 이름표는 행성에 다가갈 때 나타난다.
  const labels = state.phase === "travel" ? Math.min(Math.max((state.t - 0.75) / 0.25, 0), 1) : 1;
  if (shouldWrite(journeyEls.labels, labels)) {
    journeyEls.labels = labels;
    stage.style.setProperty("--lk", labels.toFixed(3));
    // 거의 보이지 않는 동안에는 라벨이 클릭을 받지 않게 한다.
    stage.toggleAttribute("data-labels-on", labels >= 0.5);
  }
  // 챕터 점은 첫 행성에 다가갈 때 나타난다.
  const hud = state.index === 0 ? labels : 1;
  if (shouldWrite(journeyEls.hud, hud)) {
    journeyEls.hud = hud;
    stage.style.setProperty("--hud", hud.toFixed(3));
    stage.toggleAttribute("data-journey-on", hud > 0);
  }
  if (sceneChanged && invalidateFn) {
    rig.settled = false;
    invalidateFn();
  }
  return changed;
};

// 전체 항목 번호 index의 위성으로 스크롤한다(라벨 클릭·키보드 포커스).
export const scrollToJourneyItem = (index) => {
  const journey = rig.journey;
  if (!journey || !journey.measured) return;
  const segment = journey.layout.segments.find(
    (entry) => index >= entry.firstItem && index < entry.firstItem + entry.count
  );
  if (!segment) return;
  const offset = itemOffset(segment, index - segment.firstItem, ITEM_TARGET_U);
  window.scrollTo({ top: journey.start + offset * journeyUnit(journey) });
};

const chapterOf = (index) =>
  rig.journey.layout.segments.findIndex(
    (entry) => index >= entry.firstItem && index < entry.firstItem + entry.count
  );

// 키보드 포커스가 다른 챕터의 라벨·목차로 들어오면 그 위성 위치로 스크롤한다
// (현재 챕터 안에서 Tab으로 목차를 훑을 때는 움직이지 않는다).
const onJourneyFocusIn = (event) => {
  const journey = rig.journey;
  if (!journey || !journey.measured) return;
  if (!(event.target instanceof Element)) return;
  if (!event.target.matches(":focus-visible")) return;
  const owner = event.target.closest("[data-journey-index]");
  if (!owner) return;
  const index = Number(owner.getAttribute("data-journey-index"));
  if (chapterOf(index) !== journey.index || journey.phase === "travel") {
    scrollToJourneyItem(index);
  }
};

// 페이지 수명 동안 한 번만 실행한다. 항해가 다시 붙을 때(모드 전환·컨텍스트 복구)는
// 예전 해시가 읽던 섹션 복원을 덮어쓰면 안 된다.
let hashJumped = false;
const jumpToJourneyHash = () => {
  if (hashJumped) return;
  hashJumped = true;
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (target && target.classList.contains("journey-anchor")) {
    target.scrollIntoView({ behavior: "instant" });
  }
};

// 패널 영역 기준 연결선 끝점(스테이지 좌표). 넓은 화면은 패널 왼쪽 가운데, 좁은 화면은 위쪽 가운데.
const measureCardAnchor = (region, side) =>
  side
    ? { x: region.offsetLeft, y: region.offsetTop + region.offsetHeight / 2 }
    : { x: region.offsetLeft + region.offsetWidth / 2, y: region.offsetTop };

// panels: 챕터 패널, items: 항목 순서의 본문, hints: 챕터별 도착 안내, region: 패널 영역
export const attachJourney = ({ track, stage, panels, items, hints, region, layout }) => {
  const own = {
    track,
    stage,
    region,
    panels: createGroup(panels),
    items: createGroup(items),
    hints: createGroup(hints),
    activePanel: null,
    lineK: null,
    labels: null,
    hud: null,
  };
  journeyEls = own;
  rig.journey = {
    start: 0,
    end: 0,
    measured: false,
    layout,
    planets: createPlanets(layout.segments.length),
    index: 0,
    phase: "travel",
    t: 0,
    item: -1,
    u: 0,
    s: 0,
    ring: 0,
    count: layout.segments.length ? layout.segments[0].count : 0,
    active: false,
    panel: null,
    cardAnchor: { x: 0, y: 0 },
    shiftTime: rig.time,
  };
  stage.addEventListener("focusin", onJourneyFocusIn);
  if (requestMeasureFn) requestMeasureFn();

  return () => {
    stage.removeEventListener("focusin", onJourneyFocusIn);
    if (journeyEls !== own) return;
    journeyEls = null;
    rig.journey = null;
    if (requestMeasureFn) requestMeasureFn();
    notify();
  };
};

export const mountScrollRig = ({ track, stage }) => {
  if (teardown) teardown();
  installDebug();

  const reducedQuery = window.matchMedia(REDUCED_QUERY);
  const wideQuery = window.matchMedia(WIDE_QUERY);
  const midQuery = window.matchMedia(MID_QUERY);
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
    const journeyView = wide ? "wide" : midQuery.matches ? "mid" : "narrow";
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const journey = journeyEls ? rig.journey : null;
    let journeyStart = 0;
    let journeyEnd = 0;
    if (journey) {
      journeyStart = journeyEls.track.getBoundingClientRect().top + scrollY;
      journeyEnd =
        journeyStart + journeyEls.track.offsetHeight - journeyEls.stage.offsetHeight;
    }

    const changed =
      !rig.measured ||
      mode !== rig.mode ||
      heroStart !== rig.heroStart ||
      heroEnd !== rig.heroEnd ||
      vh !== rig.vh ||
      width !== rig.width ||
      wide !== rig.wide ||
      journeyView !== rig.journeyView ||
      maxScroll !== rig.maxScroll ||
      (journey !== null &&
        (!journey.measured ||
          journeyStart !== journey.start ||
          journeyEnd !== journey.end));

    if (!changed) return false;

    const firstJourneyMeasure = journey !== null && !journey.measured;
    if (journey) {
      Object.assign(journey, {
        start: journeyStart,
        end: Math.max(journeyEnd, journeyStart),
        measured: true,
        cardAnchor: measureCardAnchor(journeyEls.region, journeyView !== "narrow"),
      });
    }

    Object.assign(rig, {
      mode,
      heroStart,
      heroEnd,
      vh,
      width,
      wide,
      journeyView,
      maxScroll,
      aspect: vh > 0 ? width / vh : 1,
      measured: true,
    });
    // 항해는 lazy로 붙으므로 해시(#about 등)로 들어온 경우 첫 측정 뒤에 한 번 다시 맞춘다.
    if (firstJourneyMeasure) window.requestAnimationFrame(jumpToJourneyHash);
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
    rig.target = computeTarget();
    const journeyChanged = updateJourney(scrollY);

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
    if (measuredChanged || journeyChanged || scrolled !== lastScrolled) {
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
  midQuery.addEventListener("change", requestMeasure);
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

  requestMeasureFn = requestMeasure;
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
    midQuery.removeEventListener("change", requestMeasure);
    stage.removeEventListener("focusin", onFocusIn);
    if (resizeObserver) resizeObserver.disconnect();
    setFaded(false);
    if (requestMeasureFn === requestMeasure) requestMeasureFn = null;
    if (teardown === dispose) teardown = null;
  };

  teardown = dispose;
  return dispose;
};
