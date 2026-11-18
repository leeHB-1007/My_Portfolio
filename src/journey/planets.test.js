import { describe, expect, it } from "vitest";

import {
  PLANET_HEIGHT,
  RING_TILT,
  ROTATION_GLSL,
  createPlanets,
  ringAngle,
  ringRadius,
  rotateByTime,
  satellitePosition,
} from "./planets";

const DEG = Math.PI / 180;
const COUNTS = [5, 4, 9, 6, 6];

// 카메라 방위각 규약(position = (sin a, ·, cos a))으로 본 방향
const azimuthOf = (p) => Math.atan2(p.x, p.z);
const forwardGap = (from, to) => {
  const gap = (to - from) % (Math.PI * 2);
  return gap < 0 ? gap + Math.PI * 2 : gap;
};

describe("createPlanets", () => {
  const planets = createPlanets(5);

  it("5개를 결정적으로 만든다", () => {
    expect(planets).toHaveLength(5);
    expect(createPlanets(5)).toEqual(planets);
  });

  it("반경 3.0~3.8, y = 0.06(원반 안), 은하 팔 위, 은하에 비해 작다", () => {
    planets.forEach((planet) => {
      const r = Math.hypot(planet.x, planet.z);
      expect(r).toBeGreaterThanOrEqual(3.0 - 1e-9);
      expect(r).toBeLessThanOrEqual(3.8);
      expect(r).toBeCloseTo(planet.radius, 9);
      expect(planet.y).toBe(PLANET_HEIGHT);
      const armAngle = (planet.arm / 4) * Math.PI * 2 + planet.radius * 1.1;
      expect(Math.cos(armAngle) * planet.radius).toBeCloseTo(planet.x, 9);
      expect(Math.sin(armAngle) * planet.radius).toBeCloseTo(planet.z, 9);
    });
  });

  it("연속한 두 행성의 방위각 차는 80~110°(카메라가 같은 방향으로 돈다)", () => {
    for (let i = 1; i < planets.length; i += 1) {
      const gap = forwardGap(azimuthOf(planets[i - 1]), azimuthOf(planets[i]));
      expect(gap).toBeGreaterThanOrEqual(80 * DEG);
      expect(gap).toBeLessThanOrEqual(110 * DEG);
    }
  });

  it("펼친 azimuth는 단조 증가하고 실제 방향과 같다", () => {
    planets.forEach((planet, i) => {
      const a = azimuthOf(planet);
      expect(Math.cos(planet.azimuth)).toBeCloseTo(Math.cos(a), 9);
      expect(Math.sin(planet.azimuth)).toBeCloseTo(Math.sin(a), 9);
      if (i > 0) expect(planet.azimuth).toBeGreaterThan(planets[i - 1].azimuth);
    });
  });

  it("행성끼리 충분히 떨어져 있다(최소 2.4)", () => {
    let min = Infinity;
    for (let i = 0; i < planets.length; i += 1) {
      for (let j = i + 1; j < planets.length; j += 1) {
        min = Math.min(min, Math.hypot(planets[i].x - planets[j].x, planets[i].z - planets[j].z));
      }
    }
    expect(min).toBeGreaterThan(2.4);
  });
});

describe("rotateByTime", () => {
  // 셰이더 식에서 계수를 읽어 같은 각도를 계산한다.
  const match = ROTATION_GLSL.match(
    /^atan\(p\.z, p\.x\) - uTime \* \(([\d.]+) \+ ([\d.]+) \/ \(1\.0 \+ r\)\)$/
  );
  const shaderAngle = (p, uTime) => {
    const r = Math.hypot(p.x, p.z);
    return Math.atan2(p.z, p.x) - uTime * (Number(match[1]) + Number(match[2]) / (1 + r));
  };

  it("셰이더 식이 기대한 형태다", () => {
    expect(match).not.toBeNull();
    expect(Number(match[1])).toBe(0.05);
    expect(Number(match[2])).toBe(0.04);
  });

  it("셰이더 식과 같은 각도·반경으로 돌리고 y는 유지한다", () => {
    const planets = createPlanets(5);
    [0, 0.5, 13.7, 250, 3600].forEach((uTime) => {
      planets.forEach((planet) => {
        const rotated = rotateByTime(planet, uTime);
        const angle = shaderAngle(planet, uTime);
        expect(rotated.x).toBeCloseTo(Math.cos(angle) * planet.radius, 9);
        expect(rotated.z).toBeCloseTo(Math.sin(angle) * planet.radius, 9);
        expect(rotated.y).toBe(planet.y);
      });
    });
  });
});

describe("위성 고리", () => {
  const FRONT = (n) => ({ x: 0, y: -ringRadius(n) * Math.sin(RING_TILT), z: ringRadius(n) * Math.cos(RING_TILT) });

  it("고리 반지름 0.2 + 0.012·n, 시간·각도와 무관하게 일정", () => {
    COUNTS.forEach((n) => {
      for (let i = 0; i < n; i += 1) {
        [0, 0.7, -2.4, 13].forEach((angle) => {
          const p = satellitePosition(n, i, angle);
          expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(ringRadius(n), 9);
        });
      }
    });
  });

  it("위성 간격은 같은 각도(2π/n)이고 고리는 14° 기울어 있다", () => {
    COUNTS.forEach((n) => {
      const points = Array.from({ length: n }, (_, i) => satellitePosition(n, i, 0.3));
      const chord = 2 * ringRadius(n) * Math.sin(Math.PI / n);
      points.forEach((p, i) => {
        const next = points[(i + 1) % n];
        expect(Math.hypot(p.x - next.x, p.y - next.y, p.z - next.z)).toBeCloseTo(chord, 9);
        // 고리 평면의 법선(0, cos t, sin t)에 수직
        expect(p.y * Math.cos(RING_TILT) + p.z * Math.sin(RING_TILT)).toBeCloseTo(0, 9);
      });
    });
  });

  it("ringAngle(n, j)이면 위성 j가 앞 자리(+z, 조금 아래)에 온다", () => {
    COUNTS.forEach((n) => {
      for (let j = 0; j < n; j += 1) {
        const p = satellitePosition(n, j, ringAngle(n, j));
        const front = FRONT(n);
        expect(p.x).toBeCloseTo(front.x, 9);
        expect(p.y).toBeCloseTo(front.y, 9);
        expect(p.z).toBeCloseTo(front.z, 9);
        // 다른 위성은 앞 자리에 있지 않다.
        for (let i = 0; i < n; i += 1) {
          if (i === j) continue;
          const other = satellitePosition(n, i, ringAngle(n, j));
          expect(other.z).toBeLessThan(front.z - 1e-6);
        }
      }
    });
  });

  it("ringAngle은 연속이고 위성 사이에서는 그 사이 각도", () => {
    expect(ringAngle(4, 0)).toBeCloseTo(0, 12);
    expect(ringAngle(4, 1)).toBeCloseTo(-Math.PI / 2, 12);
    expect(ringAngle(4, 1.5)).toBeCloseTo(-0.75 * Math.PI, 12);
    expect(ringAngle(0, 3)).toBe(0);
  });
});
