// 사용자 넘기기(버튼·방향키·라벨·목차)의 스크롤 보간(순수 계산). rig가 rAF로 이 값을 따라 스크롤한다.
// 브라우저의 scroll-behavior: smooth는 거리와 무관하게 짧게 끝나 챕터 이동이 순식간에 지나가므로 쓰지 않는다.

// 조정용 시간(초). item: 같은 챕터 안 한 칸(도착 ↔ 첫 위성 포함), chapter: 챕터를 넘는 한 칸,
// edge: Hero ↔ 첫 챕터·마지막 ↔ Contact, perUnit·max: 여러 칸 건너뛰기(거리 1화면당 시간, 상한)
export const STEP_TIMING = {
  item: 0.9,
  chapter: 2.4,
  edge: 2.0,
  perUnit: 1.4,
  max: 2.6,
  // 같은 방향으로 미리 쌓아 둘 수 있는 칸 수(현재 위치 기준). 키를 누르고 있어도 멀리 달아나지 않게 한다.
  maxAhead: 2,
};

// 방향키를 누르고 있을 때 반복 입력을 받는 간격(ms). 한 칸 보간 시간에 맞춘다.
export const STEP_KEY_REPEAT_MS = Math.round(STEP_TIMING.item * 1000 * 0.8);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// from·to: 정지점 번호. -1은 Hero, stopCount는 Contact, from이 null이면 정지점 사이(사용자가 직접 스크롤한 위치).
// distance: 이동 거리(뷰포트 높이 단위)
export const stepDuration = ({ from, to, stops, distance }) => {
  const outside = (index) => index < 0 || index >= stops.length;
  if (outside(to) || (from !== null && outside(from))) return STEP_TIMING.edge;
  if (from !== null && Math.abs(to - from) === 1) {
    return stops[from].chapter === stops[to].chapter ? STEP_TIMING.item : STEP_TIMING.chapter;
  }
  return clamp(Math.abs(distance) * STEP_TIMING.perUnit, STEP_TIMING.item, STEP_TIMING.max);
};

// 출발 속도 v0(위치 단위/초)에서 시작해 to에서 멈추는 3차 에르미트 곡선.
// v0 = 0이면 ease-in-out(smoothstep). 단조성을 위해 v0는 0 ~ 3·거리/시간으로 자른다.
export const createGlide = ({ from, to, duration, velocity = 0 }) => {
  const distance = to - from;
  const limit = duration > 0 ? (3 * Math.abs(distance)) / duration : 0;
  const v0 = Math.sign(distance) === Math.sign(velocity) ? clamp(Math.abs(velocity), 0, limit) * Math.sign(distance) : 0;
  return { from, to, duration: Math.max(duration, 0), velocity: v0 };
};

export const glideAt = (glide, elapsed) => {
  if (!(glide.duration > 0) || elapsed >= glide.duration) return glide.to;
  const s = clamp(elapsed / glide.duration, 0, 1);
  const h = s * s * (3 - 2 * s);
  const tangent = s - 2 * s * s + s * s * s;
  return glide.from + (glide.to - glide.from) * h + glide.velocity * glide.duration * tangent;
};

export const glideVelocity = (glide, elapsed) => {
  if (!(glide.duration > 0) || elapsed >= glide.duration) return 0;
  const s = clamp(elapsed / glide.duration, 0, 1);
  const dh = 6 * s - 6 * s * s;
  const dTangent = 1 - 4 * s + 3 * s * s;
  return ((glide.to - glide.from) * dh) / glide.duration + glide.velocity * dTangent;
};

// positions: 정지점 위치(오름차순). 현재 위치가 어느 정지점 위에 있는지(-1 Hero, length Contact, 사이면 null)
export const stopAt = (positions, position, tolerance) => {
  if (!positions.length) return null;
  if (position < positions[0] - tolerance) return -1;
  if (position > positions[positions.length - 1] + tolerance) return positions.length;
  let best = null;
  let bestDistance = tolerance;
  positions.forEach((value, i) => {
    const distance = Math.abs(value - position);
    if (distance <= bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
};
