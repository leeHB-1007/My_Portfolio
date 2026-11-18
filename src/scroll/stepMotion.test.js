import { describe, expect, it } from "vitest";

import { STOP_TOLERANCE, createJourneyLayout, journeyStops } from "./journeyPose";
import {
  SNAP_TIMING,
  FOCUS_TIME,
  STEP_TIMING,
  snapIntent,
  snapTargetIndex,
  createGlide,
  glideAt,
  glideVelocity,
  stepDuration,
  stopAt,
  WHEEL_GESTURE,
  wheelGestureStep,
} from "./stepMotion";

const COUNTS = [5, 4, 9, 6, 6];
const layout = createJourneyLayout(
  COUNTS.map((count, i) => ({ id: `c${i}`, items: Array.from({ length: count }, () => ({})) }))
);
const stops = journeyStops(layout);

describe("glide", () => {
  it("집중 구간: 화면이 바뀌는 구간에 시간 대부분을 쓰고, 끝·연속·단조를 지킨다", () => {
    const glide = createGlide({ from: 0, to: 1000, duration: 1, focus: { start: 0.4, end: 0.7 } });
    expect(glideAt(glide, 0)).toBe(0);
    expect(glideAt(glide, 1)).toBe(1000);
    expect(glideVelocity(glide, 0)).toBeCloseTo(0, 9);
    expect(Math.abs(glideVelocity(glide, 0.99999))).toBeLessThan(5);
    let previous = -Infinity;
    let inFocus = 0;
    const dt = 0.001;
    for (let t = 0; t <= 1; t += dt) {
      const value = glideAt(glide, t);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      if (value >= 400 && value <= 700) inFocus += dt;
      previous = value;
    }
    expect(inFocus).toBeCloseTo(1 - 2 * FOCUS_TIME.lead, 2);
    // 구간 경계에서 속도가 이어진다.
    const edge = FOCUS_TIME.lead;
    const jump = (at) => Math.abs(glideVelocity(glide, at - 1e-6) - glideVelocity(glide, at + 1e-6));
    expect(jump(edge)).toBeLessThan(1);
    expect(jump(1 - edge)).toBeLessThan(1);
    // 위쪽(거리 음수)도 같다.
    const up = createGlide({ from: 1000, to: 0, duration: 1, focus: { start: 0.3, end: 0.6 } });
    expect(glideAt(up, 0.5)).toBeLessThan(1000 - 300);
    expect(glideAt(up, 0.5)).toBeGreaterThan(1000 - 600);
  });

  it("집중 구간이 끝에 붙어 있거나 비어 있으면 그에 맞게 처리한다", () => {
    const flat = createGlide({ from: 0, to: 100, duration: 1, focus: { start: 0.5, end: 0.5 } });
    expect(flat.focus).toBeNull();
    const edge = createGlide({ from: 0, to: 100, duration: 1, focus: { start: 0, end: 0.5 } });
    expect(glideAt(edge, 1)).toBe(100);
    expect(glideAt(edge, 0.5)).toBeGreaterThan(0);
  });

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

describe("정착(스냅)", () => {
  const positions = stops.map((stop) => stop.at);
  const bounds = { start: 0, end: layout.total };
  const tolerance = STOP_TOLERANCE;

  it("가장 가까운 정지점으로, 이미 근처면 움직이지 않는다", () => {
    const between = positions[4] + (positions[5] - positions[4]) * 0.3;
    expect(snapTargetIndex(positions, between, tolerance, bounds)).toBe(4);
    const later = positions[4] + (positions[5] - positions[4]) * 0.7;
    expect(snapTargetIndex(positions, later, tolerance, bounds)).toBe(5);
    expect(snapTargetIndex(positions, positions[4] + 0.03, tolerance, bounds)).toBe(-1);
  });

  it("이동 구간 한가운데서는 이전 챕터 마지막 또는 다음 챕터 도착 중 가까운 쪽", () => {
    const lastOfFirst = positions[5];
    const nextArrive = positions[6];
    const nearPrevious = lastOfFirst + (nextArrive - lastOfFirst) * 0.4;
    const nearNext = lastOfFirst + (nextArrive - lastOfFirst) * 0.6;
    expect(snapTargetIndex(positions, nearPrevious, tolerance, bounds)).toBe(5);
    expect(snapTargetIndex(positions, nearNext, tolerance, bounds)).toBe(6);
  });

  it("트랙 밖(Hero·Contact)과 트랙 시작·끝이 더 가까운 곳에서는 정착하지 않는다", () => {
    expect(snapTargetIndex(positions, -0.5, tolerance, bounds)).toBe(-1);
    expect(snapTargetIndex(positions, layout.total + 0.5, tolerance, bounds)).toBe(-1);
    expect(snapTargetIndex(positions, 0.1, tolerance, bounds)).toBe(-1);
    expect(snapTargetIndex(positions, layout.total - 0.05, tolerance, bounds)).toBe(-1);
  });

  it("스크롤한 방향이 있으면 가깝지 않아도 그 방향의 다음 정지점으로", () => {
    const justPast = positions[4] + (positions[5] - positions[4]) * 0.3;
    expect(snapTargetIndex(positions, justPast, tolerance, bounds, 1)).toBe(5);
    expect(snapTargetIndex(positions, justPast, tolerance, bounds, -1)).toBe(4);
    // 챕터 사이 이동 구간에서도 같다.
    const leaving = positions[5] + (positions[6] - positions[5]) * 0.2;
    expect(snapTargetIndex(positions, leaving, tolerance, bounds, 1)).toBe(6);
    expect(snapTargetIndex(positions, leaving, tolerance, bounds, -1)).toBe(5);
    // 이미 정지점 근처면 방향이 있어도 움직이지 않는다.
    expect(snapTargetIndex(positions, positions[4] + 0.03, tolerance, bounds, 1)).toBe(-1);
  });

  it("이번 스크롤이 정지점을 지나쳤으면 지나친 정지점과 다음 정지점 중 가까운 쪽으로", () => {
    const gap = positions[5] - positions[4];
    // 4에서 출발해 5를 조금 지나침 → 5로 돌아온다(6으로 넘어가지 않는다).
    const overshoot = positions[5] + gap * 0.3;
    expect(snapTargetIndex(positions, overshoot, tolerance, bounds, 1, positions[4])).toBe(5);
    // 6에 더 가까우면 6으로
    const almostNext = positions[5] + (positions[6] - positions[5]) * 0.7;
    expect(snapTargetIndex(positions, almostNext, tolerance, bounds, 1, positions[4])).toBe(6);
    // 위로도 같다.
    const overshootUp = positions[4] - (positions[4] - positions[3]) * 0.3;
    expect(snapTargetIndex(positions, overshootUp, tolerance, bounds, -1, positions[5])).toBe(4);
    // 출발점의 정지점은 지나친 것으로 치지 않는다(조금 내렸으면 다음 정지점으로).
    const justPast = positions[4] + gap * 0.3;
    expect(snapTargetIndex(positions, justPast, tolerance, bounds, 1, positions[4])).toBe(5);
    expect(snapTargetIndex(positions, justPast, tolerance, bounds, 1, positions[4] + tolerance)).toBe(5);
  });

  it("방향 쪽에 정지점이 없으면(Hero·Contact로 나가는 중) 정착하지 않는다", () => {
    const last = positions[positions.length - 1];
    expect(snapTargetIndex(positions, positions[0] - 0.3, tolerance, bounds, -1)).toBe(-1);
    expect(snapTargetIndex(positions, positions[0] - 0.3, tolerance, bounds, 1)).toBe(0);
    const afterLast = (last + layout.total) / 2;
    expect(afterLast - last).toBeGreaterThan(tolerance);
    expect(snapTargetIndex(positions, afterLast, tolerance, bounds, 1)).toBe(-1);
    expect(snapTargetIndex(positions, afterLast, tolerance, bounds, -1)).toBe(positions.length - 1);
    expect(snapTargetIndex(positions, -0.5, tolerance, bounds, 1)).toBe(-1);
  });

  it("스크롤이 없었으면 정착하지 않고, 움직였으면 마지막 방향을, 제자리면 방향 없음을 돌려준다", () => {
    // 탭·클릭·빈 휠만 있었던 경우
    expect(snapIntent(null, 500, 1)).toBeNull();
    expect(snapIntent(500, 500 + SNAP_TIMING.minMove + 1, 1)).toBe(1);
    expect(snapIntent(500, 500 - 40, -1)).toBe(-1);
    // 아래로 많이 갔다가 조금 되돌린 경우: 마지막 방향(위)을 따른다.
    expect(snapIntent(500, 900, -1)).toBe(-1);
    expect(snapIntent(500, 500 + SNAP_TIMING.minMove, 1)).toBe(0);
  });

  it("방향키 두 번(정지점에서 tolerance 밖으로 조금 벗어남)이면 되돌아가지 않고 다음 정지점으로", () => {
    // minMove가 px 단위이므로 화면 높이 900px 기준의 px 위치로 계산한다.
    const vh = 900;
    const px = positions.map((value) => value * vh);
    const pxTolerance = tolerance * vh;
    const pxBounds = { start: 0, end: layout.total * vh };
    const first = px[4] + 40;
    const second = px[4] + 80;
    expect(40).toBeLessThan(pxTolerance);
    expect(80).toBeGreaterThan(pxTolerance);
    expect(snapTargetIndex(px, first, pxTolerance, pxBounds, snapIntent(px[4], first, 1))).toBe(-1);
    expect(snapTargetIndex(px, second, pxTolerance, pxBounds, snapIntent(first, second, 1))).toBe(5);
  });
});


describe("휠 제스처 넘기기", () => {
  const { gapMs } = WHEEL_GESTURE;

  it("새 제스처는 넘기고, 같은 방향으로 촘촘히 이어지며 줄어드는 입력(관성)은 무시한다", () => {
    expect(wheelGestureStep({ dir: 0, delta: 0 }, 1, 30, 10)).toBe(1);
    expect(wheelGestureStep({ dir: 1, delta: 30 }, 1, 25, 16)).toBe(0);
    expect(wheelGestureStep({ dir: 1, delta: 100 }, 1, 100, 60)).toBe(0);
  });

  it("잠깐 쉬었다 굴리거나, 관성 중에 다시 세게 밀면 넘긴다", () => {
    expect(wheelGestureStep({ dir: 1, delta: 30 }, 1, 30, gapMs)).toBe(1);
    expect(wheelGestureStep({ dir: 1, delta: 5 }, 1, 20, 16)).toBe(1);
    // 아주 작은 입력의 흔들림은 새로 민 것으로 보지 않는다.
    expect(wheelGestureStep({ dir: 1, delta: 1 }, 1, 2, 16)).toBe(0);
  });

  it("방향을 바꾸면 바로 넘긴다", () => {
    expect(wheelGestureStep({ dir: 1, delta: 30 }, -1, 30, 16)).toBe(-1);
    expect(wheelGestureStep({ dir: -1, delta: 30 }, 1, 30, 16)).toBe(1);
  });
});
