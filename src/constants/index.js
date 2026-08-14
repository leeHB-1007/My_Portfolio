import {
  aws,
  backend,
  creator,
  express,
  git,
  herobg,
  inu,
  javascript,
  mobile,
  nodejs,
  Port,
  reactjs,
  reactQuery,
  redux,
  tailwind,
  techeer,
  threejs,
  typescript,
  web,
} from "../assets";

export const profile = {
  name: "이현빈",
  englishName: "Hyun bin Lee",
  role: "Frontend Developer",
  email: "lhb0107@naver.com",
  headline:
    "우선순위와 책임 범위를 먼저 정리하고, 오래 유지할 수 있는 프론트엔드를 만듭니다.",
  summary:
    "TypeScript, React, Next.js를 중심으로 우선순위를 정리한 뒤 구현 순서를 설계합니다. 기능 구현을 끝으로 보지 않고 비즈니스 임팩트, 테스트, 코드 리뷰, 협업 품질까지 함께 연결해 팀이 책임 있게 운영할 수 있는 화면을 만드는 데 집중합니다.",
  focus: [
    "Prioritization / Delivery",
    "Business Impact / Collaboration",
  ],
};

export const profileLinks = [
  {
    label: "Email",
    href: "mailto:lhb0107@naver.com",
    value: "lhb0107@naver.com",
  },
  {
    label: "GitHub",
    href: "https://github.com/leeHB-1007",
    value: "github.com/leeHB-1007",
  },
  {
    label: "Velog",
    href: "https://velog.io/@lhb0107",
    value: "velog.io/@lhb0107",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/lhb0107",
    value: "linkedin.com/in/lhb0107",
  },
];

export const navLinks = [
  { id: "about", title: "About" },
  { id: "experience", title: "Experience" },
  { id: "skills", title: "Skills" },
  { id: "projects", title: "Projects" },
  { id: "strengths", title: "Strengths" },
  { id: "contact", title: "Contact" },
];

export const services = [
  {
    title: "Frontend Engineering",
    summary: "React와 Next.js로 제품 화면을 안정적으로 설계하고 구현합니다.",
    icon: web,
  },
  {
    title: "UI Architecture",
    summary: "상태, 폼, 인증 흐름을 유지보수 가능한 구조로 정리합니다.",
    icon: mobile,
  },
  {
    title: "Performance Optimization",
    summary: "캐시 전략, 렌더링 비용, R3F 성능을 함께 다룹니다.",
    icon: backend,
  },
  {
    title: "Testing And Quality",
    summary: "Jest, Vitest, Playwright, Lighthouse CI 기반 검증을 선호합니다.",
    icon: creator,
  },
];

export const experiences = [
  {
    title: "Frontend Developer",
    company_name: "Carrot-i",
    icon: web,
    iconBg: "#1f1b3a",
    date: "2026.04.01 - present",
    points: [
      "BoostUs의 PWA를 WebView 중심 구조로 전환하며 모바일 OAuth 흐름을 안정화했습니다.",
      "Next.js 캐시 전략을 다시 설계하고 검증 과정을 정리해 성능 이슈를 추적 가능한 상태로 만들었습니다.",
      "인증 영역을 Server Component 중심으로 옮겨 보안과 초기 화면 깜빡임 문제를 함께 줄였습니다.",
    ],
  },
  {
    title: "Web Fullstack",
    company_name: "Naver Boostcamp",
    icon: mobile,
    iconBg: "#151030",
    date: "2025.06 - 2026.02",
    points: [
      "BoostUs 폼을 React Hook Form 기반으로 재구성해 입력 구조를 정리하고 불필요한 렌더를 줄였습니다.",
      "Unit 테스트와 mocked E2E를 조합해 핵심 사용자 흐름을 검증하는 테스트 전략을 구성했습니다.",
    ],
  },
  {
    title: "Winter Boot Camp / Member Education",
    company_name: "Techeer",
    icon: techeer,
    iconBg: "#ffffff",
    date: "2024.12 - ing",
    points: [
      "Winter Boot Camp와 member education 과정에서 프론트엔드 구현과 협업 기본기를 반복 훈련했습니다.",
      "실전형 프로젝트 문맥에서 구조 설계, 리뷰, 배포 흐름을 함께 익히고 있습니다.",
    ],
  },
  {
    title: "Computer Engineering",
    company_name: "Incheon University",
    icon: inu,
    iconBg: "#ffffff",
    date: "2020.03 - 2025.08",
    points: [
      "컴퓨터공학 전공을 조기 졸업했습니다.",
      "GPA 4.18 / 4.5로 학업을 마쳤습니다.",
      "기초 CS와 소프트웨어 공학 기반 위에서 웹 프론트엔드 역량을 확장했습니다.",
    ],
  },
];

export const technologies = [
  { name: "JavaScript", icon: javascript },
  { name: "TypeScript", icon: typescript },
  { name: "React", icon: reactjs },
  { name: "RTK (Redux Toolkit)", icon: redux },
  { name: "TanStack Query", icon: reactQuery },
  { name: "Tailwind CSS", icon: tailwind },
  { name: "Node.js", icon: nodejs },
  { name: "Express", icon: express },
  { name: "AWS", icon: aws },
  { name: "Git", icon: git },
  { name: "R3F / Three.js", icon: threejs },
];

export const skillGroups = [
  {
    title: "Language",
    items: ["JavaScript", "TypeScript"],
  },
  {
    title: "Frontend",
    items: ["React", "Next.js", "R3F"],
  },
  {
    title: "State",
    items: ["Zustand", "Jotai", "RTK"],
  },
  {
    title: "Data Fetching",
    items: ["TanStack Query"],
  },
  {
    title: "Styling",
    items: ["Tailwind CSS", "Emotion", "styled-components"],
  },
  {
    title: "Backend",
    items: ["Node.js", "Express", "Nest.js"],
  },
  {
    title: "Testing",
    items: ["Jest", "Vitest", "Playwright"],
  },
  {
    title: "DevOps",
    items: ["Docker", "AWS", "Git", "CI/CD"],
  },
];

export const projects = [
  {
    name: "BoostUs",
    subtitle: "PWA -> WebView OAuth Stabilization",
    description:
      "모바일 환경에서 로그인 흐름이 흔들리던 구간을 WebView 중심 구조로 다시 잡아 PWA 대비 더 안정적인 OAuth 경험을 만들었습니다.",
    highlights: [
      "모바일 인증 흐름을 제품 사용 맥락에 맞게 재구성",
      "전환 이후에도 핵심 사용자 경로를 검증 가능한 상태로 유지",
    ],
    tags: [
      { name: "Next.js", color: "blue-text-gradient" },
      { name: "OAuth", color: "green-text-gradient" },
      { name: "WebView", color: "pink-text-gradient" },
    ],
    image: herobg,
  },
  {
    name: "BoostUs",
    subtitle: "Cache Strategy And Client -> Server Component Migration",
    description:
      "Next.js 캐시 전략을 다시 설계하고 인증 경계를 Client -> Server Component migration 중심으로 정리해 보안과 초기 렌더 품질을 함께 개선했습니다.",
    highlights: [
      "캐시 동작을 다시 설명 가능한 구조로 재정리",
      "초기 화면 깜빡임을 줄이면서 인증 책임을 더 안전한 쪽으로 이동",
    ],
    tags: [
      { name: "Next.js", color: "blue-text-gradient" },
      { name: "Server Component", color: "green-text-gradient" },
      { name: "Performance", color: "pink-text-gradient" },
    ],
    image: herobg,
  },
  {
    name: "BoostUs",
    subtitle: "Client -> Server Component Migration",
    description:
      "인증과 초기 렌더 구간의 책임을 다시 나누기 위해 Client Component에 머물던 일부 경계를 Server Component 중심으로 옮겼습니다.",
    highlights: [
      "인증 책임을 더 안전한 렌더 경계 쪽으로 이동",
      "초기 화면에서 다루던 클라이언트 부담을 줄이도록 구조를 재정리",
    ],
    tags: [
      { name: "Next.js", color: "blue-text-gradient" },
      { name: "Server Component", color: "green-text-gradient" },
      { name: "Architecture", color: "pink-text-gradient" },
    ],
    image: herobg,
  },
  {
    name: "BoostUs",
    subtitle: "Form Refactor And Testing Strategy",
    description:
      "React Hook Form 기반 리팩터링으로 입력 구조를 정리하고 Unit + mocked E2E 조합으로 핵심 플로우를 검증했습니다.",
    highlights: [
      "불필요한 렌더를 줄이는 방향으로 폼 구조를 재정리",
      "테스트 전략을 제품 플로우 중심으로 설계",
    ],
    tags: [
      { name: "React Hook Form", color: "blue-text-gradient" },
      { name: "Jest", color: "green-text-gradient" },
      { name: "Playwright", color: "pink-text-gradient" },
    ],
    image: herobg,
  },
  {
    name: "Classic-Mac",
    subtitle: "Reusable Window Logic And CI Guardrail",
    description:
      "데스크톱 스타일 인터랙션에서 반복되던 윈도우 동작을 HOC로 추상화하고 Lighthouse CI를 품질 게이트로 붙였습니다.",
    highlights: [
      "반복 UI 로직을 재사용 가능한 추상화로 정리",
      "배포 전 품질 저하를 감지할 수 있는 CI 루틴을 추가",
    ],
    tags: [
      { name: "React", color: "blue-text-gradient" },
      { name: "HOC", color: "green-text-gradient" },
      { name: "Lighthouse CI", color: "pink-text-gradient" },
    ],
    image: herobg,
  },
  {
    name: "My Portfolio",
    subtitle: "Animation Conflict Resolution And R3F Optimization",
    description:
      "애니메이션 라이브러리 충돌을 정리하고 R3F 씬 비용을 조절해 인터랙티브한 인상은 유지하면서 화면 안정성을 높였습니다.",
    highlights: [
      "모션 계층 충돌을 정리해 주요 섹션 동작을 예측 가능하게 개선",
      "R3F 렌더링 비용을 줄여 핵심 콘텐츠 가독성을 해치지 않도록 조정",
    ],
    tags: [
      { name: "React", color: "blue-text-gradient" },
      { name: "GSAP", color: "green-text-gradient" },
      { name: "R3F", color: "pink-text-gradient" },
    ],
    image: Port,
  },
];

export const workPrinciples = [
  {
    title: "Prioritization First",
    description:
      "기술 선택보다 먼저 사용자 흐름과 비즈니스 임팩트를 정리한 뒤 구현 순서를 잡습니다.",
  },
  {
    title: "Structure That Lasts",
    description:
      "상태, 인증, 폼, 캐시를 나중에도 설명 가능한 구조로 다듬는 데 시간을 씁니다.",
  },
  {
    title: "Performance With Evidence",
    description:
      "캐시 전략, 렌더링 비용, Lighthouse 지표로 병목을 찾고 적용 전후 결과를 함께 확인해 실제 개선이 있었는지 검증합니다.",
  },
  {
    title: "DX To UX",
    description:
      "개발자가 안정적으로 수정할 수 있는 구조와 협업 기준을 먼저 설계해, 그 일관성이 결국 더 안정적인 사용자 경험으로 이어지게 만듭니다.",
  },
  {
    title: "Verification Mindset",
    description:
      "테스트, 코드 리뷰, 성능 확인을 포함해 변경이 안전한지 확인하는 루틴을 선호합니다.",
  },
  {
    title: "Collaboration As Delivery",
    description:
      "문제를 구조적으로 설명하고 팀이 함께 다룰 수 있는 형태로 정리하는 협업 방식을 중요하게 봅니다.",
  },
];
