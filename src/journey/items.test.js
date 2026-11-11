import { describe, expect, it } from "vitest";

import * as constants from "../constants";
import { JOURNEY_SECTIONS, buildJourneyChapters, buildJourneyItems } from "./items";

const fake = {
  profile: { summary: "s", focus: ["a"] },
  services: [{ title: "s1" }, { title: "s2" }],
  experiences: [{ title: "e1" }],
  technologies: [{ name: "t1" }],
  skillGroups: [{ title: "g1" }, { title: "g2" }, { title: "g3" }],
  projects: [{ name: "p1" }],
  workPrinciples: [{ title: "w1" }, { title: "w2" }],
};

describe("buildJourneyItems", () => {
  it("실제 데이터로 30개 항목을 고정된 순서로 만든다", () => {
    const items = buildJourneyItems(constants);
    expect(items).toHaveLength(30);

    const counts = JOURNEY_SECTIONS.map(
      (section) => items.filter((item) => item.section === section.id).length
    );
    expect(counts).toEqual([5, 4, 9, 6, 6]);

    expect(items.map((item) => item.kind)).toEqual([
      "intro",
      ...Array(4).fill("service"),
      ...Array(4).fill("experience"),
      "technologies",
      ...Array(8).fill("skillGroup"),
      ...Array(6).fill("project"),
      ...Array(6).fill("strength"),
    ]);
    expect(items[0].data).toBe(constants.profile);
    expect(items[1].data).toBe(constants.services[0]);
    expect(items[9].data).toBe(constants.technologies);
    expect(items[29].data).toBe(constants.workPrinciples[5]);
  });

  it("섹션 경계: 섹션 내 위치·개수와 id", () => {
    const items = buildJourneyItems(constants);
    const firsts = items.filter((item) => item.sectionIndex === 0).map((item) => item.index);
    expect(firsts).toEqual([0, 5, 9, 18, 24]);
    items.forEach((item, index) => {
      expect(item.index).toBe(index);
      expect(item.sectionIndex).toBeLessThan(item.sectionCount);
      expect(item.id).toBe(`${item.section}-${item.sectionIndex}`);
    });
    expect(items[8]).toMatchObject({ section: "experience", sectionIndex: 3, sectionCount: 4 });
  });

  it("챕터 5개, 위성 수 5/4/9/6/6, 항목 순서 유지", () => {
    const items = buildJourneyItems(constants);
    const chapters = buildJourneyChapters(items);
    expect(chapters.map((chapter) => chapter.id)).toEqual([
      "about",
      "experience",
      "skills",
      "projects",
      "strengths",
    ]);
    expect(chapters.map((chapter) => chapter.items.length)).toEqual([5, 4, 9, 6, 6]);
    expect(chapters.map((chapter) => chapter.index)).toEqual([0, 1, 2, 3, 4]);
    expect(chapters.flatMap((chapter) => chapter.items)).toEqual(items);
    expect(chapters[2]).toMatchObject({ title: "Skills.", subtitle: "Current stack" });
  });

  it("챕터 한 줄 설명: about은 profile.headline, 나머지는 기존 섹션 문구", () => {
    const chapters = buildJourneyChapters(buildJourneyItems(constants));
    expect(chapters[0].description).toBe(constants.profile.headline);
    expect(chapters[1].description).toBe(
      "실무, 교육, 학업 흐름을 현재 시점 기준으로 한눈에 읽히도록 정리했습니다."
    );
    expect(chapters[3].description).toBe(
      "문제 정의, 개선 방식, 검증 포인트가 드러나는 사례만 추려 카드로 정리했습니다."
    );
    chapters.forEach((chapter) => expect(chapter.description.length).toBeGreaterThan(10));
  });

  it("위성 라벨: 짧은 제목 + 보조 줄", () => {
    const items = buildJourneyItems(constants);
    expect(items[0].label).toEqual({ title: "소개", sub: null });
    expect(items[1].label).toEqual({ title: constants.services[0].title, sub: null });
    expect(items[5].label).toEqual({
      title: constants.experiences[0].title,
      sub: constants.experiences[0].company_name,
    });
    expect(items[9].label).toEqual({ title: "Core stack", sub: null });
    expect(items[10].label.title).toBe(constants.skillGroups[0].title);
    expect(items[18].label).toEqual({
      title: constants.projects[0].subtitle,
      sub: constants.projects[0].name,
    });
    expect(items[29].label.title).toBe(constants.workPrinciples[5].title);
    items.forEach((item) => expect(item.label.title.length).toBeGreaterThan(0));
  });

  it("가짜 데이터로도 같은 규칙을 따른다", () => {
    const items = buildJourneyItems(fake);
    expect(items.map((item) => item.id)).toEqual([
      "about-0",
      "about-1",
      "about-2",
      "experience-0",
      "skills-0",
      "skills-1",
      "skills-2",
      "skills-3",
      "projects-0",
      "strengths-0",
      "strengths-1",
    ]);
    expect(items[4].data).toBe(fake.technologies);
  });

  it("섹션 메타는 Navbar 앵커 id와 같은 순서다", () => {
    expect(JOURNEY_SECTIONS.map((section) => section.id)).toEqual(
      constants.navLinks.map((link) => link.id).filter((id) => id !== "contact")
    );
  });
});
