import { describe, expect, it } from "vitest";

import { createPlanets, rotateByTime } from "../journey/planets";
import { AZIMUTH, ELEVATION, POSE_KEYS, RADIUS, samplePose } from "./galaxyPose";
import {
  ANCHOR_U,
  ARRIVE_VH,
  ITEM_VH,
  JOURNEY_CAMERA,
  JOURNEY_VIEWS,
  ROTATE_END,
  TRAVEL_VH,
  createJourneyLayout,
  itemOffset,
  journeyAnchors,
  sampleJourney,
  panelState,
} from "./journeyPose";

const DEG = Math.PI / 180;
const COUNTS = [5, 4, 9, 6, 6];
const IDS = ["about", "experience", "skills", "projects", "strengths"];

const chapters = IDS.map((id, i) => ({
  id,
  items: Array.from({ length: COUNTS[i] }, (_, j) => ({ id: `${id}-${j}` })),
}));
const layout = createJourneyLayout(chapters);
const planets = createPlanets(chapters.length);

// 1440×900: 인트로 끝 1080, 항해 스테이지는 인트로 끝부터 고정된다.
const VH = 900;
const HERO_END = 1080;
const JOURNEY = {
  start: HERO_END,
  end: HERO_END + layout.total * VH,
  layout,
  planets,
};
const base = {
  heroStart: 0,
  heroEnd: HERO_END,
  vh: VH,
  maxScroll: JOURNEY.end + 1400,
  aspect: 1440 / 900,
  mode: "pinned",
  wide: true,
  journey: JOURNEY,
  time: 0,
};
const at = (scrollY, overrides = {}) => samplePose({ ...base, ...overrides, scrollY });
const yAt = (distance) => JOURNEY.start + distance * VH;

const expectSamePose = (a, b, digits = 6) => {
  POSE_KEYS.forEach((key) => expect(a[key]).toBeCloseTo(b[key], digits));
};

describe("createJourneyLayout", () => {
  it("챕터 = 이동 1.0 + 도착 0.6 + 위성 n×0.42, 길이 합", () => {
    expect(layout.segments).toHaveLength(5);
    expect(layout.itemCount).toBe(30);
    let start = 0;
    let firstItem = 0;
    layout.segments.forEach((segment, i) => {
      expect(segment.count).toBe(COUNTS[i]);
      expect(segment.start).toBeCloseTo(start, 9);
      expect(segment.firstItem).toBe(firstItem);
      expect(segment.length).toBeCloseTo(TRAVEL_VH + ARRIVE_VH + COUNTS[i] * ITEM_VH, 9);
      start += segment.length;
      firstItem += COUNTS[i];
    });
    expect(layout.total).toBeCloseTo(5 * (TRAVEL_VH + ARRIVE_VH) + 30 * ITEM_VH, 9);
  });

  it("앵커는 각 챕터 첫 위성의 u = 0.5", () => {
    const anchors = journeyAnchors(layout);
    expect(anchors.map((anchor) => anchor.id)).toEqual(IDS);
    anchors.forEach((anchor, i) => {
      const state = sampleJourney(layout, anchor.at);
      expect(state).toMatchObject({ index: i, phase: "item", item: 0 });
      expect(state.u).toBeCloseTo(ANCHOR_U, 9);
      const panel = panelState(layout, state);
      expect(panel.panels).toEqual([{ index: i, k: 1 }]);
      expect(panel.items).toContainEqual({ index: layout.segments[i].firstItem, k: 1 });
    });
  });
});

describe("sampleJourney", () => {
  it("단계·위성 번호·u와 경계", () => {
    const second = layout.segments[1];
    expect(sampleJourney(layout, 0)).toMatchObject({ index: 0, phase: "travel", t: 0 });
    expect(sampleJourney(layout, second.start)).toMatchObject({
      index: 1,
      phase: "travel",
      t: 0,
    });
    const halfway = sampleJourney(layout, second.start + TRAVEL_VH / 2);
    expect(halfway.phase).toBe("travel");
    expect(halfway.t).toBeCloseTo(0.5, 9);
    expect(sampleJourney(layout, second.start + TRAVEL_VH)).toMatchObject({
      index: 1,
      phase: "arrive",
    });
    const firstItem = sampleJourney(layout, second.start + TRAVEL_VH + ARRIVE_VH + 1e-9);
    expect(firstItem).toMatchObject({ index: 1, phase: "item", item: 0 });
    expect(firstItem.u).toBeCloseTo(0, 6);
    const third = sampleJourney(layout, itemOffset(second, 2, 0.25));
    expect(third).toMatchObject({ index: 1, phase: "item", item: 2 });
    expect(third.u).toBeCloseTo(0.25, 9);
    const before = sampleJourney(layout, second.start - 1e-9);
    expect(before).toMatchObject({ index: 0, phase: "item", item: 4 });
    expect(before.u).toBeCloseTo(1, 6);
  });

  it("범위 밖과 잘못된 값은 clamp", () => {
    expect(sampleJourney(layout, -5)).toMatchObject({ index: 0, phase: "travel", t: 0 });
    expect(sampleJourney(layout, NaN)).toMatchObject({ index: 0, phase: "travel", t: 0 });
    expect(sampleJourney(layout, layout.total + 3)).toMatchObject({
      index: 4,
      phase: "item",
      item: 5,
      u: 1,
      s: 1,
    });
  });

  it("고리: 위성 j의 정지 구간(u ≥ 0.3)에서 앞 자리 번호는 j, 그 앞에서는 j−1 → j", () => {
    layout.segments.forEach((segment) => {
      for (let j = 0; j < segment.count; j += 1) {
        [ROTATE_END, 0.5, 0.99].forEach((u) => {
          expect(sampleJourney(layout, itemOffset(segment, j, u)).ring).toBeCloseTo(j, 9);
        });
        if (j > 0) {
          const middle = sampleJourney(layout, itemOffset(segment, j, ROTATE_END / 2)).ring;
          expect(middle).toBeGreaterThan(j - 1);
          expect(middle).toBeLessThan(j);
          expect(sampleJourney(layout, itemOffset(segment, j, 0)).ring).toBeCloseTo(j - 1, 9);
        }
      }
      expect(sampleJourney(layout, segment.start + TRAVEL_VH + ARRIVE_VH / 2).ring).toBe(0);
    });
  });
});

describe("panelState", () => {
  const segment = layout.segments[1];
  const at = (distance) => panelState(layout, sampleJourney(layout, distance));
  const shown = (list) => list.filter((entry) => entry.k > 0);

  it("도착 단계: 패널과 안내만, 위성 본문 없음", () => {
    const state = at(segment.start + TRAVEL_VH + ARRIVE_VH / 2);
    expect(state.panels).toEqual([{ index: 1, k: 1 }]);
    expect(state.hints).toEqual([{ index: 1, k: 1 }]);
    expect(shown(state.items)).toEqual([]);
  });

  it("위성 단계: 같은 패널이 그대로이고 본문만 교차 페이드", () => {
    for (let j = 0; j < segment.count; j += 1) {
      [0.05, 0.15, 0.5, 0.99].forEach((u) => {
        expect(at(itemOffset(segment, j, u)).panels).toEqual([{ index: 1, k: 1 }]);
      });
      const still = at(itemOffset(segment, j, 0.5));
      expect(shown(still.items)).toEqual([{ index: segment.firstItem + j, k: 1 }]);
      expect(shown(still.hints)).toEqual([]);
      // 바뀌는 중에는 이전 본문(첫 위성은 도착 안내)이 사라지고 새 본문이 나타난다.
      const crossing = at(itemOffset(segment, j, 0.15));
      const incoming = crossing.items.find((entry) => entry.index === segment.firstItem + j);
      expect(incoming.k).toBeGreaterThan(0);
      expect(incoming.k).toBeLessThan(1);
      const outgoing = j > 0
        ? crossing.items.find((entry) => entry.index === segment.firstItem + j - 1)
        : crossing.hints.find((entry) => entry.index === 1);
      expect(outgoing.k).toBeGreaterThan(0);
      expect(outgoing.k).toBeLessThan(1);
    }
  });

  it("다음 이동이 시작되면 떠나는 패널이 사라지고 새 패널이 이동 끝에 나타난다", () => {
    const next = layout.segments[2];
    const start = at(next.start + 0.001);
    expect(start.panels.find((entry) => entry.index === 1).k).toBeGreaterThan(0.9);
    expect(start.panels.find((entry) => entry.index === 2).k).toBe(0);
    const middle = at(next.start + TRAVEL_VH / 2);
    expect(shown(middle.panels)).toEqual([]);
    const arriving = at(next.start + TRAVEL_VH * 0.99);
    expect(arriving.panels.find((entry) => entry.index === 2).k).toBeGreaterThan(0.9);
  });

  it("전체 마지막 패널과 본문은 트랙 끝까지 남고, 시작 전에는 아무것도 없다", () => {
    const end = at(layout.total);
    expect(end.panels).toEqual([{ index: 4, k: 1 }]);
    expect(shown(end.items)).toEqual([{ index: 29, k: 1 }]);
    expect(shown(at(0).panels)).toEqual([]);
  });
});

describe("samplePose + 항해", () => {
  it("인트로 끝과 첫 구간 시작이 같은 pose", () => {
    const introEnd = samplePose({ ...base, journey: null, scrollY: HERO_END });
    expectSamePose(at(HERO_END), introEnd);
    expectSamePose(at(yAt(0)), introEnd);
    expectSamePose(at(yAt(1e-7)), introEnd, 4);
    expect(introEnd.radius).toBeCloseTo(RADIUS.introEnd, 6);
    expect(introEnd.azimuth).toBeCloseTo(AZIMUTH.introEnd, 6);
    expect(introEnd.tx).toBe(0);
  });

  it("인트로 구간은 항해가 있어도 기존과 같다", () => {
    [0, 300, 700, HERO_END - 1].forEach((y) => {
      expect(at(y)).toEqual(samplePose({ ...base, journey: null, scrollY: y }));
    });
  });

  it("도착·위성 단계에서는 행성을 바라보고, 거리는 0.82×fit×화면 구성 배율", () => {
    [0, 2, 4].forEach((i) => {
      const segment = layout.segments[i];
      ["wide", "mid", "narrow"].forEach((view) => {
        const time = 42;
        const planet = rotateByTime(planets[i], time);
        [segment.start + TRAVEL_VH + 0.1, itemOffset(segment, 1, 0.7)].forEach((distance) => {
          const pose = at(yAt(distance), { view, time });
          expect(pose.tx).toBeCloseTo(planet.x, 6);
          expect(pose.ty).toBeCloseTo(0.06, 9);
          expect(pose.tz).toBeCloseTo(planet.z, 6);
          expect(pose.radius).toBeCloseTo(
            JOURNEY_CAMERA.radius * JOURNEY_VIEWS[view].distance,
            6
          );
          expect(pose.elevation).toBeCloseTo(12 * DEG, 6);
          expect(pose.veil).toBeCloseTo(0.18, 6);
          expect(pose.dim).toBe(1);
          expect(pose.viewShiftX).toBeCloseTo(JOURNEY_VIEWS[view].shift.x, 9);
          expect(pose.viewShiftY).toBeCloseTo(JOURNEY_VIEWS[view].shift.y, 9);
          // 행성 방향 + 25°(바깥쪽에서 은하 중심 쪽을 봄)
          const offset = pose.azimuth - Math.atan2(planet.x, planet.z) - 25 * DEG;
          expect(Math.cos(offset)).toBeCloseTo(1, 9);
        });
      });
    });
  });

  it("첫 이동 구간: shiftTime을 고정하면 시간이 흘러도 방위각이 튀지 않는다", () => {
    const y = yAt(TRAVEL_VH / 2);
    [0, 77, 250].forEach((shiftTime) => {
      let previous = null;
      for (let time = 0; time <= 300; time += 0.05) {
        const pose = at(y, { time, shiftTime });
        if (previous !== null) {
          expect(Math.abs(pose.azimuth - previous)).toBeLessThan(1 * DEG);
        }
        previous = pose.azimuth;
      }
    });
  });

  it("구간 경계에서 값이 이어진다", () => {
    [0, 1, 3, 20, 70, 120].forEach((time) => {
      layout.segments.forEach((segment) => {
        const edges = [segment.start + TRAVEL_VH, itemOffset(segment, 0, 0)];
        if (segment.index > 0) edges.push(segment.start);
        edges.forEach((edge) => {
          expectSamePose(at(yAt(edge) - 1e-6, { time }), at(yAt(edge), { time }), 4);
        });
      });
    });
  });

  it("azimuth 단조 증가, NaN 없음(여러 시각·화면)", () => {
    [
      { time: 0 },
      { time: 37.5 },
      { time: 400 },
      { aspect: 390 / 844, wide: false, time: 12 },
    ].forEach((overrides) => {
      const to = base.maxScroll + 300;
      const steps = 5000;
      let previous = null;
      for (let i = 0; i <= steps; i += 1) {
        const pose = at(-200 + ((to + 200) * i) / steps, overrides);
        POSE_KEYS.forEach((key) => expect(Number.isFinite(pose[key])).toBe(true));
        expect(pose.elevation).toBeLessThan(80 * DEG);
        expect(pose.radius).toBeGreaterThan(0);
        if (previous) expect(pose.azimuth).toBeGreaterThanOrEqual(previous.azimuth - 1e-9);
        previous = pose;
      }
    });
  });

  it("첫 행성 방위각은 인트로 끝보다 크고 첫 이동은 물러나지 않는다", () => {
    const first = layout.segments[0];
    [0, 10, 55, 300].forEach((time) => {
      const pose = at(yAt(itemOffset(first, 0, 0.5)), { time });
      expect(pose.azimuth).toBeGreaterThan(AZIMUTH.introEnd + JOURNEY_CAMERA.firstAfter - 1e-9);
    });
    for (let i = 1; i <= 50; i += 1) {
      expect(at(yAt((TRAVEL_VH * i) / 50)).radius).toBeLessThanOrEqual(RADIUS.introEnd + 1e-9);
    }
  });

  it("챕터 사이 이동 중간에 솟아올라 은하 전체가 보인다(0.82 + 9.5, 고도 +24°)", () => {
    const segment = layout.segments[2];
    const peak = at(yAt(segment.start + TRAVEL_VH / 2));
    expect(peak.radius).toBeGreaterThan(JOURNEY_CAMERA.radius + 9);
    expect(peak.radius).toBeLessThanOrEqual(JOURNEY_CAMERA.radius + JOURNEY_CAMERA.retreat + 1e-9);
    expect(peak.elevation).toBeCloseTo(12 * DEG + 24 * DEG, 6);
  });

  it("항해 끝 이후 원점을 향해 물러나 마무리 pose로 간다", () => {
    const last = at(JOURNEY.end);
    expect(last.tx).toBeCloseTo(rotateByTime(planets[4], 0).x, 6);
    const finish = at(base.maxScroll);
    expect(finish.tx).toBeCloseTo(0, 9);
    expect(finish.ty).toBeCloseTo(0, 9);
    expect(finish.tz).toBeCloseTo(0, 9);
    expect(finish.radius).toBeCloseTo(JOURNEY_CAMERA.outroRadius, 6);
    expect(finish.elevation).toBeCloseTo(ELEVATION.end, 6);
    expect(finish.veil).toBeCloseTo(0.8, 6);
    expect(finish.viewShiftX).toBe(0);
    expect(at(base.maxScroll + 5000)).toEqual(finish);
  });

  it("세로 화면은 반경에 fit을 곱한다", () => {
    const pose = at(yAt(itemOffset(layout.segments[3], 2, 0.6)), {
      aspect: 390 / 844,
      view: "narrow",
    });
    expect(pose.radius).toBeCloseTo(
      JOURNEY_CAMERA.radius * JOURNEY_VIEWS.narrow.distance * (844 / 390),
      6
    );
  });
});
