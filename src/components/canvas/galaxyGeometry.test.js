import { describe, expect, it } from "vitest";

import {
  BLOB_COUNT,
  DUST_COUNT,
  DUST_LANE_COUNT,
  NEBULA_COUNT,
  SPIKE_SCALE,
  createBlobAttributes,
  createNebulaAttributes,
  DUST_MAX_RADIUS,
  DUST_MIN_RADIUS,
  GALAXY_MAX_COUNT,
  GALAXY_RADIUS,
  createDustAttributes,
  createGalaxyAttributes,
} from "./galaxyGeometry";

const radii = (positions, planar = false) => {
  const values = [];
  for (let i = 0; i < positions.length; i += 3) {
    values.push(
      planar
        ? Math.hypot(positions[i], positions[i + 2])
        : Math.hypot(positions[i], positions[i + 1], positions[i + 2])
    );
  }
  return values;
};

const hasNaN = (array) => array.some((value) => Number.isNaN(value));

describe("createGalaxyAttributes", () => {
  const count = GALAXY_MAX_COUNT;
  const galaxy = createGalaxyAttributes({ count, seed: 1 });

  it("같은 시드면 같은 배열을 만든다", () => {
    const again = createGalaxyAttributes({ count, seed: 1 });
    expect(again.positions).toBeInstanceOf(Float32Array);
    expect(again.positions).toEqual(galaxy.positions);
    expect(again.colors).toEqual(galaxy.colors);
    expect(again.scales).toEqual(galaxy.scales);
    expect(again.phases).toEqual(galaxy.phases);
  });

  it("다른 시드면 다른 배열을 만든다", () => {
    const other = createGalaxyAttributes({ count: 100, seed: 2 });
    expect(other.positions).not.toEqual(
      createGalaxyAttributes({ count: 100, seed: 1 }).positions
    );
  });

  it("attribute 길이가 개수와 맞는다", () => {
    expect(galaxy.count).toBe(count);
    expect(galaxy.positions.length).toBe(count * 3);
    expect(galaxy.colors.length).toBe(count * 3);
    expect(galaxy.scales.length).toBe(count);
    expect(galaxy.phases.length).toBe(count);
    expect(galaxy.spikes.length).toBe(count);
  });

  it("크기는 멱분포(대부분 작고 소수만 크다)이고 큰 별만 스파이크를 가진다", () => {
    const scales = Array.from(galaxy.scales);
    const small = scales.filter((value) => value < 0.6).length / count;
    const spiked = Array.from(galaxy.spikes).filter((value) => value === 1).length / count;
    expect(small).toBeGreaterThan(0.7);
    expect(spiked).toBeGreaterThan(0);
    expect(spiked).toBeLessThan(0.03);
    galaxy.spikes.forEach((value, i) => {
      expect(value === 1).toBe(galaxy.scales[i] >= SPIKE_SCALE);
    });
  });

  it("모든 점의 반경이 5 이하다", () => {
    const max = Math.max(...radii(galaxy.positions));
    expect(max).toBeLessThanOrEqual(GALAXY_RADIUS);
  });

  it("NaN이 없고 색은 0~1 범위다", () => {
    expect(hasNaN(galaxy.positions)).toBe(false);
    expect(hasNaN(galaxy.colors)).toBe(false);
    expect(hasNaN(galaxy.scales)).toBe(false);
    expect(galaxy.colors.every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it("앞부분만 그려도 전체 분포를 대표한다(무작위 순서)", () => {
    const prefix = radii(galaxy.positions.subarray(0, 12000 * 3), true);
    const all = radii(galaxy.positions, true);
    const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(Math.abs(mean(prefix) - mean(all))).toBeLessThan(0.05);
  });
});

describe("createDustAttributes", () => {
  const dust = createDustAttributes();

  it("같은 시드면 같은 배열을 만든다", () => {
    expect(createDustAttributes().positions).toEqual(dust.positions);
  });

  it("DUST_COUNT개를 만든다", () => {
    expect(dust.count).toBe(DUST_COUNT);
    expect(dust.positions.length).toBe(DUST_COUNT * 3);
    expect(dust.colors.length).toBe(DUST_COUNT * 3);
  });

  it("반경 60~110 구 껍질 안에 있고 NaN이 없다", () => {
    const values = radii(dust.positions);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(DUST_MIN_RADIUS);
    expect(Math.max(...values)).toBeLessThanOrEqual(DUST_MAX_RADIUS);
    expect(hasNaN(dust.positions)).toBe(false);
    expect(hasNaN(dust.colors)).toBe(false);
  });
});

describe("createNebulaAttributes", () => {
  const nebula = createNebulaAttributes();

  it("같은 시드면 같은 배열이고 성운 + 먼지 개수만큼 만든다", () => {
    expect(createNebulaAttributes().positions).toEqual(nebula.positions);
    expect(nebula.count).toBe(NEBULA_COUNT + DUST_LANE_COUNT);
    expect(nebula.positions.length).toBe(nebula.count * 3);
    expect(Array.from(nebula.kinds).filter((kind) => kind === 1)).toHaveLength(DUST_LANE_COUNT);
  });

  it("은하 원반 안(반경 5 이하, 얇은 두께)에 있고 NaN이 없다", () => {
    expect(Math.max(...radii(nebula.positions, true))).toBeLessThanOrEqual(GALAXY_RADIUS + 0.6);
    for (let i = 1; i < nebula.positions.length; i += 3) {
      expect(Math.abs(nebula.positions[i])).toBeLessThan(0.3);
    }
    expect(hasNaN(nebula.positions)).toBe(false);
    expect(nebula.colors.every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});

describe("createBlobAttributes", () => {
  it("배경 구 껍질 위의 색 얼룩", () => {
    const blobs = createBlobAttributes();
    expect(blobs.count).toBe(BLOB_COUNT);
    radii(blobs.positions).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(DUST_MIN_RADIUS);
      expect(value).toBeLessThanOrEqual(DUST_MAX_RADIUS);
    });
    expect(hasNaN(blobs.colors)).toBe(false);
  });
});
