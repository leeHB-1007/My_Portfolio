import React, { useEffect, useRef } from "react";
import { Tilt } from "react-tilt";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { styles } from "../styles";
import { projects } from "../constants";
import { SectionWrapper } from "../hoc";

gsap.registerPlugin(ScrollTrigger);

const ProjectCard = ({ project, index, prefersReducedMotion }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion || !cardRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 72 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          delay: index * 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: cardRef.current,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, cardRef);

    return () => ctx.revert();
  }, [index, prefersReducedMotion]);

  const cardBody = (
    <div
      ref={cardRef}
      className="project-card h-full rounded-2xl bg-tertiary p-5 shadow-card"
    >
      <div className="relative h-[220px] w-full overflow-hidden rounded-2xl border border-white/5">
        <img
          src={project.image}
          alt={`${project.name} case study cover`}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-[#b9b1f5]">
            Case Study
          </p>
          <p className="mt-2 text-[18px] font-semibold text-white">
            {project.subtitle}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-[24px] font-bold text-white">{project.name}</h3>
        <p className="mt-3 text-[14px] leading-7 text-secondary">
          {project.description}
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        {project.highlights.map((highlight) => (
          <li
            key={`${project.subtitle}-${highlight}`}
            className="flex items-start gap-3 text-[14px] leading-6 text-white-100"
          >
            <span className="mt-2 h-2 w-2 rounded-full bg-[#915EFF]" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.tags.map((tag) => (
          <p
            key={`${project.subtitle}-${tag.name}`}
            className={`text-[13px] ${tag.color}`}
          >
            #{tag.name}
          </p>
        ))}
      </div>
    </div>
  );

  if (prefersReducedMotion) {
    return cardBody;
  }

  return (
    <Tilt options={{ max: 18, scale: 1.01, speed: 280 }} className="h-full">
      {cardBody}
    </Tilt>
  );
};

const Works = () => {
  const worksContainerRef = useRef(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion || !worksContainerRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        worksContainerRef.current,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: worksContainerRef.current,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, worksContainerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <>
      <div>
        <p className={styles.sectionSubText}>Selected work</p>
        <h2 className={styles.sectionHeadText}>Projects.</h2>
      </div>

      <div className="mt-6 max-w-4xl" ref={worksContainerRef}>
        <p className="text-[17px] leading-8 text-secondary">
          문제 정의, 개선 방식, 검증 포인트가 드러나는 사례만 추려 카드로
          정리했습니다.
        </p>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project, index) => (
          <ProjectCard
            key={`${project.name}-${project.subtitle}`}
            project={project}
            index={index}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(Works, "projects");
