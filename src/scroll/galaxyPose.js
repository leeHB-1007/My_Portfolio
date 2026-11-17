import { BASE_FOV, JOURNEY_CAMERA, lerpPose, sampleJourneyPose } from "./journeyPose";

const DEG = Math.PI / 180;

export const DRIFT_VEIL = 0.8;
export const DRIFT_DIM = 0.4;
// 후퇴 구간 앞부분에서 베일을 다 올린다(후퇴 길이 대비 비율).
export const VEIL_RAMP = 0.6;
export const MAX_ELEVATION = 80 * DEG;
export const VIEW_SHIFT_X = 0.18;
export const VIEW_SHIFT_Y = 0.3;
export const VIEW_SHIFT_END = 0.6;

export const RADIUS = { introStart: 22, introEnd: 7, drift: 13 };
export const AZIMUTH = { introEnd: 200 * DEG, end: 380 * DEG };
export const ELEVATION = {
  introStart: 35 * DEG,
  introEnd: 18 * DEG,
  drift: 28 * DEG,
};

// 마지막 장면(Contact): 물러난 은하 전체를 보여준다. side(768px 이상)는 은하가 화면 오른쪽
// (패널은 왼쪽), stacked(좁은 화면)는 은하가 위쪽 배경. 항해 모드와 일반 섹션 모드가 같은 구도를 쓴다.
export const CONTACT_SCENE = {
  side: { radius: 15, elevation: 38 * DEG, shift: { x: 0.22, y: 0 }, veil: 0.45, dim: 0.9 },
  stacked: { radius: 15, elevation: 38 * DEG, shift: { x: 0, y: -0.22 }, veil: 0.7, dim: 0.9 },
};

export const POSE_KEYS = [
  "radius",
  "azimuth",
  "elevation",
  "dim",
  "veil",
  "viewShiftX",
  "viewShiftY",
  "tx",
  "ty",
  "tz",
  "fov",
  "bank",
];

// fov: 시야각(도, 항해 이동 중에만 넓어진다), bank: 시선 축 기울기(rad)
export { BASE_FOV };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export const computeFit = (aspect) =>
  aspect > 0 && Number.isFinite(aspect) ? clamp(1 / aspect, 1, 2.2) : 1;

// target(tx, ty, tz): 카메라가 바라보는 점. 인트로·드리프트는 원점.
// wide: 폭 1024px 이상(CSS 미디어쿼리 기준). 넓으면 오른쪽, 좁으면 아래로 치우친다.
const viewShift = (heroP, wide) => {
  const k = 1 - smoothstep(clamp(heroP / VIEW_SHIFT_END, 0, 1));
  return wide
    ? { x: VIEW_SHIFT_X * k, y: 0 }
    : { x: 0, y: VIEW_SHIFT_Y * k };
};

const pose = (fit, radius, azimuth, elevation, dim, veil, shift) => ({
  radius: radius * fit,
  azimuth,
  elevation: Math.min(elevation, MAX_ELEVATION),
  dim,
  veil,
  viewShiftX: shift.x,
  viewShiftY: shift.y,
  tx: 0,
  ty: 0,
  tz: 0,
  fov: BASE_FOV,
  bank: 0,
});

const NO_SHIFT = { x: 0, y: 0 };

const contactScene = (fit, azimuth, view) => {
  const scene = view === "narrow" ? CONTACT_SCENE.stacked : CONTACT_SCENE.side;
  return pose(fit, scene.radius, azimuth, scene.elevation, scene.dim, scene.veil, scene.shift);
};

export const samplePose = ({
  scrollY,
  heroStart,
  heroEnd,
  vh,
  maxScroll,
  aspect,
  mode,
  wide,
  journey = null,
  time = 0,
  // 항해 전용: 화면 구성(wide|mid|narrow)과 방위각 정규화 시각(journeyPose 참고)
  view = wide ? "wide" : "narrow",
  shiftTime = time,
  // 일반 섹션 모드에서 마지막 장면으로 바뀌기 시작하는 스크롤 위치(rig가 Contact 위치로 잰다).
  // 없으면 문서 끝 한 화면.
  outroStart = null,
}) => {
  const fit = computeFit(aspect);

  if (mode === "reduced") {
    return pose(
      fit,
      RADIUS.drift,
      AZIMUTH.introEnd,
      ELEVATION.drift,
      DRIFT_DIM,
      DRIFT_VEIL,
      NO_SHIFT
    );
  }

  const start = finite(heroStart);
  const end = Math.max(finite(heroEnd), start);
  const screen = Math.max(finite(vh), 0);
  const last = Math.max(finite(maxScroll), end);
  const y = clamp(finite(scrollY), start, last);

  const introSpan = end - start;
  const heroP = introSpan > 0 ? clamp((y - start) / introSpan, 0, 1) : y > start ? 1 : 0;

  if (y <= end) {
    const t = smootherstep(heroP);
    return pose(
      fit,
      lerp(RADIUS.introStart, RADIUS.introEnd, t),
      lerp(0, AZIMUTH.introEnd, t),
      lerp(ELEVATION.introStart, ELEVATION.introEnd, t),
      1,
      0,
      viewShift(heroP, wide)
    );
  }

  if (journey && mode === "pinned") {
    return sampleAfterIntro({ y, end, screen, last, fit, view, journey, time, shiftTime });
  }

  // 인트로 이후 남은 거리. 짧은 문서에서는 후퇴·마무리를 같은 비율로 줄인다.
  const rest = last - end;
  const scale = screen > 0 ? Math.min(1, rest / (2 * screen)) : 0;
  const retreat = screen * scale;
  const along = y - end;
  const azimuth = lerp(AZIMUTH.introEnd, AZIMUTH.end, rest > 0 ? along / rest : 1);
  const measured = Number.isFinite(outroStart);
  const finishStart = measured
    ? clamp(outroStart, end + retreat, last)
    : last - screen * scale;
  const finishLength = measured ? Math.min(screen, last - finishStart) : screen * scale;

  if (retreat > 0 && along < retreat) {
    const s = along / retreat;
    const e = smoothstep(s);
    return pose(
      fit,
      lerp(RADIUS.introEnd, RADIUS.drift, e),
      azimuth,
      lerp(ELEVATION.introEnd, ELEVATION.drift, e),
      lerp(1, DRIFT_DIM, e),
      DRIFT_VEIL * smoothstep(clamp(s / VEIL_RAMP, 0, 1)),
      NO_SHIFT
    );
  }

  const drift = pose(fit, RADIUS.drift, azimuth, ELEVATION.drift, DRIFT_DIM, DRIFT_VEIL, NO_SHIFT);
  if (y < finishStart) return drift;

  const e = finishLength > 0 ? smoothstep(clamp((y - finishStart) / finishLength, 0, 1)) : 1;
  return lerpPose(drift, contactScene(fit, azimuth, view), e);
};

// 항해 모드의 인트로 이후: 인트로 끝 → 행성 항해 → Contact 쪽 마무리.
// journey: { start, end, layout, planets } (start·end는 스테이지가 고정되는 스크롤 범위)
const sampleAfterIntro = ({ y, end, screen, last, fit, view, journey, time, shiftTime }) => {
  const from = pose(
    fit,
    RADIUS.introEnd,
    AZIMUTH.introEnd,
    ELEVATION.introEnd,
    1,
    0,
    NO_SHIFT
  );
  const journeyStart = Math.max(finite(journey.start), end);
  const journeyEnd = Math.max(finite(journey.end), journeyStart);
  const span = journeyEnd - journeyStart;
  const total = journey.layout.total;
  const u =
    y <= journeyStart
      ? 0
      : span > 0
        ? ((Math.min(y, journeyEnd) - journeyStart) / span) * total
        : total;
  const current = sampleJourneyPose({
    distance: u,
    layout: journey.layout,
    planets: journey.planets,
    time: finite(time),
    shiftTime: finite(shiftTime),
    fit,
    view,
    from,
    minAzimuth: AZIMUTH.introEnd + JOURNEY_CAMERA.firstAfter,
  });
  if (y <= journeyEnd) return current;

  // 마지막 위성 → Contact 장면: 원점(은하 중심)을 향해 물러나며 은하 전체가 옆(좁은 화면은 위)에 보인다.
  const outro = Math.min(screen, last - journeyEnd);
  const e = outro > 0 ? smoothstep(clamp((y - journeyEnd) / outro, 0, 1)) : 1;
  const finish = contactScene(fit, current.azimuth + JOURNEY_CAMERA.outroTurn, view);
  return lerpPose(current, finish, e);
};
