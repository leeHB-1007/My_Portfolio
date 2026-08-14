import React from "react";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import { motion } from "framer-motion";

import "react-vertical-timeline-component/style.min.css";

import { styles } from "../styles";
import { experiences } from "../constants";
import { SectionWrapper } from "../hoc";
import { textVariant } from "../utils/motion";

const ExperienceCard = ({ experience }) => {
  return (
    <VerticalTimelineElement
      contentStyle={{
        background: "#1d1836",
        color: "#fff",
        boxShadow: "0 12px 45px rgba(0, 0, 0, 0.2)",
      }}
      contentArrowStyle={{ borderRight: "7px solid #2a2547" }}
      date={experience.date}
      dateClassName="text-white-100"
      iconStyle={{ background: experience.iconBg }}
      icon={
        <div className="flex h-full w-full items-center justify-center rounded-full">
          <img
            src={experience.icon}
            alt=""
            aria-hidden="true"
            className="h-10 w-10 object-contain"
          />
        </div>
      }
    >
      <div>
        <h3 className="text-[24px] font-bold text-white">{experience.title}</h3>
        <p className="text-[16px] font-semibold text-secondary" style={{ margin: 0 }}>
          {experience.company_name}
        </p>
      </div>

      <ul className="mt-5 ml-5 list-disc space-y-2">
        {experience.points.map((point) => (
          <li
            key={`${experience.company_name}-${point}`}
            className="pl-1 text-[14px] tracking-wide text-white-100"
          >
            {point}
          </li>
        ))}
      </ul>
    </VerticalTimelineElement>
  );
};

const Experience = () => {
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={`${styles.sectionSubText} text-center`}>
          Career timeline
        </p>
        <h2 className={`${styles.sectionHeadText} text-center`}>
          Experience.
        </h2>
      </motion.div>

      <div className="mt-6 flex justify-center">
        <p className="max-w-3xl text-center text-[16px] leading-8 text-secondary sm:text-[17px]">
          실무, 교육, 학업 흐름을 현재 시점 기준으로 한눈에 읽히도록
          정리했습니다.
        </p>
      </div>

      <div className="mt-20 flex flex-col">
        <VerticalTimeline lineColor="#2a2547">
          {experiences.map((experience) => (
            <ExperienceCard
              key={`${experience.company_name}-${experience.date}`}
              experience={experience}
            />
          ))}
        </VerticalTimeline>
      </div>
    </>
  );
};

export default SectionWrapper(Experience, "experience");
