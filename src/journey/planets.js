import { GALAXY_ARMS, SPIN } from "../components/canvas/galaxyShape";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// 은하 셰이더의 차등 회전 계수. 셰이더 식(ROTATION_GLSL)도 이 값으로 만든다.
export const ROTATION_BASE = 0.05;
export const ROTATION_INNER = 0.04;
export const ROTATION_GLSL = `atan(p.z, p.x) - uTime * (${ROTATION_BASE.toFixed(2)} + ${ROTATION_INNER.toFixed(2)} / (1.0 + r))`;

// 행성: 은하 팔 위, 원반 입자층 안(y 0.06). 은하에 비해 작다.
export const PLANET_HEIGHT = 0.06;
export const PLANET_SIZE = 0.085;
export const SATELLITE_SIZE = 0.02;
// 챕터 순서의 반경. 연속 방위각 차가 82~108°이고, 행성 사이가 최소 약 3.0이 되도록
// 탐색해 고른 값이다.
export const PLANET_RADII = [3.8, 3.55, 3.3, 3.2, 3.0];

// 위성 고리(회전목마): 위성 n개를 고리 1개에 같은 간격으로 둔다.
export const RING_TILT = 14 * DEG;
export const ringRadius = (n) => 0.2 + 0.012 * n;

export const angularSpeed = (radius) =>
  ROTATION_BASE + ROTATION_INNER / (1 + radius);

// 카메라 방위각 규약(position = (sin a, ·, cos a))으로 바꾼 값. 극각 φ와 a = π/2 − φ.
const toAzimuth = (angle) => Math.PI / 2 - angle;

// i번째 행성은 팔 (−i mod 4)에 둔다. 극각이 줄어드는 순서라 카메라 방위각은 늘어난다.
// azimuth: 시간 0 기준 카메라 방위각을 앞 행성에 이어 단조 증가하도록 펼친 값.
export const createPlanets = (count = PLANET_RADII.length) => {
  const planets = [];
  for (let i = 0; i < count; i += 1) {
    const arm = (GALAXY_ARMS - (i % GALAXY_ARMS)) % GALAXY_ARMS;
    const radius = PLANET_RADII[i % PLANET_RADII.length];
    const angle = (arm / GALAXY_ARMS) * TAU + radius * SPIN;
    let azimuth = toAzimuth(angle);
    if (i === 0) {
      azimuth = ((azimuth % TAU) + TAU) % TAU;
    } else {
      const previous = planets[i - 1].azimuth;
      azimuth += TAU * Math.ceil((previous - azimuth) / TAU);
      if (azimuth <= previous) azimuth += TAU;
    }
    planets.push({
      x: Math.cos(angle) * radius,
      y: PLANET_HEIGHT,
      z: Math.sin(angle) * radius,
      radius,
      angle,
      arm,
      azimuth,
    });
  }
  return planets;
};

// 셰이더와 같은 식으로 시간 time(uTime)의 위치를 구한다(y는 그대로).
export const rotateByTime = (position, time) => {
  const r = Math.hypot(position.x, position.z);
  const angle = Math.atan2(position.z, position.x) - time * angularSpeed(r);
  return {
    x: Math.cos(angle) * r,
    y: position.y,
    z: Math.sin(angle) * r,
  };
};

// 위성 j가 앞 자리(고리 좌표계의 +z 방향)에 오는 고리 각도.
// itemProgress: 앞 자리에 있는 위성 번호(연속값, 위성 사이 회전 중에는 소수).
export const ringAngle = (n, itemProgress) => (n > 0 ? (-itemProgress * TAU) / n : 0);

// 고리 각도 angle일 때 위성 index의 위치(행성 중심 기준, 고리 좌표계).
// 고리는 x축 기준으로 RING_TILT만큼 기울어 앞 자리(+z)가 조금 아래로 내려간다.
// 앞 자리 방향(yaw)과 행성의 은하 공전은 렌더 쪽 그룹 회전으로 준다.
export const satellitePosition = (n, index, angle) => {
  const radius = ringRadius(n);
  const a = (index * TAU) / n + angle;
  const flat = Math.cos(a) * radius;
  return {
    x: Math.sin(a) * radius,
    y: -flat * Math.sin(RING_TILT),
    z: flat * Math.cos(RING_TILT),
  };
};
