import { create } from "zustand";
import emailjs from "@emailjs/browser";

const emptyFormData = {
  name: "",
  email: "",
  message: "",
};

const useContactStore = create((set, get) => ({
  formData: emptyFormData,
  updateFormData: (newPartialData) =>
    set((state) => ({
      formData: { ...state.formData, ...newPartialData },
    })),
  clearFormData: () =>
    set({ formData: emptyFormData }),
  loading: false,
  error: null,
  submitContactForm: async () => {
    const formData = get().formData;

    if (!formData.name || !formData.email || !formData.message) {
      const errorMessage = "이름, 이메일, 메시지를 모두 입력해주세요.";
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }

    set({ loading: true, error: null });

    try {
      await emailjs.send(
        import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          to_name: "이현빈",
          from_email: formData.email,
          to_email: "lhb0107@naver.com",
          message: formData.message,
        },
        import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY
      );
      set({ loading: false });
      get().clearFormData();
    } catch (error) {
      console.error("EmailJS Error:", error);
      const errorMessage = error.text || "메일 전송에 실패했습니다. 다시 시도해주세요.";
      set({ loading: false, error: errorMessage });
      throw error;
    }
  },
}));

export default useContactStore;
