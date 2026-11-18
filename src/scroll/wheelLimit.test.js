import { describe, expect, it } from "vitest";

import { WHEEL_LIMIT, addPending, drainPending, wheelDeltaPx } from "./wheelLimit";

const VH = 900;

describe("wheelDeltaPx", () => {
  it("px·줄·페이지 단위를 px로 바꾼다", () => {
    expect(wheelDeltaPx(100, 0, VH)).toBe(100);
    expect(wheelDeltaPx(3, 1, VH)).toBe(3 * WHEEL_LIMIT.linePx);
    expect(wheelDeltaPx(-1, 2, VH)).toBe(-VH);
    expect(wheelDeltaPx(NaN, 0, VH)).toBe(0);
  });
});

describe("addPending", () => {
  it("같은 방향은 쌓고, 최대치를 넘으면 자른다", () => {
    expect(addPending(100, 100, VH)).toBe(200);
    expect(addPending(0, 5000, VH)).toBe(WHEEL_LIMIT.maxPending * VH);
    expect(addPending(0, -5000, VH)).toBe(-WHEEL_LIMIT.maxPending * VH);
  });

  it("방향이 바뀌면 이전 입력을 버린다", () => {
    expect(addPending(300, -100, VH)).toBe(-100);
  });
});

describe("drainPending", () => {
  it("느린 입력은 그 프레임에 바로 다 내보낸다", () => {
    expect(drainPending(10, 1 / 60, VH)).toEqual({ move: 10, pending: 0 });
  });

  it("빠른 입력은 초당 maxSpeed까지만 내보낸다", () => {
    const cap = (WHEEL_LIMIT.maxSpeed * VH) / 60;
    const { move, pending } = drainPending(400, 1 / 60, VH);
    expect(move).toBeCloseTo(cap, 9);
    expect(pending).toBeCloseTo(400 - cap, 9);
    expect(drainPending(-400, 1 / 60, VH).move).toBeCloseTo(-cap, 9);
  });

  it("아무리 빨리 돌려도 1초에 maxSpeed 화면 넘게 움직이지 않는다", () => {
    let pending = 0;
    let moved = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      pending = addPending(pending, 1000, VH);
      const step = drainPending(pending, 1 / 60, VH);
      pending = step.pending;
      moved += step.move;
    }
    expect(moved).toBeLessThanOrEqual(WHEEL_LIMIT.maxSpeed * VH + 1e-6);
  });
});
