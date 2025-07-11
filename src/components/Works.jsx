import React, { useEffect, useRef, useState, useCallback } from "react";
import { Tilt } from "react-tilt";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { styles } from "../styles";
import { github } from "../assets";
import { SectionWrapper } from "../hoc";
// import { projects } from "../constants";

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

const useGsap = (elementRef, animation, delay = 0) => {
  useEffect(() => {
    if (elementRef.current) {
      gsap.fromTo(
        elementRef.current,
        animation.from,
        {
          ...animation.to,
          delay,
          scrollTrigger: {
            trigger: elementRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }
  }, [elementRef, animation, delay]);
};

const ProjectCard = ({
  index,
  name,
  description,
  tags,
  image,
  source_code_link,
}) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;

    // ScrollTrigger for animating project cards with stagger
    gsap.fromTo(
      el,
      {
        opacity: 0,
        y: 100, // Start off-screen
      },
      {
        opacity: 1,
        y: 0,
        scrollTrigger: {
          trigger: el,
          start: "top bottom", // Trigger when the top of the element hits the bottom of the viewport
          end: "top center", // End when the top reaches the center of the viewport
          scrub: true, // Smoothly sync scroll and animation
          markers: false, // Set to `true` to see debug markers
        },
      }
    );
  }, []);

  return (
    <div ref={cardRef} className="project-card">
      <Tilt
        options={{
          max: 45,
          scale: 1,
          speed: 450,
        }}
        className="bg-tertiary p-5 rounded-2xl sm:w-[360px] w-full"
      >
        <div className="relative w-full h-[230px]">
          <img
            src={image}
            alt="project_image"
            className="w-full h-full object-cover object-left rounded-2xl"
          />

          <div className="absolute inset-0 flex justify-end m-3 card-img_hover">
            <div
              onClick={() => window.open(source_code_link, "_blank")}
              className="black-gradient w-10 h-10 rounded-full flex justify-center items-center cursor-pointer"
            >
              <img
                src={github}
                alt="source code"
                className="w-1/2 h-1/2 object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-white font-bold text-[24px]">{name}</h3>
          <p className="mt-2 text-secondary text-[14px]">{description}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <p
              key={`${name}-${tag.name}`}
              className={`text-[14px] ${tag.color}`}
            >
              #{tag.name}
            </p>
          ))}
        </div>
      </Tilt>
    </div>
  );
};

const Works = () => {
    const [projects, setProjects] = useState([]); // API로부터 받을 데이터를 위한 상태
    const [loading, setLoading] = useState(true); // 로딩 상태
    const [error, setError] = useState(null); // 에러 상태
    const worksContainerRef = useRef(null); // works-container div에 대한 ref
    const headingRef = useRef(null);
    const paragraphRef = useRef(null);

    // 데이터 가져오기 함수 (useCallback으로 감싸서 불필요한 재생성 방지 가능)
    const fetchProjects = React.useCallback(async () => {
        try {
            setLoading(true);
            // 이전 Experience.jsx와 마찬가지로 /api/portfolioData 에서 projects를 가져오도록 수정
            const response = await fetch(import.meta.env.VITE_API_URL + '/api/projects'); 
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProjects(data || []); // API 응답이 { projects: [...] } 형태라고 가정
        } catch (error) {
            setError(error.message);
            console.error("Failed to fetch projects:", error);
            setProjects([]); // 에러 발생 시 빈 배열로 설정
        } finally {
            setLoading(false);
        }
    }, []); // 의존성 배열이 비어있으므로 컴포넌트 마운트 시 한 번만 생성

    // 데이터 가져오기를 위한 useEffect
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]); // fetchProjects 함수가 변경될 때만 (useCallback 덕분에 마운트 시 한 번만) 실행
  useEffect(() => {
    // Stagger effect for project cards
    gsap.fromTo(
      ".project-card", // Select all project cards
      {
        opacity: 0,
        y: 100,
      },
      {
        opacity: 1,
        y: 0,
        stagger: 0.1, // Stagger delay of 0.3 seconds between each card
        scrollTrigger: {
          trigger: ".works-container",
          start: "top bottom", // Trigger when the top of the container reaches the bottom
          end: "top center",
          scrub: true,
          markers: false, // Set to true to see debug markers
        },
      }
    );
  }, []);

    // 제목 애니메이션
    useGsap(headingRef, {
      from: { opacity: 0, x: -50 },
      to: { opacity: 1, x: 0, duration: 1, ease: "power2.out" },
    });
    // 설명 애니메이션
    useGsap(paragraphRef, {
      from: { opacity: 0, y: 50 },
      to: { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
    }, 0.3);

  return (
    <>
      <div ref={headingRef}>
        <p className={`${styles.sectionSubText}`}>My work</p>
        <h2 className={`${styles.sectionHeadText}`}>Projects.</h2>
      </div>

      <div className="w-full flex" ref={paragraphRef}>
        <p className="mt-3 text-secondary text-[17px] max-w-3xl leading-[30px]">
          아래에 소개된 프로젝트들은 제가 실제로 수행한 작업을 기반으로 한
          사례들로, 저의 기술력과 경험을 잘 보여줍니다. 각 프로젝트는 간략한
          설명과 함께 코드 저장소 및 배포된 데모 링크를 포함하고 있어, 복잡한
          문제를 해결하고 다양한 기술을 활용하며 프로젝트를 효과적으로 관리할 수
          있는 저의 역량을 확인하실 수 있습니다.
        </p>
      </div>

      <div className="works-container mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 justify-items-center gap-5">
        {projects.map((project, index) => (
          <div key={`project-${index}`} className="project-card">
            <ProjectCard index={index} {...project} />
          </div>
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Works, "");
