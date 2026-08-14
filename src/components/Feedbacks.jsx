import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { styles } from "../styles";
import { SectionWrapper } from "../hoc";
import { fadeIn, textVariant } from "../utils/motion";
import { workPrinciples } from "../constants";

const StrengthCard = ({ index, title, description, prefersReducedMotion }) => (
  <motion.div
    variants={
      prefersReducedMotion ? undefined : fadeIn("", "spring", index * 0.15, 0.7)
    }
    className="h-full rounded-3xl bg-black-200 p-8"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#915EFF]/20 text-[15px] font-semibold text-[#b9b1f5]">
        0{index + 1}
      </div>
      <h3 className="text-[20px] font-bold leading-tight text-white">{title}</h3>
    </div>
    <p className="mt-6 text-[15px] leading-7 tracking-wide text-secondary">
      {description}
    </p>
  </motion.div>
);

const Feedbacks = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="mt-12 rounded-[20px] bg-black-100">
      <div className={`min-h-[260px] rounded-2xl bg-tertiary ${styles.padding}`}>
        <motion.div variants={prefersReducedMotion ? undefined : textVariant()}>
          <p className={styles.sectionSubText}>How I work</p>
          <h2 className={styles.sectionHeadText}>Strengths.</h2>
        </motion.div>
        <p className="mt-6 max-w-3xl text-[17px] leading-8 text-secondary">
          협업 방식과 전달 기준을 포트폴리오 전반에 걸쳐 일관되게 보여주는
          항목만 정리했습니다.
        </p>
      </div>

      <div
        className={`-mt-12 grid auto-rows-fr grid-cols-1 gap-7 pb-14 md:grid-cols-2 xl:grid-cols-3 ${styles.paddingX}`}
      >
        {workPrinciples.map((principle, index) => (
          <StrengthCard
            key={principle.title}
            index={index}
            prefersReducedMotion={prefersReducedMotion}
            {...principle}
          />
        ))}
      </div>
    </div>
  );
};

export default SectionWrapper(Feedbacks, "strengths");
