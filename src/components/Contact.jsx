import React, { useRef, useEffect } from "react"; // useEffect 추가 (선택적: submissionError 알림용)
import { motion } from "framer-motion";
import useContactStore from "../store/contractStore"; // 스토어 경로 확인

import { styles } from "../styles";
import { EarthCanvas } from "./canvas";
import { SectionWrapper } from "../hoc";
import { slideIn } from "../utils/motion";

const Contact = () => {
  const formRef = useRef();
  // 로컬 form 상태 제거, 스토어에서 formData, updateFormData, clearFormData 등을 가져옴
  const {
    loading,
    submitContactForm,
    error: submissionError,
    formData,
    updateFormData,
    // clearFormData // submitContactForm 성공 시 내부에서 호출됨
  } = useContactStore();

  const handleChange = (e) => {
    const { target } = e;
    const { name, value } = target;
    updateFormData({ [name]: value }); // 스토어의 formData 업데이트
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitContactForm(); // 스토어 액션 호출 (인자 없이, 스토어 내부 formData 사용)
      alert("감사합니다 곧 연락 드리겠습니다.");
      // 폼 초기화는 submitContactForm 성공 시 스토어 내부에서 clearFormData로 처리됨
    } catch (error) {
      // 스토어에서 error 상태를 업데이트하므로, submissionError를 활용하거나 직접 에러 메시지 표시
      // console.error("Submit Error:", error); // 이미 스토어에서 콘솔 출력
      // alert("문제가 있나 보네요. 연락 부탁드립니다."); // 아래에서 submissionError 기반으로 처리
    }
  };

  // submissionError가 변경될 때 사용자에게 알림 (선택적)
  useEffect(() => {
    if (submissionError && !loading) { // 로딩 중이 아닐 때만 에러 알림
      alert(`오류: ${submissionError}`);
      // 에러를 보여준 후 스토어의 에러 상태를 초기화할 수도 있습니다.
      // useContactStore.setState({ error: null }); // 필요하다면
    }
  }, [submissionError, loading]);

  return (
    <div
      className={`xl:mt-12 flex xl:flex-row flex-col-reverse gap-10 overflow-hidden`}
    >
      <motion.div
        variants={slideIn("left", "tween", 0.2, 1)}
        className='flex-[0.75] bg-black-100 p-8 rounded-2xl z-10'
      >
        <p className={styles.sectionSubText}>Get in touch</p>
        <h3 className={styles.sectionHeadText}>Contact.</h3>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className='mt-12 flex flex-col gap-8'
        >
          <label className='flex flex-col'>
            <span className='text-white font-medium mb-4'>Your Name</span>
            <input
              type='text'
              name='name'
              value={formData.name} // 스토어의 formData.name 사용
              onChange={handleChange}
              placeholder="이름을 적어주세요"
              className='bg-tertiary py-4 px-6 placeholder:text-secondary text-white rounded-lg outline-none border-none font-medium'
            />
          </label>
          <label className='flex flex-col'>
            <span className='text-white font-medium mb-4'>Your email</span>
            <input
              type='email'
              name='email'
              value={formData.email} // 스토어의 formData.email 사용
              onChange={handleChange}
              placeholder="이메일 주소를 적어주세요"
              className='bg-tertiary py-4 px-6 placeholder:text-secondary text-white rounded-lg outline-none border-none font-medium'
            />
          </label>
          <label className='flex flex-col'>
            <span className='text-white font-medium mb-4'>Your Message</span>
            <textarea
              rows={7}
              name='message'
              value={formData.message} // 스토어의 formData.message 사용
              onChange={handleChange}
              placeholder='내용을 적어주세요'
              className='bg-tertiary py-4 px-6 placeholder:text-secondary text-white rounded-lg outline-none border-none font-medium resize-none'
            />
          </label>

          <button
            type='submit'
            className='bg-tertiary py-3 px-8 rounded-xl outline-none w-fit text-white font-bold shadow-md shadow-primary'
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </motion.div>

      <motion.div
        variants={slideIn("right", "tween", 0.2, 1)}
        className='xl:flex-1 xl:h-auto md:h-[550px] h-[350px]'
      >
        <div className='absolute inset-0 z-[0]'>
          <EarthCanvas />
        </div>
      </motion.div>
    </div>
  );
};

export default SectionWrapper(Contact, "contact");
