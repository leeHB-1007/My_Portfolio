import React, { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { styles } from "../styles";
import { skillGroups, technologies } from "../constants";
import { SectionWrapper } from "../hoc";

gsap.registerPlugin(ScrollTrigger);

const Tech = () => {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tech-icon-card",
        {
          opacity: 0,
          y: 40,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".tech-icons-wrapper",
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section>
      <div>
        <p className={styles.sectionSubText}>Current stack</p>
        <h2 className={styles.sectionHeadText}>Skills.</h2>
      </div>

      <p className="mt-6 max-w-3xl text-[17px] leading-8 text-secondary">
        핵심 기술을 역할별로 묶어 현재 주력 스택과 확장 범위를 한눈에 읽히도록
        정리했습니다.
      </p>

      <div className="tech-icons-wrapper mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {technologies.map((technology) => (
          <div
            key={technology.name}
            className="tech-icon-card rounded-[24px] border border-white/10 bg-white/5 p-5 text-center backdrop-blur"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/20">
              <img
                src={technology.icon}
                alt=""
                aria-hidden="true"
                className="h-10 w-10 object-contain"
              />
            </div>
            <p className="mt-4 text-sm font-medium text-white-100">
              {technology.name}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {skillGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-[24px] border border-white/10 bg-tertiary/90 p-6"
          >
            <p className="text-sm uppercase tracking-[0.28em] text-[#b9b1f5]">
              {group.title}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {group.items.map((item) => (
                <span
                  key={`${group.title}-${item}`}
                  className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white-100"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SectionWrapper(Tech, "skills");
