// WebGL 로딩 전·실패 시 보이는 정적 배경. three에 의존하지 않는다.
const StaticGalaxy = () => (
  <div
    className="absolute inset-0"
    style={{
      background: [
        "radial-gradient(ellipse 18% 12% at 68% 46%, rgba(255, 226, 184, 0.55) 0%, rgba(255, 226, 184, 0) 100%)",
        "radial-gradient(ellipse 34% 22% at 68% 46%, rgba(145, 94, 255, 0.38) 0%, rgba(145, 94, 255, 0) 100%)",
        "radial-gradient(ellipse 52% 34% at 68% 46%, rgba(242, 114, 200, 0.16) 0%, rgba(242, 114, 200, 0) 100%)",
        "#050816",
      ].join(", "),
    }}
  />
);

export default StaticGalaxy;
