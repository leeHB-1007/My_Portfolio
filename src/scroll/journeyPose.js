import { angularSpeed, rotateByTime } from "../journey/planets";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// 챕터 구간 = 이동 + 도착 + 위성 n개. 길이는 뷰포트 높이 비율.
export const TRAVEL_VH = 1.0;
// 도착 단계: 챕터 패널의 제목·설명·목차를 읽는 시간
export const ARRIVE_VH = 0.6;
export const ITEM_VH = 0.42;
// 위성 단계의 앞부분(u < ROTATE_END)에서 고리가 돌아 이 위성이 앞으로 온다.
export const ROTATE_END = 0.3;
// Navbar 앵커(챕터 첫 위성)와 라벨·포커스로 이동할 위치(위성 단계 안의 u)
export const ANCHOR_U = 0.5;
export const ITEM_TARGET_U = 0.6;

// 기본 시야각(도). 항해 이동 중에만 넓어진다. galaxyPose도 이 값을 쓴다.
export const BASE_FOV = 60;

export const JOURNEY_CAMERA = {
  radius: 0.82,
  elevation: 12 * DEG,
  // 행성 바깥쪽에서 은하 중심 쪽을 보도록 행성 방향에서 돌린 양
  azimuthOffset: 25 * DEG,
  retreat: 9.5,
  lift: 24 * DEG,
  dim: 1,
  veil: 0.18,
  // 인트로 끝 방위각보다 최소한 이만큼 더 돌아 첫 행성에 도착한다.
  firstAfter: 40 * DEG,
  outroTurn: 40 * DEG,
  // 이동 중 연출: 방위각 속도에 비례한 기울임(최대), 시야각을 넓히는 양(도, 이동 중간에 최대)
  bank: 6 * DEG,
  fovBoost: 8,
};

// 고리 회전 끝의 작은 넘침(오버슈트) 크기
const RING_OVERSHOOT = 0.08;

// 항해 화면 구성(폭 기준: wide ≥ 1024px, mid 768~1023px, narrow < 768px).
// shift: 체류 중 행성의 화면 위치(0.5 + shift), distance: 체류 거리 배율,
// frontOffset: 앞 자리 위성 방향(카메라 방향에서 화면 오른쪽으로 돈 각도),
// panelLeft·panelTop: 패널 영역의 왼쪽(가로 비율)·위쪽(세로 비율). CSS 변수로도 쓴다.
export const JOURNEY_VIEWS = {
  wide: { shift: { x: -0.2, y: 0.02 }, distance: 1, frontOffset: 32 * DEG, panelLeft: 0.54 },
  mid: { shift: { x: -0.26, y: 0.02 }, distance: 1.45, frontOffset: 40 * DEG, panelLeft: 0.5 },
  narrow: { shift: { x: 0, y: -0.31 }, distance: 1.7, frontOffset: 0, panelTop: 0.35 },
};

export const JOURNEY_FOV = 60 * DEG;

// 이전/다음 버튼 묶음(px): 좁은 화면은 왼쪽 아래(패널 영역 아래 64px 띠, MotionToggle 왼쪽),
// 768px 이상은 체류 중 행성의 가로 위치 아래. width는 힌트(← →)까지 포함한 상한. CSS 변수로도 쓴다.
export const JOURNEY_STEPPER = { height: 44, width: 232, bottomSide: 28, bottomNarrow: 16 };

// 위성 고리의 앞 자리 방향(행성 공전 좌표계 기준 y축 회전). PlanetSystem과 투영 계산이 함께 쓴다.
export const ringYaw = (planet, viewName) =>
  planet.azimuth +
  JOURNEY_CAMERA.azimuthOffset +
  (JOURNEY_VIEWS[viewName] || JOURNEY_VIEWS.wide).frontOffset;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smoothRange = (from, to, value) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export const lerpPose = (a, b, t) =>
  Object.keys(a).reduce((pose, key) => {
    pose[key] = a[key] + (b[key] - a[key]) * t;
    return pose;
  }, {});

// chapters: [{ id, items }] 순서대로 구간 하나씩
export const createJourneyLayout = (chapters) => {
  let start = 0;
  let firstItem = 0;
  const segments = chapters.map((chapter, index) => {
    const count = chapter.items.length;
    const segment = {
      index,
      section: chapter.id,
      start,
      count,
      firstItem,
      length: TRAVEL_VH + ARRIVE_VH + count * ITEM_VH,
    };
    start += segment.length;
    firstItem += count;
    return segment;
  });
  return { segments, total: start, itemCount: firstItem };
};

// 위성 j의 단계 안 위치 u에 해당하는 항해 거리(뷰포트 높이 단위)
export const itemOffset = (segment, j, u) =>
  segment.start + TRAVEL_VH + ARRIVE_VH + (j + u) * ITEM_VH;

// 정지점(이전/다음으로 넘길 때 멈추는 곳): 챕터마다 도착(챕터 소개) 1개 + 위성 n개, 스크롤 순서.
// item은 도착이면 -1, at은 항해 거리(뷰포트 높이 단위). 위성은 라벨 클릭과 같은 위치,
// 도착은 도착 단계의 가운데.
export const journeyStops = (layout) =>
  layout.segments.flatMap((segment) => [
    { chapter: segment.index, item: -1, at: segment.start + TRAVEL_VH + ARRIVE_VH / 2 },
    ...Array.from({ length: segment.count }, (_, j) => ({
      chapter: segment.index,
      item: j,
      at: itemOffset(segment, j, ITEM_TARGET_U),
    })),
  ]);

// 이 거리(위성 구간의 15%) 안이면 그 정지점에 이미 있다고 보고 건너뛴다.
export const STOP_TOLERANCE = ITEM_VH * 0.15;

// positions: 정지점 위치(오름차순), position: 현재 위치(같은 단위).
// 반환: 다음/이전 정지점 번호, 없으면 -1(앞쪽 끝 → Hero 맨 위, 뒤쪽 끝 → Contact는 호출 쪽이 정한다).
export const findStop = (positions, position, direction, tolerance) => {
  if (direction > 0) {
    return positions.findIndex((value) => value > position + tolerance);
  }
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    if (positions[i] < position - tolerance) return i;
  }
  return -1;
};

// 현재 단계에 해당하는 정지점 번호(진행 표시용). 이동 중에는 도착할 챕터의 도착 정지점.
export const stopIndexOf = (layout, state) => {
  const segment = layout.segments[state.index];
  if (!segment) return 0;
  const base = segment.index + segment.firstItem;
  return state.phase === "item" ? base + 1 + state.item : base;
};

export const journeyAnchors = (layout) =>
  layout.segments.map((segment) => ({
    id: segment.section,
    at: itemOffset(segment, 0, ANCHOR_U),
  }));

// 이동 보간: 출발은 천천히, 도착은 길게 미끄러지듯(속도 최대가 앞쪽에 온다). 0·1에서 속도 0.
export const travelEase = (t) => {
  const e = smoothRange(0, 1, t);
  return 1 - (1 - e) * (1 - e);
};
const travelEaseSlope = (t) => {
  const x = clamp(t, 0, 1);
  return 2 * (1 - smoothRange(0, 1, x)) * 6 * x * (1 - x);
};
// 기울임을 0~1로 맞추기 위한 최대 기울기(수치로 한 번 구한다)
const TRAVEL_SLOPE_MAX = Array.from({ length: 201 }, (_, i) => travelEaseSlope(i / 200)).reduce(
  (max, value) => Math.max(max, value),
  0
);

// 고리 회전: 가감속 + 끝에서 약하게 넘쳤다 돌아온다(0에서 0, 1에서 정확히 1).
const ringEase = (x) => smootherstep(x) + RING_OVERSHOOT * Math.sin(Math.PI * x) * x * x;

// 고리에서 앞 자리에 있는 위성 번호(연속값)
const ringProgressAt = (phase, item, u) => {
  if (phase !== "item" || item === 0) return 0;
  return item - 1 + ringEase(clamp(u / ROTATE_END, 0, 1));
};

// u: 항해 진행 거리(뷰포트 높이 단위). 범위 밖은 처음·끝으로 자른다.
// 반환: index(챕터), phase(travel|arrive|item), t(이동 진행도), item(위성 번호, 없으면 -1),
// u(위성 단계 진행도), s(챕터 진행도), ring(앞 자리 위성 번호, 연속값), a(도착 단계 진행도)
export const sampleJourney = (layout, distance) => {
  const { segments, total } = layout;
  const last = segments.length - 1;
  if (last < 0 || !(distance > 0)) {
    return { index: 0, phase: "travel", t: 0, item: -1, u: 0, s: 0, ring: 0, a: 0 };
  }
  if (distance >= total) {
    const segment = segments[last];
    return {
      index: last,
      phase: "item",
      t: 1,
      item: segment.count - 1,
      u: 1,
      s: 1,
      ring: Math.max(segment.count - 1, 0),
      a: 1,
    };
  }

  let index = last;
  while (index > 0 && segments[index].start > distance) index -= 1;
  const segment = segments[index];
  const local = distance - segment.start;
  const s = clamp(local / segment.length, 0, 1);
  if (local < TRAVEL_VH) {
    return { index, phase: "travel", t: local / TRAVEL_VH, item: -1, u: 0, s, ring: 0, a: 0 };
  }
  if (local < TRAVEL_VH + ARRIVE_VH || segment.count === 0) {
    const a = clamp((local - TRAVEL_VH) / ARRIVE_VH, 0, 1);
    return { index, phase: "arrive", t: 1, item: -1, u: 0, s, ring: 0, a };
  }
  const itemDistance = (local - TRAVEL_VH - ARRIVE_VH) / ITEM_VH;
  const item = Math.min(Math.floor(itemDistance), segment.count - 1);
  const u = clamp(itemDistance - item, 0, 1);
  return { index, phase: "item", t: 1, item, u, s, ring: ringProgressAt("item", item, u), a: 1 };
};

// 챕터 패널과 그 안의 본문 투명도.
// panels: [{ index(챕터), k }], items: [{ index(전체 항목 번호), k }], hints: [{ index(챕터), k }]
// 패널은 도착·위성 단계 내내 유지되고, 본문(도착 안내 → 위성 0 → 위성 1 …)만 교차 페이드한다.
// 떠나는 챕터의 패널은 다음 이동이 시작될 때 사라지고, 전체 마지막 패널은 트랙 끝까지 남는다.
export const panelState = (layout, state) => {
  const segment = layout.segments[state.index];
  const result = { panels: [], items: [], hints: [] };
  if (!segment) return result;

  if (state.phase === "travel") {
    if (state.index > 0) {
      const previous = layout.segments[state.index - 1];
      const leaving = 1 - smoothRange(0, 0.1, state.t);
      result.panels.push({ index: state.index - 1, k: leaving });
      if (previous.count > 0) {
        result.items.push({ index: previous.firstItem + previous.count - 1, k: 1 });
      } else {
        result.hints.push({ index: state.index - 1, k: 1 });
      }
    }
    result.panels.push({ index: state.index, k: smoothRange(0.75, 1, state.t) });
    result.hints.push({ index: state.index, k: 1 });
    return result;
  }

  result.panels.push({ index: state.index, k: 1 });
  if (state.phase === "arrive") {
    result.hints.push({ index: state.index, k: 1 });
    return result;
  }

  const current = segment.firstItem + state.item;
  result.items.push({ index: current, k: smoothRange(0.1, 0.3, state.u) });
  const outgoing = 1 - smoothRange(0, 0.2, state.u);
  if (state.item > 0) result.items.push({ index: current - 1, k: outgoing });
  else result.hints.push({ index: state.index, k: outgoing });
  return result;
};

// 첫 행성의 방위각이 [minAzimuth, minAzimuth + 2π)에 오도록 모든 행성에 같은 2π 배수를 더한다.
const azimuthShift = (planets, time, minAzimuth) => {
  const first = planets[0].azimuth + time * angularSpeed(planets[0].radius);
  return TAU * Math.ceil((minAzimuth - first) / TAU);
};

const dwellPose = (planet, time, shift, fit, view) => {
  const position = rotateByTime(planet, time);
  return {
    radius: JOURNEY_CAMERA.radius * fit * view.distance,
    azimuth:
      planet.azimuth + time * angularSpeed(planet.radius) + shift + JOURNEY_CAMERA.azimuthOffset,
    elevation: JOURNEY_CAMERA.elevation,
    dim: JOURNEY_CAMERA.dim,
    veil: JOURNEY_CAMERA.veil,
    viewShiftX: view.shift.x,
    viewShiftY: view.shift.y,
    tx: position.x,
    ty: position.y,
    tz: position.z,
    fov: BASE_FOV,
    bank: 0,
  };
};

// from: 인트로 끝 pose(첫 구간의 출발점). 반환 pose의 radius에는 fit이 곱해져 있다.
// shiftTime: 방위각을 2π 단위로 정규화할 때 쓰는 시각. 첫 이동 구간은 고정점(from)에서
// 보간하므로, 이 값이 시간에 따라 바뀌면 2π 점프가 t배로 새어 카메라가 튄다.
// 그래서 rig가 첫 이동 구간 동안 이 값을 고정한다(행성 위치·방위각의 시간 항은 time).
export const sampleJourneyPose = ({
  distance,
  layout,
  planets,
  time = 0,
  shiftTime = time,
  fit = 1,
  view: viewName = "wide",
  from,
  minAzimuth,
}) => {
  const state = sampleJourney(layout, distance);
  const view = JOURNEY_VIEWS[viewName] || JOURNEY_VIEWS.wide;
  const shift = azimuthShift(planets, shiftTime, minAzimuth);
  const dwell = (i) => dwellPose(planets[i], time, shift, fit, view);

  if (state.phase !== "travel") return dwell(state.index);

  const t = travelEase(state.t);
  const start = state.index === 0 ? from : dwell(state.index - 1);
  const end = dwell(state.index);
  const pose = lerpPose(start, end, t);
  // 챕터 사이에서는 솟아올라 은하 전체를 보였다가 다음 자리로 파고든다.
  // 첫 챕터는 인트로 끝에서 바로 파고든다.
  // 물러남·시야각은 스크롤 진행도(state.t) 기준이라 이동 구간의 한가운데에서 최대다.
  const bump = Math.sin(Math.PI * state.t);
  if (state.index > 0) {
    pose.radius += JOURNEY_CAMERA.retreat * fit * bump;
    pose.elevation += JOURNEY_CAMERA.lift * bump;
  }
  // 시야각은 이동 중간에 넓어지고, 기울임은 방위각이 도는 속도에 비례한다(스크롤 위치로만 결정).
  pose.fov = BASE_FOV + JOURNEY_CAMERA.fovBoost * bump;
  const turn = Math.sign(end.azimuth - start.azimuth);
  pose.bank = JOURNEY_CAMERA.bank * turn * (travelEaseSlope(state.t) / TRAVEL_SLOPE_MAX);
  return pose;
};
