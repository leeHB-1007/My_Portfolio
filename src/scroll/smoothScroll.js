// 스크롤에서 파생되는 장면 값(카메라 목표, 패널·본문 투명도, Hero 페이드 등)을 위한 지연 보간.
// 네이티브 스크롤 위치는 건드리지 않고, rig가 계산에 쓰는 위치(smoothY)만 실제 scrollY를 따라가게 한다.
// 마우스 휠은 한 칸에 약 100px씩 끊겨 들어오므로 원시 값에 묶으면 화면이 뚝뚝 끊긴다.
//
// 1차 지수 감쇠는 목표가 뛰는 순간 속도가 최대로 튀었다가 줄어들어, 휠 한 칸마다 속도가 맥동한다.
// 그래서 위치와 속도를 함께 갖는 임계 감쇠 스프링(2차)을 쓴다. 속도가 0에서 부드럽게 올라가고
// 넘치지 않고 멈추며, 넘기기·정착 보간이 시작될 때 생기는 실제 위치의 속도 변화도 이어서 걸러 준다.

export const SMOOTH_SCROLL = {
  // 스프링 시간(초). 고유 진동수 ω = 2 / smoothTime. 약 0.06초에 60%, 0.12초에 90% 따라온다.
  // 항해 구간의 휠 입력은 wheelLimit가 이미 여러 프레임에 나눠 내보내므로 짧게 둔다(길면 반응이 굼뜨다).
  smoothTime: 0.06,
  // 이 거리(px)와 속도(px/s) 안이면 맞추고 멈춘다.
  settle: 0.5,
  settleSpeed: 5,
  // 한 프레임에 화면 이 개수 이상 건너뛰면(앵커 순간 이동·Home/End·스크롤바) 보간 없이 바로 맞춘다.
  jumpScreens: 3,
  // 루프가 다시 시작될 때 쓰는 기본 프레임 간격(초)
  frame: 1 / 60,
};

export const restScroll = (position) => ({ position, velocity: 0 });

// 임계 감쇠 스프링의 정확한 해로 dt만큼 진행한다(목표가 그 사이 고정이면 프레임률과 무관).
// state: { position, velocity(px/s) }. 반환: 새 state
export const followScroll = (state, target, dt, smoothTime = SMOOTH_SCROLL.smoothTime) => {
  if (!state || !Number.isFinite(state.position) || !(smoothTime > 0)) return restScroll(target);
  const velocity = Number.isFinite(state.velocity) ? state.velocity : 0;
  const step = Math.max(dt, 0);
  const omega = 2 / smoothTime;
  const offset = state.position - target;
  const slope = velocity + omega * offset;
  const decay = Math.exp(-omega * step);
  const nextOffset = (offset + slope * step) * decay;
  const nextVelocity = (velocity - omega * slope * step) * decay;
  if (Math.abs(nextOffset) < SMOOTH_SCROLL.settle && Math.abs(nextVelocity) < SMOOTH_SCROLL.settleSpeed) {
    return restScroll(target);
  }
  return { position: target + nextOffset, velocity: nextVelocity };
};

// 보간 없이 바로 맞출지: 첫 프레임, 재측정(리사이즈·모드 전환),
// 한 프레임에 화면 jumpScreens개 이상 건너뛴 순간 이동
export const shouldJumpScroll = ({ first, remeasured, previousRaw, raw, vh }) =>
  first ||
  remeasured ||
  (Number.isFinite(previousRaw) && vh > 0 && Math.abs(raw - previousRaw) >= SMOOTH_SCROLL.jumpScreens * vh);
