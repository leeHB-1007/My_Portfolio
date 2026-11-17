import { describe, expect, it } from "vitest";

import { createJourneyLayout, journeyStops } from "./journeyPose";
import {
  STEP_TIMING,
  createGlide,
  glideAt,
  glideVelocity,
  stepDuration,
  stopAt,
} from "./stepMotion";

const COUNTS = [5, 4, 9, 6, 6];
const layout = createJourneyLayout(
  COUNTS.map((count, i) => ({ id: `c${i}`, items: Array.from({ length: count }, () => ({})) }))
);
const stops = journeyStops(layout);

describe("glide", () => {
  it("시작·끝 위치, 끝 이후 고정, 단조 증가(ease-in-out)", () => {
    const glide = createGlide({ from: 100, to: 900, duration: 2 });
    expect(glideAt(glide, 0)).toBe(100);
    expect(glideAt(glide, 2)).toBe(900);
    expect(glideAt(glide, 5)).toBe(900);
    let previous = -Infinity;
    for (let t = 0; t <= 2; t += 0.01) {
      const value = glideAt(glide, t);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
    // 가감속: 처음과 끝의 속도가 0, 가운데가 가장 빠르다.
    expect(glideVelocity(glide, 0)).toBeCloseTo(0, 9);
    expect(Math.abs(glideVelocity(glide, 1.999))).toBeLessThan(5);
    expect(glideVelocity(glide, 1)).toBeGreaterThan(glideVelocity(glide, 0.3));
  });

  it("뒤로 가는 이동도 단조 감소", () => {
    const glide = createGlide({ from: 900, to: 100, duration: 1 });
    let previous = Infinity;
    for (let t = 0; t <= 1; t += 0.01) {
      const value = glideAt(glide, t);
      expect(value).toBeLessThanOrEqual(previous + 1e-9);
      previous = value;
    }
  });

  it("이어 가기: 출발 속도를 이어받아 다시 가속하지 않고, 지나치지 않는다", () => {
    const first = createGlide({ from: 0, to: 400, duration: 1 });
    const speed = glideVelocity(first, 0.5);
    const next = createGlide({ from: glideAt(first, 0.5), to: 900, duration: 1.5, velocity: speed });
    expect(glideVelocity(next, 0)).toBeCloseTo(speed, 6);
    let previous = -Infinity;
    for (let t = 0; t <= 1.5; t += 0.01) {
      const value = glideAt(next, t);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(value).toBeLessThanOrEqual(900 + 1e-9);
      previous = value;
    }
    // 너무 빠른 출발 속도는 잘라 단조성을 지킨다.
    const capped = createGlide({ from: 0, to: 10, duration: 1, velocity: 1000 });
    expect(capped.velocity).toBeLessThanOrEqual(30 + 1e-9);
    // 반대 방향 속도는 이어받지 않는다.
    expect(createGlide({ from: 0, to: 10, duration: 1, velocity: -50 }).velocity).toBe(0);
  });
});

describe("stepDuration", () => {
  const time = (from, to) =>
    stepDuration({
      from,
      to,
      stops,
      distance: (to >= 0 && to < stops.length ? stops[to].at : 0) - (from >= 0 && from < stops.length ? stops[from].at : 0),
    });

  it("같은 챕터 안 한 칸(도착 ↔ 첫 위성 포함)은 item, 챕터를 넘는 한 칸은 chapter", () => {
    expect(time(1, 2)).toBe(STEP_TIMING.item);
    expect(time(0, 1)).toBe(STEP_TIMING.item);
    expect(time(1, 0)).toBe(STEP_TIMING.item);
    // about의 마지막 위성(5) → experience 도착(6)
    expect(stops[5].chapter).not.toBe(stops[6].chapter);
    expect(time(5, 6)).toBe(STEP_TIMING.chapter);
    expect(time(6, 5)).toBe(STEP_TIMING.chapter);
  });

  it("Hero ↔ 첫 챕터, 마지막 ↔ Contact는 edge", () => {
    expect(time(-1, 0)).toBe(STEP_TIMING.edge);
    expect(time(0, -1)).toBe(STEP_TIMING.edge);
    expect(time(stops.length - 1, stops.length)).toBe(STEP_TIMING.edge);
    expect(time(stops.length, stops.length - 1)).toBe(STEP_TIMING.edge);
  });

  it("여러 칸 건너뛰기는 거리에 비례하고 상한이 있다", () => {
    const near = time(1, 3);
    const far = time(1, 30);
    expect(near).toBeGreaterThanOrEqual(STEP_TIMING.item);
    expect(far).toBeGreaterThanOrEqual(near);
    expect(far).toBe(STEP_TIMING.max);
    // 정지점 사이(사용자가 직접 스크롤한 위치)에서 출발하면 거리로 정한다.
    expect(stepDuration({ from: null, to: 3, stops, distance: 0.2 })).toBe(STEP_TIMING.item);
  });
});

describe("stopAt", () => {
  const positions = stops.map((stop) => stop.at);

  it("정지점 위·근처면 그 번호, 사이면 null, 앞·뒤 바깥은 Hero(-1)·Contact(length)", () => {
    expect(stopAt(positions, positions[4], 0.05)).toBe(4);
    expect(stopAt(positions, positions[4] + 0.04, 0.05)).toBe(4);
    expect(stopAt(positions, (positions[4] + positions[5]) / 2, 0.05)).toBeNull();
    expect(stopAt(positions, -1, 0.05)).toBe(-1);
    expect(stopAt(positions, layout.total + 1, 0.05)).toBe(positions.length);
  });
});
