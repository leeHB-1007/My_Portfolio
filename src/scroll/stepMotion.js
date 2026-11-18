// 사용자 넘기기(버튼·방향키·라벨·목차)의 스크롤 보간(순수 계산). rig가 rAF로 이 값을 따라 스크롤한다.
// 브라우저의 scroll-behavior: smooth는 거리와 무관하게 짧게 끝나 챕터 이동이 순식간에 지나가므로 쓰지 않는다.

// 조정용 시간(초). item: 같은 챕터 안 한 칸(도착 ↔ 첫 위성 포함), chapter: 챕터를 넘는 한 칸,
// edge: Hero ↔ 첫 챕터·마지막 ↔ Contact, perUnit·max: 여러 칸 건너뛰기(거리 1화면당 시간, 상한)
export const STEP_TIMING = {
  item: 1.3,
  chapter: 3.2,
  edge: 2.6,
  perUnit: 1.8,
  max: 3.4,
  // 같은 방향으로 미리 쌓아 둘 수 있는 칸 수(현재 위치 기준). 키를 누르고 있어도 멀리 달아나지 않게 한다.
  maxAhead: 2,
};

// 휠 제스처 구분. 넘긴 뒤 같은 방향으로 이어지는 입력은 같은 제스처(휠을 계속 돌리는 중, 트랙패드 관성)로 보고
// 무시하되, 다음 중 하나면 새 제스처로 보고 넘긴다.
// - 입력 사이가 gapMs 이상 비었다.
// - 입력 세기(|deltaY|)가 직전보다 rise배 넘게 커졌다(관성은 줄어들기만 하므로 다시 커지면 새로 민 것).
// - 방향이 바뀌었다.
export const WHEEL_GESTURE = { gapMs: 120, rise: 1.4, minDelta: 4 };

// 휠 입력 하나로 넘길 방향(0이면 넘기지 않는다).
// last: { dir(이번 제스처로 이미 넘긴 방향, 없으면 0), delta(직전 입력의 |deltaY|) }
// dir·delta: 이번 입력의 방향과 |deltaY|, quietMs: 직전 휠 입력과의 간격
export const wheelGestureStep = (last, dir, delta, quietMs) => {
  if (last.dir === 0 || last.dir !== dir) return dir;
  if (quietMs >= WHEEL_GESTURE.gapMs) return dir;
  if (delta >= WHEEL_GESTURE.minDelta && delta > last.delta * WHEEL_GESTURE.rise) return dir;
  return 0;
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

// 3차 에르미트 보간(구간 길이 span 동안 p0→p1, 양 끝 기울기 m0·m1). x: 구간 안 진행도 0~1.
// 반환: { p, dp(span 바깥 시간 단위당 변화량) }
const hermite = (p0, p1, m0, m1, span, x) => {
  const x2 = x * x;
  const x3 = x2 * x;
  const p =
    (2 * x3 - 3 * x2 + 1) * p0 +
    (x3 - 2 * x2 + x) * span * m0 +
    (-2 * x3 + 3 * x2) * p1 +
    (x3 - x2) * span * m1;
  const dp =
    ((6 * x2 - 6 * x) * p0 +
      (3 * x2 - 4 * x + 1) * span * m0 +
      (-6 * x2 + 6 * x) * p1 +
      (3 * x2 - 2 * x) * span * m1) /
    span;
  return { p, dp };
};

// 집중 구간(focus): 위성 넘기기에서 화면이 실제로 바뀌는 경로 구간(고리 회전·본문 교차 페이드).
// 그 앞뒤(화면이 그대로인 구간)는 시간의 lead만큼씩 빠르게 지나가고, 가운데 구간을 일정한 속도로
// 나머지 시간 동안 지난다. 고리 회전·페이드는 자체 가감속 곡선이 있어 일정한 속도로 지나가도 부드럽다.
// (가감속 곡선 하나로 가면 이 구간이 가장 빠른 한가운데에 걸려 약 0.26초 만에 휙 지나간다.)
export const FOCUS_TIME = { lead: 0.15, minEdge: 0.05 };

const focusTimes = (focus) => ({
  s1: focus.start >= FOCUS_TIME.minEdge ? FOCUS_TIME.lead : 0,
  s2: focus.end <= 1 - FOCUS_TIME.minEdge ? 1 - FOCUS_TIME.lead : 1,
});

// 정규화된 진행(경로 비율 p, 시간 비율 s에 대한 기울기 dp). m0: 정규화된 출발 속도
const glideProgress = (glide, s) => {
  const distance = glide.to - glide.from;
  const m0 = distance !== 0 ? (glide.velocity * glide.duration) / distance : 0;
  const { focus } = glide;
  if (!focus) return hermite(0, 1, m0, 0, 1, s);
  const { s1, s2 } = focusTimes(focus);
  const m = (focus.end - focus.start) / (s2 - s1);
  if (s < s1) return hermite(0, focus.start, m0, m, s1, s / s1);
  if (s <= s2) return { p: focus.start + m * (s - s1), dp: m };
  return hermite(focus.end, 1, m, 0, 1 - s2, (s - s2) / (1 - s2));
};

// 출발 속도 v0(위치 단위/초)에서 시작해 to에서 멈추는 3차 에르미트 곡선.
// v0 = 0이면 ease-in-out(smoothstep). 단조성을 위해 v0는 0 ~ 3·거리/시간(집중 구간이 있으면 첫 구간 기준)으로 자른다.
// focus: { start, end } 경로 비율(0~1). 주면 그 구간에 시간을 몰아 준다(위 FOCUS_TIME 설명).
export const createGlide = ({ from, to, duration, velocity = 0, focus = null }) => {
  const distance = to - from;
  const usable =
    focus && focus.end - focus.start > 0.01 && focus.start >= 0 && focus.end <= 1 ? focus : null;
  let limit = duration > 0 ? (3 * Math.abs(distance)) / duration : 0;
  if (usable) {
    const { s1 } = focusTimes(usable);
    limit = s1 > 0 && duration > 0 ? (3 * usable.start * Math.abs(distance)) / (s1 * duration) : 0;
  }
  const v0 = Math.sign(distance) === Math.sign(velocity) ? clamp(Math.abs(velocity), 0, limit) * Math.sign(distance) : 0;
  return { from, to, duration: Math.max(duration, 0), velocity: v0, focus: usable };
};

export const glideAt = (glide, elapsed) => {
  if (!(glide.duration > 0) || elapsed >= glide.duration) return glide.to;
  const s = clamp(elapsed / glide.duration, 0, 1);
  return glide.from + (glide.to - glide.from) * glideProgress(glide, s).p;
};

export const glideVelocity = (glide, elapsed) => {
  if (!(glide.duration > 0) || elapsed >= glide.duration) return 0;
  const s = clamp(elapsed / glide.duration, 0, 1);
  return ((glide.to - glide.from) * glideProgress(glide, s).dp) / glide.duration;
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
// 휠은 제스처마다 한 칸씩 넘기므로(rig의 onWheel), 정착은 터치·스크롤바·스크롤 키처럼 네이티브로 스크롤한 경우를 맞춘다.
// 항해 구간 안에서 스크롤 입력이 멈추고 idleMs가 지나면 정지점으로 넘기기와 같은 시간 규칙(stepDuration)으로 이동한다.
// 사용자가 방금 스크롤한 방향이 있으면 그 방향의 다음 정지점으로 간다(조금 내렸는데 되돌아가지 않게).
// 방향이 없으면(스크롤했다가 제자리로 돌아온 경우) 가장 가까운 정지점으로. 스크롤이 없었으면 정착하지 않는다(snapIntent).
// 출발 속도는 rig가 그 순간 장면 속도로 준다(감속하던 장면이 갑자기 다시 빨라지지 않게).
export const SNAP_ENABLED = true;
// idleMs: 터치를 떼거나 스크롤바를 놓은 뒤 잠깐 멈춘 틈에 바로 끌려가지 않을 만큼.
// minMove(px): 이번 스크롤에서 이만큼도 움직이지 않았으면 방향이 없는 것으로 본다.
export const SNAP_TIMING = { idleMs: 260, minMove: 2 };

// 정착 방향 판정. origin은 이번 스크롤이 시작된 위치(스크롤 없이 탭·클릭·빈 휠만 있었으면 null).
// null: 정착하지 않는다(사용자가 스크롤하지 않았는데 화면을 옮기지 않는다).
// ±1: 마지막으로 스크롤한 방향의 다음 정지점으로. 0: 제자리로 돌아온 스크롤 → 가장 가까운 정지점으로.
export const snapIntent = (origin, position, lastDirection) => {
  if (origin === null || origin === undefined) return null;
  return Math.abs(position - origin) > SNAP_TIMING.minMove ? Math.sign(lastDirection) : 0;
};

// position에서 direction(+1 아래, -1 위) 쪽으로 가장 가까운 정지점 번호(없으면 -1)
const nextStop = (positions, position, direction) => {
  if (direction > 0) return positions.findIndex((value) => value > position);
  // findLastIndex는 구형 Safari(15.3 이하)에 없어 직접 찾는다.
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    if (positions[i] < position) return i;
  }
  return -1;
};

// 정착할 정지점 번호. 움직이지 않을 때는 -1.
// - 트랙 밖(Hero·Contact)이거나 이미 정지점 근처(tolerance)면 -1.
// - direction(+1 아래로, -1 위로)이 있으면 그 방향의 다음 정지점. 그 방향에 정지점이 없으면 -1
//   (첫 정지점 앞에서 위로 = Hero로, 마지막 정지점 뒤에서 아래로 = Contact로 나가는 중).
//   단 이번 스크롤(origin부터)이 정지점을 지나쳤으면, 지나친 정지점과 다음 정지점 중 가까운 쪽으로 간다
//   (조금 지나쳤을 뿐인데 다음 정지점, 특히 챕터 하나를 통째로 넘어가지 않게).
// - direction이 0이면 가장 가까운 정지점. 단 트랙 시작·끝이 더 가까우면 -1.
// positions: 정지점 위치(오름차순), bounds: { start, end } 트랙의 고정 구간,
// origin: 이번 스크롤이 시작된 위치(없으면 지나친 정지점을 따지지 않는다)
export const snapTargetIndex = (
  positions,
  position,
  tolerance,
  bounds,
  direction = 0,
  origin = null
) => {
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
  if (direction !== 0) {
    const ahead = nextStop(positions, position, direction);
    if (ahead < 0) return -1;
    if (!Number.isFinite(origin)) return ahead;
    // 지나친 정지점: 출발점(그 근처 tolerance 제외)과 현재 위치 사이에서 현재 위치에 가장 가까운 것
    const passed = nextStop(positions, position, -direction);
    const crossed =
      passed >= 0 && (positions[passed] - origin) * direction > tolerance ? passed : -1;
    if (crossed < 0) return ahead;
    return Math.abs(positions[crossed] - position) < Math.abs(positions[ahead] - position)
      ? crossed
      : ahead;
  }
  const edge = Math.min(position - bounds.start, bounds.end - position);
  if (edge < bestDistance) return -1;
  return best;
};

