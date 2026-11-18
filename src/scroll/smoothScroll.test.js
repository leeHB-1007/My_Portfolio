import { describe, expect, it } from "vitest";

import { SMOOTH_SCROLL, followScroll, restScroll, shouldJumpScroll } from "./smoothScroll";
import { addPending, drainPending } from "./wheelLimit";

const run = (state, target, seconds, dt = 1 / 60) => {
  let next = state;
  for (let t = 0; t < seconds - 1e-9; t += dt) next = followScroll(next, target, dt);
  return next;
};

describe("followScroll", () => {
  it("프레임률과 무관하게 같은 시간에 같은 만큼 따라온다", () => {
    const fast = run(restScroll(0), 1000, 0.1, 1 / 120);
    const slow = run(restScroll(0), 1000, 0.1, 1 / 60);
    expect(fast.position).toBeCloseTo(slow.position, 6);
    expect(fast.velocity).toBeCloseTo(slow.velocity, 6);
  });

  it("목표가 뛰어도 속도는 0에서 부드럽게 올라간다(한 프레임에 튀지 않는다)", () => {
    const first = followScroll(restScroll(0), 100, 1 / 60);
    const second = followScroll(first, 100, 1 / 60);
    const omega = 2 / SMOOTH_SCROLL.smoothTime;
    expect(first.velocity).toBeGreaterThan(0);
    expect(first.velocity).toBeLessThan(second.velocity);
    expect(second.velocity).toBeLessThanOrEqual((100 * omega) / Math.E + 1e-9);
  });

  it("항해 구간(휠 속도 상한을 거친 입력)에서는 휠 칸마다 속도가 크게 맥동하지 않는다", () => {
    const vh = 900;
    let state = restScroll(0);
    let raw = 0;
    let pending = 0;
    const speeds = [];
    for (let frame = 0; frame < 36; frame += 1) {
      if (frame % 6 === 0) pending = addPending(pending, 100, vh);
      const step = drainPending(pending, 1 / 60, vh);
      pending = step.pending;
      raw += step.move;
      state = followScroll(state, raw, 1 / 60);
      if (frame >= 18) speeds.push(state.velocity);
    }
    // 이전 1차 지수 보간은 같은 입력에서 약 2배로 맥동했다.
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeLessThan(1.7);
  });

  // 트랙 밖에서는 브라우저가 휠을 자체적으로 부드럽게 스크롤하므로 이렇게 계단처럼 들어오는 경우는 드물다.
  it("휠 칸마다 속도가 0까지 떨어지지 않고 이어진다(상한 없는 계단 입력)", () => {
    let state = restScroll(0);
    let target = 0;
    const speeds = [];
    for (let frame = 0; frame < 24; frame += 1) {
      if (frame % 6 === 0) target += 100;
      state = followScroll(state, target, 1 / 60);
      if (frame >= 12) speeds.push(state.velocity);
    }
    expect(Math.min(...speeds)).toBeGreaterThan(0);
  });

  it("0.15초 안에 대부분 도달하고, 충분히 가깝고 느리면 맞추고 멈춘다", () => {
    let state = run(restScroll(0), 1000, 0.15);
    expect(state.position).toBeGreaterThan(900);
    expect(state.position).toBeLessThan(1000);
    expect(followScroll({ position: 999.8, velocity: 1 }, 1000, 1 / 60)).toEqual(restScroll(1000));
    state = run(state, 1000, 5);
    expect(state).toEqual(restScroll(1000));
  });

  it("멈춰 있다가 따라갈 때는 지나치지 않고 단조롭게 따라오며, 첫 값이 없으면 바로 맞춘다", () => {
    let state = restScroll(2000);
    let previous = state.position;
    for (let i = 0; i < 120; i += 1) {
      state = followScroll(state, 500, 1 / 60);
      expect(state.position).toBeLessThanOrEqual(previous);
      expect(state.position).toBeGreaterThanOrEqual(500);
      previous = state.position;
    }
    expect(followScroll(null, 300, 1 / 60)).toEqual(restScroll(300));
    expect(followScroll(restScroll(0), 300, 0).position).toBe(0);
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
