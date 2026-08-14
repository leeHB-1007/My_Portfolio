import React, { useEffect, useRef } from "react";
import { Tilt } from "react-tilt";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { styles } from "../styles";
import { profile, services } from "../constants";
import { SectionWrapper } from "../hoc";

gsap.registerPlugin(ScrollTrigger);

const ServiceCard = ({ index, title, summary, icon }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !cardRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 72, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: index * 0.12,
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
  }, [index]);

  return (
    <Tilt className="w-full" options={{ max: 18, scale: 1.02, speed: 280 }}>
      <div
        ref={cardRef}
        className="green-pink-gradient h-full rounded-[20px] p-[1px] shadow-card"
      >
        <div className="flex h-full min-h-[300px] flex-col rounded-[20px] bg-tertiary px-8 py-10">
          <img
            src={icon}
            alt=""
            aria-hidden="true"
            className="h-16 w-16 object-contain"
          />
          <h3 className="mt-8 text-[22px] font-bold text-white">{title}</h3>
          <p className="mt-4 text-[15px] leading-7 text-secondary">{summary}</p>
        </div>
      </div>
    </Tilt>
  );
};

const About = () => {
  const headingRef = useRef(null);
  const paragraphRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }
      );

      gsap.fromTo(
        paragraphRef.current,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          delay: 0.15,
          scrollTrigger: {
            trigger: paragraphRef.current,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <div ref={headingRef}>
        <p className={styles.sectionSubText}>Introduction</p>
        <h2 className={styles.sectionHeadText}>Overview.</h2>
      </div>

      <div
        ref={paragraphRef}
        className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]"
      >
        <p className="text-[17px] leading-[32px] text-secondary sm:text-[18px]">
          {profile.summary}
        </p>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-[#b9b1f5]">
            Focus
          </p>
          <ul className="mt-4 space-y-3 text-[15px] text-white-100">
            {profile.focus.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-[#915EFF]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
        {services.map((service, index) => (
          <ServiceCard key={service.title} index={index} {...service} />
        ))}
      </div>
    </>
  );
};

export default SectionWrapper(About, "about");
