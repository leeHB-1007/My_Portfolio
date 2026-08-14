import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

import useContactStore from "../store/contractStore";
import { styles } from "../styles";
import { profileLinks } from "../constants";
import { EarthCanvas } from "./canvas";
import { SectionWrapper } from "../hoc";
import { slideIn } from "../utils/motion";

const Contact = () => {
  const formRef = useRef();
  const [successMessage, setSuccessMessage] = useState("");
  const {
    loading,
    submitContactForm,
    error: submissionError,
    formData,
    updateFormData,
  } = useContactStore();

  const handleChange = (event) => {
    const { name, value } = event.target;
    updateFormData({ [name]: value });
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");

    try {
      await submitContactForm();
      setSuccessMessage("메시지를 전송했습니다. 곧 답장드리겠습니다.");
    } catch (error) {
      void error;
    }
  };

  return (
    <div className="xl:mt-12 flex flex-col-reverse gap-10 overflow-hidden xl:flex-row">
      <motion.div
        variants={slideIn("left", "tween", 0.2, 1)}
        className="z-10 flex-[0.75] rounded-2xl bg-black-100 p-8"
      >
        <p className={styles.sectionSubText}>Get in touch</p>
        <h3 className={styles.sectionHeadText}>Contact.</h3>

        <p className="mt-5 max-w-2xl text-[16px] leading-8 text-secondary">
          폼이 실패해도 아래 채널로 바로 연락할 수 있도록 직접 링크를 함께
          제공합니다.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {profileLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              className="rounded-2xl border border-white/10 bg-tertiary/70 p-4 transition hover:border-[#915EFF]"
            >
              <p className="text-sm uppercase tracking-[0.25em] text-[#b9b1f5]">
                {link.label}
              </p>
              <p className="mt-2 break-all text-[15px] text-white-100">
                {link.value}
              </p>
            </a>
          ))}
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mt-12 flex flex-col gap-8"
        >
          <label className="flex flex-col">
            <span className="mb-4 font-medium text-white">Your Name</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="이름을 적어주세요"
              required
              autoComplete="name"
              className="rounded-lg border border-transparent bg-tertiary px-6 py-4 font-medium text-white outline-none transition placeholder:text-secondary focus:border-[#915EFF]"
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-4 font-medium text-white">Your email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일 주소를 적어주세요"
              required
              autoComplete="email"
              className="rounded-lg border border-transparent bg-tertiary px-6 py-4 font-medium text-white outline-none transition placeholder:text-secondary focus:border-[#915EFF]"
            />
          </label>

          <label className="flex flex-col">
            <span className="mb-4 font-medium text-white">Your Message</span>
            <textarea
              rows={7}
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="내용을 적어주세요"
              required
              className="resize-none rounded-lg border border-transparent bg-tertiary px-6 py-4 font-medium text-white outline-none transition placeholder:text-secondary focus:border-[#915EFF]"
            />
          </label>

          {submissionError && (
            <p
              className="text-sm text-red-300"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {submissionError}
            </p>
          )}

          {successMessage && !submissionError && (
            <p
              className="text-sm text-emerald-300"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-fit rounded-xl bg-tertiary px-8 py-3 font-bold text-white shadow-md shadow-primary outline-none transition hover:bg-[#2a2547] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </motion.div>

      <motion.div
        variants={slideIn("right", "tween", 0.2, 1)}
        className="relative min-h-[320px] xl:flex-1 xl:h-auto"
      >
        <div className="absolute inset-0 z-0">
          <EarthCanvas />
        </div>
      </motion.div>
    </div>
  );
};

export default SectionWrapper(Contact, "contact");
