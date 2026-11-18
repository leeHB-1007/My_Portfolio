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

// ---- 멈추면 정착(스냅) ----
// 항해 구간 안에서 스크롤 입력이 멈추고 idleMs가 지나면 정지점으로 보간해 이동한다.
// 사용자가 방금 스크롤한 방향이 있으면 그 방향의 다음 정지점으로 간다(조금 내렸는데 되돌아가지 않게).
// 방향이 없으면(스크롤했다가 제자리로 돌아온 경우) 가장 가까운 정지점으로. 스크롤이 없었으면 정착하지 않는다(snapIntent).
// 시간은 거리(뷰포트 높이 단위)에 비례(perUnit)하되 min~max초. 출발 속도 비율(start)을 주어 ease-out에 가깝게.
// max는 챕터 넘기기(STEP_TIMING.chapter)와 같게 두어, 챕터 사이 이동이 방향키로 넘길 때와 같은 빠르기가 되게 한다.
export const SNAP_ENABLED = true;
// minMove(px): 이번 스크롤에서 이만큼도 움직이지 않았으면 방향이 없는 것으로 본다.
export const SNAP_TIMING = { idleMs: 180, min: 0.4, max: 2.4, perUnit: 2, start: 1.5, minMove: 2 };

// 정착 방향 판정. origin은 이번 스크롤이 시작된 위치(스크롤 없이 탭·클릭·빈 휠만 있었으면 null).
// null: 정착하지 않는다(사용자가 스크롤하지 않았는데 화면을 옮기지 않는다).
// ±1: 마지막으로 스크롤한 방향의 다음 정지점으로. 0: 제자리로 돌아온 스크롤 → 가장 가까운 정지점으로.
export const snapIntent = (origin, position, lastDirection) => {
  if (origin === null || origin === undefined) return null;
  return Math.abs(position - origin) > SNAP_TIMING.minMove ? Math.sign(lastDirection) : 0;
};

export const snapDuration = (distance) =>
  clamp(Math.abs(distance) * SNAP_TIMING.perUnit, SNAP_TIMING.min, SNAP_TIMING.max);

// 정착할 정지점 번호. 움직이지 않을 때는 -1.
// - 트랙 밖(Hero·Contact)이거나 이미 정지점 근처(tolerance)면 -1.
// - direction(+1 아래로, -1 위로)이 있으면 그 방향의 다음 정지점. 그 방향에 정지점이 없으면 -1
//   (첫 정지점 앞에서 위로 = Hero로, 마지막 정지점 뒤에서 아래로 = Contact로 나가는 중).
// - direction이 0이면 가장 가까운 정지점. 단 트랙 시작·끝이 더 가까우면 -1.
// positions: 정지점 위치(오름차순), bounds: { start, end } 트랙의 고정 구간
export const snapTargetIndex = (positions, position, tolerance, bounds, direction = 0) => {
  if (!positions.length) return -1;
  if (position < bounds.start || position > bounds.end) return -1;
  let best = -1;
  let bestDistance = Infinity;
  positions.forEach((value, i) => {
    const distance = Math.abs(value - position);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  if (bestDistance <= tolerance) return -1;
  if (direction > 0) return positions.findIndex((value) => value > position);
  if (direction < 0) {
    // findLastIndex는 구형 Safari(15.3 이하)에 없어 직접 찾는다.
    for (let i = positions.length - 1; i >= 0; i -= 1) {
      if (positions[i] < position) return i;
    }
    return -1;
  }
  const edge = Math.min(position - bounds.start, bounds.end - position);
  if (edge < bestDistance) return -1;
  return best;
};
