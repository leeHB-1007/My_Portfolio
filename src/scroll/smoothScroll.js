// 스크롤에서 파생되는 장면 값(카메라 목표, 패널·본문 투명도, Hero 페이드 등)을 위한 지연 보간.
// 네이티브 스크롤 위치는 건드리지 않고, rig가 계산에 쓰는 위치(smoothY)만 실제 scrollY를 따라가게 한다.
// 마우스 휠은 한 칸에 약 100px씩 끊겨 들어오므로 원시 값에 묶으면 화면이 뚝뚝 끊긴다.

export const SMOOTH_SCROLL = {
  // 지수 감쇠 시간 상수(초). 약 3배 시간(0.4초) 안에 대부분 따라온다.
  tau: 0.13,
  // 이 거리(px) 안이면 맞추고 멈춘다.
  settle: 0.5,
  // 한 프레임에 화면 이 개수 이상 건너뛰면(앵커 순간 이동·Home/End·스크롤바) 보간 없이 바로 맞춘다.
  jumpScreens: 3,
  // 루프가 다시 시작될 때 쓰는 기본 프레임 간격(초)
  frame: 1 / 60,
};

// 프레임률과 무관한 한 스텝: current가 target을 향해 1 - exp(-dt/tau)만큼 다가간다.
export const followScroll = (current, target, dt, tau = SMOOTH_SCROLL.tau) => {
  if (!Number.isFinite(current)) return target;
  const k = tau > 0 ? 1 - Math.exp(-Math.max(dt, 0) / tau) : 1;
  const next = current + (target - current) * k;
  return Math.abs(target - next) < SMOOTH_SCROLL.settle ? target : next;
};

// 넘기기·정착 보간 중에 쓰는 한 스텝. 보간은 이미 정해진 곡선으로 움직이므로 그대로 따라가되,
// 보간이 시작될 때 남아 있던 지연(lag = smoothY - 실제 위치)만 같은 시간 상수로 줄인다.
// (보간 시작 순간에 바로 맞추면 패널·제목 투명도가 한 프레임에 튄다.)
export const decayLag = (lag, dt, tau = SMOOTH_SCROLL.tau) => {
  if (!Number.isFinite(lag)) return 0;
  const next = tau > 0 ? lag * Math.exp(-Math.max(dt, 0) / tau) : 0;
  return Math.abs(next) < SMOOTH_SCROLL.settle ? 0 : next;
};

// 보간 없이 바로 맞출지: 첫 프레임, 재측정(리사이즈·모드 전환),
// 한 프레임에 화면 jumpScreens개 이상 건너뛴 순간 이동
export const shouldJumpScroll = ({ first, remeasured, previousRaw, raw, vh }) =>
  first ||
  remeasured ||
  (Number.isFinite(previousRaw) && vh > 0 && Math.abs(raw - previousRaw) >= SMOOTH_SCROLL.jumpScreens * vh);
