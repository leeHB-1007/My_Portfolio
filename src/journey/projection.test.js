import { describe, expect, it } from "vitest";

import { samplePose } from "../scroll/galaxyPose";
import {
  JOURNEY_FOV,
  JOURNEY_STEPPER,
  JOURNEY_VIEWS,
  createJourneyLayout,
  itemOffset,
  ringYaw,
} from "../scroll/journeyPose";
import { PLANET_SIZE, SATELLITE_SIZE, createPlanets } from "./planets";
import { cameraPosition, frontSatelliteWorld, projectPoint } from "./projection";

const COUNTS = [5, 4, 9, 6, 6];
const chapters = COUNTS.map((count, i) => ({
  id: `c${i}`,
  items: Array.from({ length: count }, () => ({})),
}));
const layout = createJourneyLayout(chapters);
const planets = createPlanets(chapters.length);
const HERO_END = 1000;

// CSS(.journey-label-button)와 맞춘 라벨 크기 상한: 위성 아래 10px에서 시작.
// 좁은 화면은 현재 라벨만, 제목 1줄(보조 줄 숨김), 그 밖은 최대 폭 160px(넓은)·140px(중간).
const LABEL_TOP = 10;
const NARROW_LABEL_HEIGHT = 38;
const LABEL_HALF = { wide: 80, mid: 70 };
// 좁은 화면 행성(이름표는 행성 왼쪽 옆)은 Navbar(84px) 아래에 있어야 한다.
const NAVBAR = 84;

const dwellAt = (width, height, view, c, j) => {
  const journey = { start: HERO_END, end: HERO_END + layout.total * height, layout, planets };
  const pose = samplePose({
    scrollY: HERO_END + itemOffset(layout.segments[c], j, 0.6) * height,
    heroStart: 0,
    heroEnd: HERO_END,
    vh: height,
    maxScroll: journey.end + height,
    aspect: width / height,
    mode: "pinned",
    wide: width >= 1024,
    view,
    journey,
    time: 0,
  });
  const camera = { fov: JOURNEY_FOV, aspect: width / height };
  const planet = projectPoint(planets[c], pose, camera);
  const front = projectPoint(
    frontSatelliteWorld(planets[c], COUNTS[c], j, ringYaw(planets[c], view)),
    pose,
    camera
  );
  const pixels = (size, depth) => (size / depth / Math.tan(JOURNEY_FOV / 2)) * (height / 2);
  return {
    pose,
    planet: { x: planet.x * width, y: planet.y * height, r: pixels(PLANET_SIZE, planet.depth) },
    front: { x: front.x * width, y: front.y * height, r: pixels(SATELLITE_SIZE * 1.5, front.depth) },
  };
};

const everyItem = (fn) =>
  COUNTS.forEach((count, c) => {
    for (let j = 0; j < count; j += 1) fn(c, j);
  });

describe("projectPoint", () => {
  it("바라보는 점은 화면 가운데 + viewShift", () => {
    const pose = {
      radius: 2,
      azimuth: 0.7,
      elevation: 0.3,
      tx: 1,
      ty: 0.2,
      tz: -3,
      viewShiftX: -0.2,
      viewShiftY: 0.05,
    };
    const p = projectPoint({ x: 1, y: 0.2, z: -3 }, pose, { fov: JOURNEY_FOV, aspect: 1.6 });
    expect(p.x).toBeCloseTo(0.3, 9);
    expect(p.y).toBeCloseTo(0.55, 9);
    expect(p.depth).toBeCloseTo(2, 9);
    const eye = cameraPosition(pose);
    expect(Math.hypot(eye.x - 1, eye.y - 0.2, eye.z + 3)).toBeCloseTo(2, 9);
  });
});

describe("항해 화면 배치(체류 중, 시간 0)", () => {
  it("좁은 화면: 앞 위성과 그 라벨이 패널 위 끝보다 위, 행성은 Navbar 아래", () => {
    [
      [390, 844],
      [390, 664],
      [360, 640],
    ].forEach(([width, height]) => {
      const panelTop = JOURNEY_VIEWS.narrow.panelTop * height;
      everyItem((c, j) => {
        const { planet, front } = dwellAt(width, height, "narrow", c, j);
        expect(planet.x).toBeCloseTo(width / 2, 6);
        expect(front.y + front.r + LABEL_TOP + NARROW_LABEL_HEIGHT).toBeLessThan(panelTop);
        expect(planet.y - planet.r).toBeGreaterThan(NAVBAR);
        expect(front.x).toBeGreaterThan(0);
        expect(front.x).toBeLessThan(width);
      });
    });
  });

  it("중간·넓은 화면: 앞 위성 라벨의 오른쪽 끝이 패널 왼쪽보다 왼쪽", () => {
    [
      [855, 613, "mid"],
      [800, 1000, "mid"],
      [1023, 700, "mid"],
      [1024, 640, "wide"],
      [1440, 900, "wide"],
      [1920, 1080, "wide"],
    ].forEach(([width, height, view]) => {
      const panelLeft = JOURNEY_VIEWS[view].panelLeft * width;
      everyItem((c, j) => {
        const { front } = dwellAt(width, height, view, c, j);
        expect(front.x + LABEL_HALF[view]).toBeLessThan(panelLeft);
        expect(front.x).toBeGreaterThan(0);
      });
    });
  });

  it("넓은 화면 행성은 가로 30%·세로 52%", () => {
    const { planet } = dwellAt(1440, 900, "wide", 2, 3);
    expect(planet.x / 1440).toBeCloseTo(0.3, 6);
    expect(planet.y / 900).toBeCloseTo(0.52, 6);
  });

  it("이전/다음 버튼은 패널·MotionToggle·위성 라벨과 겹치지 않는다", () => {
    // 좁은 화면: 패널 영역 아래 64px 띠 안, MotionToggle(오른쪽 16px, 44px) 왼쪽
    [
      [390, 844],
      [390, 664],
      [360, 640],
    ].forEach(([width, height]) => {
      const top = height - JOURNEY_STEPPER.bottomNarrow - JOURNEY_STEPPER.height;
      expect(top).toBeGreaterThanOrEqual(height - 64);
      expect(16 + JOURNEY_STEPPER.width).toBeLessThan(width - 16 - 44);
    });
    // 넓은·중간 화면: 행성 아래 가운데. 패널 왼쪽보다 왼쪽, 화면 안, 앞 위성 라벨(최대 높이 64px)보다 아래
    [
      [855, 613, "mid"],
      [800, 1000, "mid"],
      [1023, 700, "mid"],
      [1024, 640, "wide"],
      [1440, 900, "wide"],
      [1920, 1080, "wide"],
    ].forEach(([width, height, view]) => {
      const center = (0.5 + JOURNEY_VIEWS[view].shift.x) * width;
      expect(center - JOURNEY_STEPPER.width / 2).toBeGreaterThan(0);
      expect(center + JOURNEY_STEPPER.width / 2).toBeLessThan(JOURNEY_VIEWS[view].panelLeft * width);
      const top = height - JOURNEY_STEPPER.bottomSide - JOURNEY_STEPPER.height;
      everyItem((c, j) => {
        const { planet, front } = dwellAt(width, height, view, c, j);
        expect(front.y + front.r + LABEL_TOP + 64).toBeLessThan(top);
        expect(planet.y + planet.r).toBeLessThan(top);
      });
    });
  });
});
