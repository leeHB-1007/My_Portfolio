import {
  logo,
  backend,
  creator,
  mobile,
  web,
  github,
  menu,
  close,
  css,
  gearXpert,
  project2,
  project3,
  mysql,
  express,
  aws,
  mui,
  gsap,
  framer,
  figma,
  git,
  html,
  javascript,
  mongodb,
  nodejs,
  reactjs,
  redux,
  tailwind,
  threejs,
  firstTestimonial,
  secondTestimonial,
  thirdTestimonial,
  inu,
  techeer,
  reactQuery,
  Lawmon,
  BookClip,
  HP,
  Port
} from "../assets";

// Import Tekisky separately
import tekisky from "../assets/company/tekisky.png";

export const navLinks = [
  {
    id: "about",
    title: "About",
  },
  {
    id: "work",
    title: "Work",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const services = [
  {
    title: "Product Designer",
    icon: web,
  },
  {
    title: "Frontend Developer",
    icon: mobile,
  },
  {
    title: "Backend Developer",
    icon: backend,
  },
  {
    title: "Ui UX Designer",
    icon: creator,
  },
];

const technologies = [
  {
    name: "HTML 5",
    icon: html,
  },
  {
    name: "CSS 3",
    icon: css,
  },
  {
    name: "JavaScript",
    icon: javascript,
  },
  {
    name: "React JS",
    icon: reactjs,
  },
  {
    name: "gsap",
    icon: gsap,
  },
  {
    name: "framer",
    icon: framer,
  },

  {
    name: "Three JS",
    icon: threejs,
  },
  {
    name: "figma",
    icon: figma,
  },
  {
    name: "Redux Toolkit",
    icon: redux,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
  {
    name: "Material Ui",
    icon: mui,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "Express Js",
    icon: express,
  },
  {
    name: "AWS",
    icon: aws,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "MySql",
    icon: mysql,
  },

  {
    name: "git",
    icon: git,
  },
  {
    name: "nextjs",
    icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg",
  },
  {
    name: "TanStack-Query",
    icon: reactQuery,
  },
];

const experiences = [
  {
    title: "인천대 컴퓨터공학부",
    company_name: "인천대학교",
    icon: inu,
    iconBg: "#E6DEDD",
    date: "Mar 2020 - present",
    points: [
      "인천대학교 컴퓨터공학부에 입학하여 컴퓨터 공학의 기초를 다짐.",
      "프로그래밍 언어, 데이터베이스, 알고리즘 등 다양한 과목을 수강하며 이론과 실습을 병행.",
      "팀 프로젝트를 통해 협업 능력과 문제 해결 능력을 향상시킴.",
    ],
  },
  {
    title: "Techeer",
    company_name: "개발자 커뮤니티",
    icon: techeer,
    iconBg: "#ffffff",
    date: "Feb 2025 - present",
    points: [
      "Techeer 개발자 커뮤니티에서 프론트엔드 개발자로 다양한 프로젝트와 스터디에 적극 참여",
      "React 기반의 웹 프론트엔드 개발을 중심으로 실무 역량 강화.",
      "팀원들과 협업하여 기획부터 개발, 배포까지 전 과정을 경험",
      "코드 리뷰와 기술 공유를 통해 지속적으로 개발 역량 향상 도모",
    ],
  },
];

const testimonials = [
  {
    testimonial:
      "I thought it was impossible to make a website as beautiful as our product, but Huzaif proved me wrong.",
    name: "MD Mustaqeem",
    designation: "Ecommerce",
    company: "QuickMart",
    image: firstTestimonial,
  },
  {
    testimonial:
      "I've never met a web developer who truly cares about their clients' success like Huzaif does.",
    name: "Abdul Raheman",
    designation: "Ecommerce Business",
    company: "justbuyz",
    image: secondTestimonial,
  },
  {
    testimonial:
      "After Huzaif optimized our website, our traffic increased by 50%. We can't thank them enough!",
    name: "James Wang",
    designation: "CTO",
    company: "456 Enterprises",
    image: thirdTestimonial,
  },
];

const projects = [
{
    name: "HB's Portfolio",
    description:
      "이 프로젝트는 이현빈이라는 사람이 개발자로써 배워왔던 기술들로 다른 개발자들과 협업하여 개발한 프로젝트들을 나열하는 웹 프로젝트 입니다.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "tailwind",
        color: "white-text-gradient",
      },
      {
        name: "typescript",
        color: "pink-text-gradient",
      },
      {
        name: "Tanstack-Query",
        color: "green-text-gradient",
      },
      {
        name: "zustand",
        color: "blue-text-gradient",
      },
    ],
    image: Port,
    source_code_link: "https://github.com/LawmonProject",
  },
  {
    name: "LAWMON",
    description:
      "LAWMON은 AI를 활용한 계약서 분석 및 법률 전문가와 협업하여 법률 문서를 분석하고, 사용자와 전문가와 직접적인 대화를 통해 계약 조건에 위험성을 알려주는 웹 베이스 플랫폼입니다.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "tailwind",
        color: "white-text-gradient",
      },
      {
        name: "typescript",
        color: "pink-text-gradient",
      },
      {
        name: "Tanstack-Query",
        color: "green-text-gradient",
      },
      {
        name: "zustand",
        color: "blue-text-gradient",
      },
    ],
    image: Lawmon,
    source_code_link: "https://github.com/LawmonProject",
  },
  {
    name: "BookClip",
    description:
      "BookClip은 서점 사이트에 있는 정보를 토대로 AI를 사용하여줄거리를 쇼츠형태로 사용자에게 제공하고, 책을 읽으면서 인상 깊은 구절을 클립으로 저장하고, 다른 사용자들과 공유할 수 있는 플랫폼입니다. 사용자는 쇼츠를 통해 책의 내용을 요약하고, 다른 사용자들과 소통할 수 있는 크롬 익스텐션 서비스입니다.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "Typescript",
        color: "green-text-gradient",
      },
      {
        name: "Shadcn",
        color: "white-text-gradient",
      },
      {
        name: "pnpm",
        color: "pink-text-gradient",
      },
    ],
    image: BookClip,
    source_code_link: "https://github.com/2024-Winter-Bootcamp-Team-A",
  },
  {
    name: "3HP",
    description:
      "3HP는 사용자가 원하는 사진을 업로드하면, 그 사진에 딥페이크 방지 기술을 사용하여, 사용자가 원하는 사람의 얼굴로 바꿔주는 웹 베이스 플랫폼입니다. 사용자는 업로드한 사진을 통해 다양한 얼굴로 변환된 이미지를 생성할 수 있습니다.",
    tags: [
      {
        name: "Nextjs",
        color: "blue-text-gradient",
      },
      {
        name: "Typescript",
        color: "white-text-gradient",
      },
      {
        name: "tailwind",
        color: "green-text-gradient",
      },
      {
        name: "Framer-motion",
        color: "pink-text-gradient",
      },
    ],
    image: HP,
    source_code_link: "https://github.com/leeHB-1007/3HP_INU_CAPSTONE",
  },
];

export { services, technologies, experiences, testimonials, projects };
