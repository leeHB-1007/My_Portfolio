// 스크롤 성능 측정 스니펫. 번들에 포함되지 않으며 브라우저 콘솔(또는 자동화 도구)에 붙여 넣어 실행한다.
//   const result = await benchScroll();          // 10초 동안 0 → 끝까지 선형 스크롤
//   const result = await benchScroll({ seconds: 6 });
// 반환: { refreshMs, frames, avgMs, p95Ms, droppedRatio, maxScroll }
// - refreshMs: 측정 직전 유휴 상태에서 추정한 디스플레이 프레임 주기
// - droppedRatio: 프레임 간격이 refreshMs의 1.5배를 넘은 프레임의 비율
// index.css의 scroll-behavior: smooth 영향을 피하려고 항상 behavior: "instant"로 이동한다.
window.benchScroll = async function benchScroll({ seconds = 10 } = {}) {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const percentile = (sorted, p) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

  window.scrollTo({ top: 0, behavior: "instant" });
  await nextFrame();
  await nextFrame();

  // 유휴 상태 1초로 주사율 주기 추정(하위 10% 간격)
  const idle = [];
  let previous = await nextFrame();
  const idleUntil = previous + 1000;
  while (previous < idleUntil) {
    const now = await nextFrame();
    idle.push(now - previous);
    previous = now;
  }
  idle.sort((a, b) => a - b);
  const refreshMs = percentile(idle, 0.1);

  const maxScroll =
    document.documentElement.scrollHeight - window.innerHeight;
  const duration = seconds * 1000;
  const intervals = [];
  const start = await nextFrame();
  previous = start;

  while (previous - start < duration) {
    const now = await nextFrame();
    intervals.push(now - previous);
    previous = now;
    const progress = Math.min((now - start) / duration, 1);
    window.scrollTo({ top: maxScroll * progress, behavior: "instant" });
  }

  const sorted = [...intervals].sort((a, b) => a - b);
  const sum = intervals.reduce((total, value) => total + value, 0);
  const dropped = intervals.filter((value) => value > refreshMs * 1.5).length;
  const round = (value) => Math.round(value * 100) / 100;

  return {
    refreshMs: round(refreshMs),
    frames: intervals.length,
    avgMs: round(sum / intervals.length),
    p95Ms: round(percentile(sorted, 0.95)),
    droppedRatio: round(dropped / intervals.length),
    maxScroll,
  };
};
