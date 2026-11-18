// 항해 항목 구성. constants를 인자로 받는 순수 함수라 가짜 데이터로도 테스트할 수 있다.
// 제목·소제목은 기존 섹션 컴포넌트(About/Experience/Tech/Works/Feedbacks)와 같다.
// description: 챕터 패널의 한 줄 설명(기존 섹션 문구). about은 profile.headline을 쓴다.
export const JOURNEY_SECTIONS = [
  { id: "about", title: "Overview.", subtitle: "Introduction", description: null },
  {
    id: "experience",
    title: "Experience.",
    subtitle: "Career timeline",
    description:
      "실무, 교육, 학업 흐름을 현재 시점 기준으로 한눈에 읽히도록 정리했습니다.",
  },
  {
    id: "skills",
    title: "Skills.",
    subtitle: "Current stack",
    description:
      "핵심 기술을 역할별로 묶어 현재 주력 스택과 확장 범위를 한눈에 읽히도록 정리했습니다.",
  },
  {
    id: "projects",
    title: "Projects.",
    subtitle: "Selected work",
    description:
      "문제 정의, 개선 방식, 검증 포인트가 드러나는 사례만 추려 카드로 정리했습니다.",
  },
  {
    id: "strengths",
    title: "Strengths.",
    subtitle: "How I work",
    description:
      "협업 방식과 전달 기준을 포트폴리오 전반에 걸쳐 일관되게 보여주는 항목만 정리했습니다.",
  },
];

// 위성 라벨: 짧은 제목 1줄 + 보조 1줄(없으면 null)
const LABELS = {
  intro: () => ({ title: "소개", sub: null }),
  service: (data) => ({ title: data.title, sub: null }),
  experience: (data) => ({ title: data.title, sub: data.company_name }),
  technologies: () => ({ title: "Core stack", sub: null }),
  skillGroup: (data) => ({ title: data.title, sub: null }),
  project: (data) => ({ title: data.subtitle, sub: data.name }),
  strength: (data) => ({ title: data.title, sub: null }),
};

export const buildJourneyItems = ({
  profile,
  services,
  experiences,
  technologies,
  skillGroups,
  projects,
  workPrinciples,
}) => {
  const groups = {
    about: [
      { kind: "intro", data: profile },
      ...services.map((data) => ({ kind: "service", data })),
    ],
    experience: experiences.map((data) => ({ kind: "experience", data })),
    skills: [
      { kind: "technologies", data: technologies },
      ...skillGroups.map((data) => ({ kind: "skillGroup", data })),
    ],
    projects: projects.map((data) => ({ kind: "project", data })),
    strengths: workPrinciples.map((data) => ({ kind: "strength", data })),
  };

  const items = [];
  JOURNEY_SECTIONS.forEach((section) => {
    const entries = groups[section.id];
    entries.forEach((entry, sectionIndex) => {
      items.push({
        ...entry,
        label: LABELS[entry.kind](entry.data),
        id: `${section.id}-${sectionIndex}`,
        index: items.length,
        section: section.id,
        sectionIndex,
        sectionCount: entries.length,
      });
    });
  });
  return items;
};

// 챕터(행성) 단위로 묶는다. 각 챕터의 items가 그 행성의 위성이다.
export const buildJourneyChapters = (items) =>
  JOURNEY_SECTIONS.map((section, index) => {
    const chapterItems = items.filter((item) => item.section === section.id);
    const intro = chapterItems.find((item) => item.kind === "intro");
    return {
      ...section,
      index,
      description: section.description || (intro ? intro.data.headline : ""),
      items: chapterItems,
    };
  });
