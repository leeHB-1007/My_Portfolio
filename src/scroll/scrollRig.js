import { POSE_KEYS, samplePose } from "./galaxyPose";
import {
  ITEM_TARGET_U,
  STOP_TOLERANCE,
  findStop,
  itemOffset,
  journeyStops,
  sampleJourney,
  panelState,
} from "./journeyPose";
import { createPlanets } from "../journey/planets";
import {
  SNAP_ENABLED,
  SNAP_TIMING,
  STEP_TIMING,
  createGlide,
  glideAt,
  glideVelocity,
  snapDuration,
  snapIntent,
  snapTargetIndex,
  stepDuration,
  stopAt,
} from "./stepMotion";
import { SMOOTH_SCROLL, decayLag, followScroll, shouldJumpScroll } from "./smoothScroll";

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
  // 일반 섹션 모드에서 마지막 장면(Contact)으로 바뀌기 시작하는 스크롤 위치(없으면 null)
  outroStart: null,
  maxScroll: 0,
  aspect: 1,
  // 장면 계산에 쓰는 스크롤 위치(= smoothY). 실제 위치는 rawY.
  scrollY: 0,
  // 실제 window.scrollY와, 그것을 지연 보간한 값(smoothScroll)
  rawY: 0,
  smoothY: 0,
  heroP: 0,
  measured: false,
  target: null,
  current: null,
  settled: false,
  navScrolled: false,
  // 은하 셰이더의 uTime. CameraRig가 매 프레임 기록한다.
  time: 0,
  // 항해 상태: { start, end, measured, layout, planets, index, phase, t, item, u, s, ring,
  //   count(현재 챕터 위성 수), active, panel(보이는 챕터 패널|null), cardAnchor({ x, y }),
  //   progress(트랙 전체 진행도 0~1), past(트랙 끝을 지났는지), hover(마우스·포커스가 올라간 위성 id|null) }
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
    // 이전(-1)/다음(+1) 정지점으로 이동(버튼·방향키와 같은 동작)
    step: (direction) => stepJourney(direction),
    // 넘기기 스크롤 보간 중인지
    get stepping() {
      return glide !== null;
    },
    // 멈춘 뒤 가까운 정지점으로 정착 보간 중인지
    get snapping() {
      return glide !== null && glide.kind === "snap";
    },
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
    outroStart: rig.outroStart,
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
  const wasOn = group.values[index] > 0;
  group.values[index] = k;
  element.style.setProperty("--k", k.toFixed(3));
  // 보이는 요소에만 data-on을 단다. CSS가 이 속성이 있을 때만 transform을 걸어,
  // 보이지 않는 본문 수십 개가 합성 레이어로 올라가지 않게 한다.
  if (k > 0 !== wasOn) element.toggleAttribute("data-on", k > 0);
};

// 모든 요소에 --k: 0을 먼저 써 둔다. rig가 아직 값을 쓰지 않은 요소가 조상(패널)의 --k를
// 상속해 보이는 일을 막는다(챕터 중간으로 바로 이동하면 도착 안내가 한 번도 쓰이지 않는다).
const createGroup = (elements) => {
  elements.forEach((element) => element.style.setProperty("--k", "0.000"));
  return {
    elements,
    values: new Array(elements.length).fill(0),
    visible: new Set(),
  };
};

const smoothRange = (from, to, value) => {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

// 챕터 인터스티셜(이동 구간 가운데에 뜨는 큰 챕터 제목)의 투명도
const titleK = (t) => smoothRange(0.12, 0.3, t) * (1 - smoothRange(0.6, 0.8, t));

// Navbar 아래 진행 선(X의 [data-journey-progress] 요소)에 transform만 쓴다.
// 문서 루트·스테이지에 CSS 변수로 쓰면 하위 전체 스타일이 다시 계산된다.
const writeProgress = (progress) => {
  let element = journeyEls.progressElement;
  if (!element || !element.isConnected) {
    element = document.querySelector("[data-journey-progress]");
    journeyEls.progressElement = element;
    journeyEls.progress = null;
  }
  if (!element) return;
  if (journeyEls.progress !== null && Math.abs(journeyEls.progress - progress) < 0.002) return;
  journeyEls.progress = progress;
  element.style.transform = `scaleX(${progress.toFixed(4)})`;
};

// 반환값: 구독자에게 알릴 변화(챕터·단계·위성, 항해 안팎, 트랙 끝 통과)가 있었는지
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
  const active = scrollY >= journey.start && scrollY <= journey.end;
  const past = scrollY > journey.end;
  const crossed = active !== journey.active || past !== journey.past;
  const progress = Math.min(Math.max(distance / journey.layout.total, 0), 1);
  Object.assign(journey, state, {
    count: journey.layout.segments[state.index].count,
    active,
    past,
    progress,
    panel: shownPanel ? shownPanel.index : null,
  });
  writeProgress(progress);

  writeGroup(journeyEls.panels, panels.panels);
  writeGroup(journeyEls.items, panels.items);
  writeGroup(journeyEls.hints, panels.hints);
  writeGroup(
    journeyEls.titles,
    state.phase === "travel" ? [{ index: state.index, k: titleK(state.t) }] : []
  );
  if (journey.panel !== journeyEls.activePanel) {
    const { elements } = journeyEls.panels;
    if (journeyEls.activePanel !== null) {
      elements[journeyEls.activePanel].removeAttribute("data-active");
    }
    if (journey.panel !== null) elements[journey.panel].setAttribute("data-active", "");
    journeyEls.activePanel = journey.panel;
  }

  const { stage } = journeyEls;
  // 이동 중 행성 이름표(글자 숨김 + 점선 원)·인터스티셜을 CSS로 바꾸는 데 쓴다(값이 바뀔 때만 쓴다).
  if (state.phase !== journeyEls.phase) {
    journeyEls.phase = state.phase;
    stage.setAttribute("data-journey-phase", state.phase);
  }
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
  // 트랙을 지난 뒤(Contact)에는 넘기기 버튼·챕터 점을 숨긴다.
  const hud = past ? 0 : state.index === 0 ? labels : 1;
  if (shouldWrite(journeyEls.hud, hud)) {
    journeyEls.hud = hud;
    stage.style.setProperty("--hud", hud.toFixed(3));
    stage.toggleAttribute("data-journey-on", hud > 0);
  }
  if (sceneChanged && invalidateFn) {
    rig.settled = false;
    invalidateFn();
  }
  return changed || crossed;
};

// 위성 라벨·목차에 마우스·포커스가 올라간 위성(item id, 없으면 null). PlanetSystem이 그 위성을 강조한다.
export const setJourneyHover = (itemId) => {
  const journey = rig.journey;
  if (!journey) return;
  const next = itemId === undefined ? null : itemId;
  if (journey.hover === next) return;
  journey.hover = next;
  if (invalidateFn) {
    rig.settled = false;
    invalidateFn();
  }
};

// ---- 넘기기 스크롤 보간 ----
// 버튼·방향키·라벨·목차로 넘길 때는 rig가 rAF로 직접 스크롤한다(stepMotion의 시간·곡선).
// 사용자가 직접 스크롤(휠·터치·스크롤바·스크롤 키)하면 즉시 멈춘다.
let glide = null;
// 마지막 보간이 마지막으로 쓴 스크롤 위치. 보간이 끝난 뒤 늦게 오는 그 위치의 scroll 이벤트를 가려내는 데 쓴다.
let glideEndY = NaN;
// 보간 중 스크롤 위치가 직전에 쓴 값에서 이만큼(px) 넘게 달라져 있으면 사용자가 직접 움직인 것으로 본다.
const GLIDE_DRIFT = 2;
const CANCEL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
  "Spacebar",
]);

const stopGlide = () => {
  if (!glide) return;
  window.cancelAnimationFrame(glide.frame);
  window.removeEventListener("wheel", stopGlide);
  window.removeEventListener("touchstart", stopGlide);
  window.removeEventListener("pointerdown", onGlidePointer);
  window.removeEventListener("keydown", onGlideKey);
  glideEndY = glide.lastY === null ? NaN : glide.lastY;
  glide = null;
};

// 버튼(이전/다음·라벨·목차) 위의 누름은 넘기기를 이어 가는 입력이라 멈추지 않는다.
// 링크(Navbar 앵커 등)·스크롤바 드래그·그 밖의 누름은 사용자가 직접 움직이는 것으로 보고 멈춘다.
function onGlidePointer(event) {
  if (event.target instanceof Element && event.target.closest("button")) return;
  stopGlide();
}

function onGlideKey(event) {
  if (CANCEL_KEYS.has(event.key)) stopGlide();
}

const glideFrame = () => {
  if (!glide) return;
  // 입력 이벤트로 잡히지 않는 직접 스크롤(스크롤바 드래그, 관성 스크롤, 보조기술)과 싸우지 않는다.
  if (glide.lastY !== null && Math.abs(window.scrollY - glide.lastY) > GLIDE_DRIFT) {
    stopGlide();
    return;
  }
  const elapsed = (performance.now() - glide.start) / 1000;
  // 탭이 숨겨져 rAF가 멈췄다가 돌아오면 elapsed가 커져 바로 끝 위치로 맞춰진다.
  window.scrollTo({ top: glideAt(glide.curve, elapsed), behavior: "instant" });
  // 문서 끝에서 잘리거나 반올림된 실제 값을 기억한다.
  glide.lastY = window.scrollY;
  if (elapsed >= glide.curve.duration) {
    stopGlide();
    return;
  }
  glide.frame = window.requestAnimationFrame(glideFrame);
};

// target(px)까지 duration(초) 동안 보간한다. 같은 방향으로 가던 중이면 그 속도를 이어받는다.
const glideTo = (target, duration, { direction, index, kind = "step", startSpeed = 0 }) => {
  const now = performance.now();
  const from = window.scrollY;
  let velocity = duration > 0 ? (startSpeed * (target - from)) / duration : 0;
  if (glide && glide.direction === direction) {
    velocity = glideVelocity(glide.curve, (now - glide.start) / 1000);
  }
  const curve = createGlide({ from, to: target, duration, velocity });
  if (!glide) {
    window.addEventListener("wheel", stopGlide, { passive: true });
    window.addEventListener("touchstart", stopGlide, { passive: true });
    window.addEventListener("pointerdown", onGlidePointer, { passive: true });
    window.addEventListener("keydown", onGlideKey);
  } else {
    window.cancelAnimationFrame(glide.frame);
  }
  glide = { curve, start: now, direction, index, kind, frame: 0, lastY: null };
  glide.frame = window.requestAnimationFrame(glideFrame);
};

const remainingOf = (current) =>
  current ? Math.max(0, current.curve.duration - (performance.now() - current.start) / 1000) : 0;

const stopPositions = (journey) => {
  const unit = journeyUnit(journey);
  const stops = journeyStops(journey.layout);
  return {
    unit,
    stops,
    positions: stops.map((stop) => journey.start + stop.at * unit),
    tolerance: STOP_TOLERANCE * unit,
  };
};

// 정지점 번호(-1 Hero, stops.length Contact)의 스크롤 위치
const stopTarget = (positions, index) => {
  if (index < 0) return rig.heroStart;
  if (index >= positions.length) {
    const contact = document.getElementById("contact");
    return contact ? contact.getBoundingClientRect().top + window.scrollY : rig.maxScroll;
  }
  return positions[index];
};

const clampScroll = (value) => Math.max(0, Math.min(Math.round(value), rig.maxScroll));

// 전체 항목 번호 index의 위성으로 보간해 이동한다(라벨·목차 클릭, 키보드 포커스).
export const scrollToJourneyItem = (index) => {
  const journey = rig.journey;
  if (!journey || !journey.measured) return;
  const segment = journey.layout.segments.find(
    (entry) => index >= entry.firstItem && index < entry.firstItem + entry.count
  );
  if (!segment) return;
  const { unit, stops, positions, tolerance } = stopPositions(journey);
  const stopIndex = segment.index + index + 1;
  const target = clampScroll(
    journey.start + itemOffset(segment, index - segment.firstItem, ITEM_TARGET_U) * unit
  );
  const from = stopAt(positions, window.scrollY, tolerance);
  const duration = stepDuration({
    from,
    to: stopIndex,
    stops,
    distance: unit > 0 ? (target - window.scrollY) / unit : 0,
  });
  glideTo(target, duration, { direction: Math.sign(target - window.scrollY), index: stopIndex });
};

// 이전(-1)/다음(+1) 정지점으로 보간해 이동한다.
// 첫 정지점에서 이전 → Hero 맨 위, 마지막 정지점에서 다음 → Contact. 반환: 이동했는지
export const stepJourney = (direction) => {
  const journey = rig.journey;
  if (!journey || !journey.measured || !direction) return false;
  const dir = Math.sign(direction);
  const { unit, stops, positions, tolerance } = stopPositions(journey);
  const scrollY = window.scrollY;
  const continuing = glide !== null && glide.direction === dir;

  // 같은 방향으로 가던 중이면 가고 있던 목표를 기준으로 한 칸 더 간다.
  let from = stopAt(positions, scrollY, tolerance);
  let reference = scrollY;
  if (continuing) {
    from = glide.index;
    reference = stopTarget(positions, glide.index);
  }
  const found = findStop(positions, reference, dir, tolerance);
  const index = found >= 0 ? found : dir > 0 ? positions.length : -1;
  if (continuing && index === glide.index) return false;
  // 키를 누르고 있어도 지금 위치보다 maxAhead칸 넘게 앞서 쌓이지 않게 한다.
  if (continuing) {
    const here = stopAt(positions, scrollY, Infinity);
    if (here !== null && Math.abs(index - here) > STEP_TIMING.maxAhead) return false;
  }

  const target = clampScroll(stopTarget(positions, index));
  const base = stepDuration({
    from,
    to: index,
    stops,
    distance: unit > 0 ? (target - reference) / unit : 0,
  });
  // 이어 갈 때는 남은 시간의 절반을 더해 처음부터 다시 가속하지 않고 자연스럽게 이어지게 한다.
  const duration = continuing ? base + remainingOf(glide) * 0.5 : base;
  glideTo(target, duration, { direction: dir, index });
  return true;
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

// panels: 챕터 패널, items: 항목 순서의 본문, hints: 챕터별 도착 안내, region: 패널 영역,
// titles: 챕터별 인터스티셜(없을 수 있음)
export const attachJourney = ({
  track,
  stage,
  panels,
  items,
  hints,
  titles = [],
  region,
  layout,
}) => {
  const own = {
    track,
    stage,
    region,
    panels: createGroup(panels),
    items: createGroup(items),
    hints: createGroup(hints),
    titles: createGroup(titles),
    phase: null,
    progressElement: null,
    progress: null,
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
    past: false,
    progress: 0,
    hover: null,
    panel: null,
    cardAnchor: { x: 0, y: 0 },
    shiftTime: rig.time,
  };
  stage.addEventListener("focusin", onJourneyFocusIn);
  if (requestMeasureFn) requestMeasureFn();

  return () => {
    stage.removeEventListener("focusin", onJourneyFocusIn);
    if (journeyEls !== own) return;
    stopGlide();
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
    // Contact가 아래에서 들어오기 시작할 때(위 끝이 화면 아래에 닿을 때)부터 마지막 장면으로 바꾼다.
    const contact = document.getElementById("contact");
    const outroStart = contact ? contact.getBoundingClientRect().top + scrollY - vh : null;
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
      outroStart !== rig.outroStart ||
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
      outroStart,
      aspect: vh > 0 ? width / vh : 1,
      measured: true,
    });
    // 항해는 lazy로 붙으므로 해시(#about 등)로 들어온 경우 첫 측정 뒤에 한 번 다시 맞춘다.
    if (firstJourneyMeasure) window.requestAnimationFrame(jumpToJourneyHash);
    return true;
  };

  // scrollY: 장면 계산에 쓰는 위치(지연 보간된 smoothY)
  const update = (measuredChanged, scrollY) => {
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

  // 실제 scrollY를 smoothY로 지연 보간해 장면 값을 계산한다. 수렴할 때까지만 rAF를 이어 간다.
  let smoothY = null;
  let lastRaw = null;
  let lastRunAt = 0;
  const run = () => {
    frame = 0;
    const measuredChanged = needsMeasure ? measure() : false;
    needsMeasure = false;
    const now = performance.now();
    const raw = window.scrollY;
    const dt = lastRunAt ? Math.min((now - lastRunAt) / 1000, 0.1) : SMOOTH_SCROLL.frame;
    // 측정이 바뀌면 px로 정해 둔 보간 목표가 낡으므로 멈춘다.
    if (measuredChanged) stopGlide();
    const jump = shouldJumpScroll({
      first: smoothY === null,
      remeasured: measuredChanged,
      previousRaw: lastRaw,
      raw,
      vh: rig.vh,
    });
    if (jump) {
      smoothY = raw;
    } else if (glide) {
      // 보간은 그대로 따라가고, 보간이 시작될 때 남아 있던 지연만 줄여 간다.
      smoothY = raw + decayLag(smoothY - lastRaw, dt);
    } else {
      smoothY = followScroll(smoothY, raw, dt);
    }
    lastRaw = raw;
    rig.rawY = raw;
    rig.smoothY = smoothY;
    update(measuredChanged, smoothY);
    if (smoothY !== raw) {
      lastRunAt = now;
      schedule();
    } else {
      lastRunAt = 0;
    }
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(run);
  };

  const requestMeasure = () => {
    needsMeasure = true;
    schedule();
  };

  // ---- 멈추면 정착 ----
  // 스크롤 입력(스크롤·휠·키)이 멈추고 idleMs가 지나면 항해 구간 안의 정지점으로 보간한다.
  // 마지막으로 스크롤한 방향의 다음 정지점으로 가고, 이미 정지점 근처면 움직이지 않는다(snapIntent).
  // 터치로 누르고 있거나 스크롤바를 끄는 동안, 넘기기 보간 중에는 시작하지 않는다.
  let snapTimer = 0;
  let touching = false;
  let dragging = false;
  // 이번 스크롤이 시작된 위치(멈춰 있을 때는 null), 마지막 스크롤 방향, 직전 스크롤 위치
  let snapOrigin = null;
  let snapDirection = 0;
  let snapLastY = window.scrollY;
  const trySnap = () => {
    snapTimer = 0;
    if (!SNAP_ENABLED || touching || dragging) return;
    const origin = snapOrigin;
    snapOrigin = null;
    if (glide) return;
    const journey = rig.journey;
    if (!journey || !journey.measured || rig.mode !== "pinned") return;
    const { unit, positions, tolerance } = stopPositions(journey);
    const raw = window.scrollY;
    // 스크롤 없이 탭·클릭·빈 휠만 있었으면 화면을 옮기지 않는다.
    const intent = snapIntent(origin, raw, snapDirection);
    if (intent === null) return;
    const index = snapTargetIndex(
      positions,
      raw,
      tolerance,
      { start: journey.start, end: journey.end },
      intent
    );
    if (index < 0) return;
    const target = clampScroll(positions[index]);
    const duration = snapDuration(unit > 0 ? (target - raw) / unit : 0);
    glideTo(target, duration, {
      direction: Math.sign(target - raw),
      index,
      kind: "snap",
      startSpeed: SNAP_TIMING.start,
    });
  };
  const armSnap = () => {
    if (!SNAP_ENABLED) return;
    if (snapTimer) window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(trySnap, SNAP_TIMING.idleMs);
  };
  const onTouchStart = () => {
    touching = true;
  };
  // 여러 손가락 중 하나만 뗀 경우에는 아직 누르고 있는 것이다.
  const onTouchEnd = (event) => {
    touching = Boolean(event.touches && event.touches.length > 0);
    if (!touching) armSnap();
  };
  // 버튼 위 누름은 스크롤이 아니다. 그 밖(스크롤바 등)은 놓을 때까지 정착하지 않는다.
  const onPointerDown = (event) => {
    // 오른쪽·가운데 버튼은 pointerup이 오지 않을 수 있다(컨텍스트 메뉴).
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, label")) return;
    dragging = true;
  };
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    armSnap();
  };

  const onScroll = () => {
    schedule();
    const y = window.scrollY;
    // 넘기기·정착 보간이 만든 스크롤(끝난 직후 늦게 오는 것 포함)은 사용자의 스크롤·멈춤으로 보지 않는다.
    const own = glide !== null || Math.abs(y - glideEndY) < 1;
    glideEndY = NaN;
    if (!own) {
      if (snapOrigin === null) snapOrigin = snapLastY;
      if (y !== snapLastY) snapDirection = Math.sign(y - snapLastY);
      armSnap();
    }
    snapLastY = y;
  };

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
  window.addEventListener("wheel", armSnap, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  window.addEventListener("touchcancel", onTouchEnd, { passive: true });
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("pointerup", onPointerUp, { passive: true });
  window.addEventListener("pointercancel", onPointerUp, { passive: true });
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
    stopGlide();
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener("scroll", onScroll);
    scrollListeners -= 1;
    window.removeEventListener("wheel", armSnap);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    if (snapTimer) window.clearTimeout(snapTimer);
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
