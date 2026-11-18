import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

import useContactStore from "../store/contractStore";
import { profileLinks } from "../constants";
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
    <div className="contact-layout">
      <motion.div variants={slideIn("left", "tween", 0.2, 1)} className="contact-panel">
        <p className="contact-sub">Get in touch</p>
        <h3 className="contact-title">Contact.</h3>

        <p className="contact-lead">
          폼이 실패해도 아래 채널로 바로 연락할 수 있도록 직접 링크를 함께
          제공합니다.
        </p>

        <ul className="contact-links">
          {profileLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                className="contact-link"
              >
                <p className="contact-link-label">{link.label}</p>
                <p className="contact-link-value">{link.value}</p>
              </a>
            </li>
          ))}
        </ul>

        <form ref={formRef} onSubmit={handleSubmit} className="contact-form">
          <label className="contact-field">
            <span className="contact-field-label">Your Name</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="이름을 적어주세요"
              required
              autoComplete="name"
              className="contact-input"
            />
          </label>

          <label className="contact-field">
            <span className="contact-field-label">Your email</span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일 주소를 적어주세요"
              required
              autoComplete="email"
              className="contact-input"
            />
          </label>

          <label className="contact-field">
            <span className="contact-field-label">Your Message</span>
            <textarea
              rows={6}
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="내용을 적어주세요"
              required
              className="contact-input"
            />
          </label>

          {submissionError && (
            <p
              className="contact-message text-red-300"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {submissionError}
            </p>
          )}

          {successMessage && !submissionError && (
            <p
              className="contact-message text-emerald-300"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {successMessage}
            </p>
          )}

          <button type="submit" className="contact-submit" disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default SectionWrapper(Contact, "contact");
