// 항해 구간의 휠·트랙패드 스크롤 속도 상한(순수 계산). rig가 휠 입력을 받아 이 값대로 직접 스크롤한다.
// 휠을 빨리 돌리면 네이티브 스크롤은 정지점 여러 개를 한 번에 지나가 버리므로, 입력을 쌓아 두고(pending)
// 초당 maxSpeed(뷰포트 높이 단위)까지만 내보낸다. 느린 스크롤은 그 프레임에 바로 다 내보내 지연이 없다.

export const WHEEL_LIMIT = {
  enabled: true,
  // 최대 속도(화면 높이/초). 위성 사이(0.42화면)를 약 0.23초에 지난다.
  maxSpeed: 1.8,
  // 쌓아 둘 수 있는 최대 입력(화면 높이). 넘치는 입력은 버린다(손을 뗀 뒤 오래 끌려가지 않게).
  maxPending: 0.5,
  // deltaMode가 줄(1)일 때 한 줄의 px(Firefox 휠)
  linePx: 40,
};

// WheelEvent의 deltaY를 px로 바꾼다. deltaMode: 0 px, 1 줄, 2 페이지
export const wheelDeltaPx = (deltaY, deltaMode, vh) => {
  if (!Number.isFinite(deltaY)) return 0;
  if (deltaMode === 1) return deltaY * WHEEL_LIMIT.linePx;
  if (deltaMode === 2) return deltaY * vh;
  return deltaY;
};

// 쌓인 입력에 delta를 더한다. 방향이 바뀌면 이전 입력은 버리고, 최대치를 넘으면 자른다.
export const addPending = (pending, delta, vh) => {
  const base = Math.sign(pending) !== 0 && Math.sign(pending) !== Math.sign(delta) ? 0 : pending;
  const limit = WHEEL_LIMIT.maxPending * vh;
  return Math.max(-limit, Math.min(base + delta, limit));
};

// 이번 프레임(dt초)에 내보낼 이동량(px). 반환: { move, pending(남은 입력) }
export const drainPending = (pending, dt, vh) => {
  const cap = WHEEL_LIMIT.maxSpeed * vh * Math.max(dt, 0);
  const move = Math.sign(pending) * Math.min(Math.abs(pending), cap);
  const rest = pending - move;
  return { move, pending: Math.abs(rest) < 0.5 ? 0 : rest };
};
