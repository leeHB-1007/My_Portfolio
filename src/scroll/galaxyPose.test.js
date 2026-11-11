import { describe, expect, it } from "vitest";

import {
  AZIMUTH,
  DRIFT_DIM,
  DRIFT_VEIL,
  ELEVATION,
  MAX_ELEVATION,
  POSE_KEYS,
  RADIUS,
  VIEW_SHIFT_X,
  VIEW_SHIFT_Y,
  computeFit,
  samplePose,
} from "./galaxyPose";

const DEG = Math.PI / 180;

// 1440×900, 문서 길이 약 10화면
const base = {
  heroStart: 0,
  heroEnd: 1980,
  vh: 900,
  maxScroll: 9500,
  aspect: 1440 / 900,
  mode: "pinned",
  wide: true,
};

const at = (scrollY, overrides = {}) =>
  samplePose({ ...base, ...overrides, scrollY });

const sweep = (input, steps = 400) => {
  const from = input.heroStart - 200;
  const to = input.maxScroll + 200;
  return Array.from({ length: steps + 1 }, (_, i) =>
    samplePose({ ...input, scrollY: from + ((to - from) * i) / steps })
  );
};

const expectFinite = (pose) => {
  POSE_KEYS.forEach((key) => expect(Number.isFinite(pose[key])).toBe(true));
};

describe("computeFit", () => {
  it("세로 화면(390×844)은 2.16, 가로 화면(1.6)은 1", () => {
    expect(computeFit(390 / 844)).toBeCloseTo(2.16, 2);
    expect(computeFit(0.46)).toBeCloseTo(1 / 0.46, 6);
    expect(computeFit(1.6)).toBe(1);
  });

  it("범위를 넘으면 1~2.2로 자르고, 잘못된 값은 1", () => {
    expect(computeFit(0.2)).toBe(2.2);
    expect(computeFit(3)).toBe(1);
    expect(computeFit(0)).toBe(1);
    expect(computeFit(NaN)).toBe(1);
  });
});

describe("samplePose", () => {
  it("scrollY ≤ heroStart이면 인트로 시작 pose", () => {
    const start = at(0);
    expect(start.radius).toBeCloseTo(RADIUS.introStart, 6);
    expect(start.azimuth).toBeCloseTo(0, 6);
    expect(start.elevation).toBeCloseTo(ELEVATION.introStart, 6);
    expect(start.dim).toBe(1);
    expect(start.veil).toBe(0);
    expect(start.viewShiftX).toBeCloseTo(VIEW_SHIFT_X, 6);
    expect(start.viewShiftY).toBe(0);
    expect(at(-500)).toEqual(start);
  });

  it("heroEnd에서 인트로 끝 pose", () => {
    const end = at(base.heroEnd);
    expect(end.radius).toBeCloseTo(RADIUS.introEnd, 6);
    expect(end.azimuth).toBeCloseTo(AZIMUTH.introEnd, 6);
    expect(end.elevation).toBeCloseTo(ELEVATION.introEnd, 6);
    expect(end.dim).toBe(1);
    expect(end.veil).toBe(0);
    expect(end.viewShiftX).toBe(0);
    expect(end.viewShiftY).toBe(0);
  });

  it("maxScroll에서 마무리 pose, 그 너머는 clamp", () => {
    const last = at(base.maxScroll);
    expect(last.radius).toBeCloseTo(RADIUS.end, 6);
    expect(last.azimuth).toBeCloseTo(AZIMUTH.end, 6);
    expect(last.elevation).toBeCloseTo(32 * DEG, 6);
    expect(last.dim).toBe(DRIFT_DIM);
    expect(last.veil).toBe(DRIFT_VEIL);
    expect(at(base.maxScroll + 5000)).toEqual(last);
  });

  it("heroEnd + vh에서 베일이 DRIFT_VEIL, 반경은 드리프트 값", () => {
    const pose = at(base.heroEnd + base.vh);
    expect(pose.veil).toBeCloseTo(DRIFT_VEIL, 2);
    expect(pose.radius).toBeCloseTo(RADIUS.drift, 6);
    expect(pose.dim).toBeCloseTo(DRIFT_DIM, 6);
    expect(DRIFT_VEIL).toBe(0.8);
  });

  it("azimuth는 단조 증가하고 radius ≥ 7×fit, elevation ≤ 80°", () => {
    [base, { ...base, aspect: 390 / 844, wide: false }].forEach((input) => {
      const poses = sweep(input);
      const fit = computeFit(input.aspect);
      poses.forEach((pose, i) => {
        expectFinite(pose);
        expect(pose.radius).toBeGreaterThanOrEqual(RADIUS.introEnd * fit - 1e-9);
        expect(pose.elevation).toBeLessThanOrEqual(MAX_ELEVATION);
        expect(pose.veil).toBeGreaterThanOrEqual(0);
        expect(pose.veil).toBeLessThanOrEqual(1);
        if (i > 0) {
          expect(pose.azimuth).toBeGreaterThanOrEqual(poses[i - 1].azimuth);
        }
      });
    });
  });

  it("세로 화면은 모든 radius에 fit을 곱한다", () => {
    const portrait = { aspect: 390 / 844, wide: false };
    const fit = computeFit(portrait.aspect);
    expect(at(0, portrait).radius).toBeCloseTo(RADIUS.introStart * fit, 6);
    expect(at(base.heroEnd, portrait).radius).toBeCloseTo(RADIUS.introEnd * fit, 6);
    expect(at(base.maxScroll, portrait).radius).toBeCloseTo(RADIUS.end * fit, 6);
  });

  it("좁은 화면의 치우침은 아래쪽이고 heroP 0.6에서 0", () => {
    const narrow = { wide: false, aspect: 390 / 844 };
    expect(at(0, narrow).viewShiftY).toBeCloseTo(VIEW_SHIFT_Y, 6);
    expect(at(0, narrow).viewShiftX).toBe(0);
    expect(at(base.heroEnd * 0.6, narrow).viewShiftY).toBeCloseTo(0, 9);
    expect(at(base.heroEnd * 0.6).viewShiftX).toBeCloseTo(0, 9);
  });

  it("짧은 문서에서도 NaN 없이 단조이고 끝에서 마무리 pose", () => {
    [
      { ...base, maxScroll: base.heroEnd + base.vh },
      { ...base, maxScroll: base.heroEnd + 10 },
      { ...base, maxScroll: base.heroEnd },
      { ...base, maxScroll: 0 },
    ].forEach((input) => {
      const poses = sweep(input);
      poses.forEach((pose, i) => {
        expectFinite(pose);
        if (i > 0) {
          expect(pose.azimuth).toBeGreaterThanOrEqual(poses[i - 1].azimuth);
        }
      });

      // 인트로 이후에는 radius·veil이 줄어들지 않는다.
      const after = Array.from({ length: 101 }, (_, i) =>
        samplePose({
          ...input,
          scrollY: input.heroEnd + ((input.maxScroll - input.heroEnd) * i) / 100,
        })
      );
      after.forEach((pose, i) => {
        if (i > 0) {
          expect(pose.radius).toBeGreaterThanOrEqual(after[i - 1].radius - 1e-9);
          expect(pose.veil).toBeGreaterThanOrEqual(after[i - 1].veil - 1e-9);
        }
      });
    });

    const short = { maxScroll: base.heroEnd + base.vh };
    const last = at(short.maxScroll, short);
    expect(last.radius).toBeCloseTo(RADIUS.end, 6);
    expect(last.azimuth).toBeCloseTo(AZIMUTH.end, 6);
    expect(last.veil).toBe(DRIFT_VEIL);
  });

  it("reduced 모드는 scrollY와 무관하게 같은 pose", () => {
    const reduced = { mode: "reduced", aspect: 390 / 844, wide: false };
    const first = at(0, reduced);
    [-100, 500, base.heroEnd, 6000, base.maxScroll, 99999].forEach((y) => {
      expect(at(y, reduced)).toEqual(first);
    });
    expect(first.radius).toBeCloseTo(RADIUS.drift * computeFit(reduced.aspect), 6);
    expect(first.azimuth).toBeCloseTo(AZIMUTH.introEnd, 6);
    expect(first.elevation).toBeCloseTo(ELEVATION.drift, 6);
    expect(first.dim).toBe(DRIFT_DIM);
    expect(first.veil).toBe(DRIFT_VEIL);
  });

  it("flow 모드도 같은 구간표를 따른다", () => {
    const flow = { mode: "flow", heroEnd: 900 };
    expect(at(0, flow).radius).toBeCloseTo(RADIUS.introStart, 6);
    expect(at(900, flow).radius).toBeCloseTo(RADIUS.introEnd, 6);
  });
});
