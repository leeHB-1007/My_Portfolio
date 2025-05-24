import React, { useState, useEffect } from "react"; // useState, useEffect 추가
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import { motion } from "framer-motion";

import "react-vertical-timeline-component/style.min.css";

import { styles } from "../styles";
import { SectionWrapper } from "../hoc";
import { textVariant } from "../utils/motion";

// ExperienceCard는 props로 받은 experience를 그대로 사용합니다.
const ExperienceCard = ({ experience }) => {
  // const res = fetch(import.meta.env.VITE_API_URL + '/api/experiences') // 여기서 fetch 제거
  return (
    <VerticalTimelineElement
      contentStyle={{
        background: "#1d1836",
        color: "#fff",
      }}
      contentArrowStyle={{ borderRight: "7px solid  #232631" }}
      date={experience.date}
      iconStyle={{ background: experience.iconBg }}
      icon={
        <div className='flex justify-center items-center w-full h-full rounded-full'>
          <img
            src={experience.icon} // API 응답에 따라 이 경로가 올바른지 확인 필요
            alt={experience.company_name}
            className='w-10 h-10 object-contain'
          />
        </div>
      }
    >
      <div>
        <h3 className='text-white text-[24px] font-bold'>{experience.title}</h3>
        <p
          className='text-secondary text-[16px] font-semibold'
          style={{ margin: 0 }}
        >
          {experience.company_name}
        </p>
      </div>

      <ul className='mt-5 list-disc ml-5 space-y-2'>
        {experience.points.map((point, index) => (
          <li
            key={`experience-point-${index}`}
            className='text-white-100 text-[14px] pl-1 tracking-wider'
          >
            {point}
          </li>
        ))}
      </ul>
    </VerticalTimelineElement>
  );
};

const Experience = () => {
  const [experiences, setExperiences] = useState([]); // API로부터 받을 데이터를 위한 상태
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        setLoading(true);
        const response = await fetch(import.meta.env.VITE_API_URL + '/api/experiences'); // 또는 /api/experiences 등 실제 엔드포인트
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // API 응답 구조에 따라 data.experiences 또는 data를 직접 사용
        setExperiences(data || []); // API 응답이 { experiences: [...] } 형태라고 가정
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch experiences:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchExperiences();
  }, []); // 빈 의존성 배열로 마운트 시 한 번만 실행
  console.log(experiences);

  if (loading) {
    return <p className={`${styles.sectionSubText} text-center`}>Loading experiences...</p>;
  }

  if (error) {
    return <p className={`${styles.sectionSubText} text-center`}>Error loading experiences: {error}</p>;
  }

  if (!experiences || experiences.length === 0) {
    return <p className={`${styles.sectionSubText} text-center`}>No experiences to display.</p>;
  }

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={`${styles.sectionSubText} text-center`}>
          What I have done so far
        </p>
        <h2 className={`${styles.sectionHeadText} text-center`}>
          Experience.
        </h2>
      </motion.div>

      <div className='mt-20 flex flex-col'>
        <VerticalTimeline>
          {experiences.map((experience, index) => (
            <ExperienceCard
              key={`experience-${index}`}
              experience={experience}
            />
          ))}
        </VerticalTimeline>
      </div>
    </>
  );
};

export default SectionWrapper(Experience, "work");
