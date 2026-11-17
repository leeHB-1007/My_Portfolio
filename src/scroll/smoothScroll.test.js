import { describe, expect, it } from "vitest";

import { SMOOTH_SCROLL, decayLag, followScroll, shouldJumpScroll } from "./smoothScroll";

describe("followScroll", () => {
  it("프레임률과 무관하게 같은 시간에 같은 만큼 따라온다", () => {
    let fast = 0;
    for (let i = 0; i < 12; i += 1) fast = followScroll(fast, 1000, 1 / 120);
    let slow = 0;
    for (let i = 0; i < 6; i += 1) slow = followScroll(slow, 1000, 1 / 60);
    expect(fast).toBeCloseTo(slow, 6);
  });

  it("약 3τ(0.4초) 안에 대부분 도달하고, 0.5px 안이면 맞춘다", () => {
    let value = 0;
    for (let t = 0; t < 3 * SMOOTH_SCROLL.tau; t += 1 / 60) value = followScroll(value, 1000, 1 / 60);
    expect(value).toBeGreaterThan(940);
    expect(value).toBeLessThan(1000);
    expect(followScroll(999.7, 1000, 1 / 60)).toBe(1000);
    for (let i = 0; i < 300; i += 1) value = followScroll(value, 1000, 1 / 60);
    expect(value).toBe(1000);
  });

  it("뒤로도 지나치지 않고 단조롭게 따라오며, 첫 값이 없으면 바로 맞춘다", () => {
    let value = 2000;
    let previous = value;
    for (let i = 0; i < 60; i += 1) {
      value = followScroll(value, 500, 1 / 60);
      expect(value).toBeLessThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(500);
      previous = value;
    }
    expect(followScroll(null, 300, 1 / 60)).toBe(300);
    expect(followScroll(0, 300, 0)).toBe(0);
  });
});

describe("shouldJumpScroll", () => {
  const base = { first: false, remeasured: false, previousRaw: 1000, raw: 1100, vh: 900 };

  it("평소(휠 한 칸, CSS smooth 앵커 이동)에는 보간한다", () => {
    expect(shouldJumpScroll(base)).toBe(false);
    expect(shouldJumpScroll({ ...base, raw: 1000 + 2.9 * 900 })).toBe(false);
  });

  it("첫 프레임·재측정·한 프레임에 화면 3개 이상 이동이면 바로 맞춘다", () => {
    expect(shouldJumpScroll({ ...base, first: true })).toBe(true);
    expect(shouldJumpScroll({ ...base, remeasured: true })).toBe(true);
    expect(shouldJumpScroll({ ...base, raw: 1000 + 3 * 900 })).toBe(true);
    expect(shouldJumpScroll({ ...base, raw: 1000 - 5 * 900 })).toBe(true);
  });
});

describe("decayLag", () => {
  it("남은 지연을 시간 상수에 따라 줄이고 충분히 작아지면 0으로 맞춘다", () => {
    expect(decayLag(-40, SMOOTH_SCROLL.tau)).toBeCloseTo(-40 / Math.E, 9);
    expect(decayLag(40, 0)).toBe(40);
    let lag = -40;
    let frames = 0;
    while (lag !== 0 && frames < 600) {
      const next = decayLag(lag, 1 / 60);
      expect(Math.abs(next)).toBeLessThan(Math.abs(lag));
      lag = next;
      frames += 1;
    }
    expect(lag).toBe(0);
    expect(frames).toBeLessThan(60);
    expect(decayLag(NaN, 1 / 60)).toBe(0);
  });
});
