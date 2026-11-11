const DEG = Math.PI / 180;

export const DRIFT_VEIL = 0.8;
export const DRIFT_DIM = 0.4;
// 후퇴 구간 앞부분에서 베일을 다 올린다(후퇴 길이 대비 비율).
export const VEIL_RAMP = 0.6;
export const MAX_ELEVATION = 80 * DEG;
export const VIEW_SHIFT_X = 0.18;
export const VIEW_SHIFT_Y = 0.3;
export const VIEW_SHIFT_END = 0.6;

export const RADIUS = { introStart: 22, introEnd: 7, drift: 13, end: 20 };
export const AZIMUTH = { introEnd: 200 * DEG, end: 380 * DEG };
export const ELEVATION = {
  introStart: 35 * DEG,
  introEnd: 18 * DEG,
  drift: 28 * DEG,
  end: 32 * DEG,
};

export const POSE_KEYS = [
  "radius",
  "azimuth",
  "elevation",
  "dim",
  "veil",
  "viewShiftX",
  "viewShiftY",
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export const computeFit = (aspect) =>
  aspect > 0 && Number.isFinite(aspect) ? clamp(1 / aspect, 1, 2.2) : 1;

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
});

const NO_SHIFT = { x: 0, y: 0 };

export const samplePose = ({
  scrollY,
  heroStart,
  heroEnd,
  vh,
  maxScroll,
  aspect,
  mode,
  wide,
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

  // 인트로 이후 남은 거리. 짧은 문서에서는 후퇴·마무리를 같은 비율로 줄인다.
  const rest = last - end;
  const scale = screen > 0 ? Math.min(1, rest / (2 * screen)) : 0;
  const retreat = screen * scale;
  const finish = screen * scale;
  const driftEnd = last - finish;
  const along = y - end;
  const azimuth = lerp(AZIMUTH.introEnd, AZIMUTH.end, rest > 0 ? along / rest : 1);

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

  if (y < driftEnd || finish <= 0) {
    return pose(
      fit,
      RADIUS.drift,
      azimuth,
      ELEVATION.drift,
      DRIFT_DIM,
      DRIFT_VEIL,
      NO_SHIFT
    );
  }

  const e = smoothstep(clamp((y - driftEnd) / finish, 0, 1));
  return pose(
    fit,
    lerp(RADIUS.drift, RADIUS.end, e),
    azimuth,
    lerp(ELEVATION.drift, ELEVATION.end, e),
    DRIFT_DIM,
    DRIFT_VEIL,
    NO_SHIFT
  );
};
