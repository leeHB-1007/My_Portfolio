import { describe, expect, it } from "vitest";

import {
  DUST_COUNT,
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

  it("2,000개를 만든다", () => {
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
