import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import emailjs from "@emailjs/browser";

const useContactStore = create(
  persist(
    (set, get) => ({
      // 폼 데이터를 저장할 상태 추가
      formData: {
        name: "",
        email: "",
        message: "",
      },
      // 폼 데이터를 업데이트하는 액션 추가
      updateFormData: (newPartialData) =>
        set((state) => ({
          formData: { ...state.formData, ...newPartialData },
        })),
      // 폼 데이터를 초기화하는 액션 추가
      clearFormData: () =>
        set({ formData: { name: "", email: "", message: "" } }),

      loading: false,
      error: null,
      // submitContactForm이 스토어의 formData를 사용하도록 수정
      submitContactForm: async () => {
        const formData = get().formData; // 스토어 내부의 formData 사용
        // 간단한 유효성 검사 (필요에 따라 확장)
        if (!formData.name || !formData.email || !formData.message) {
          const errorMessage = "이름, 이메일, 메시지를 모두 입력해주세요.";
          set({ error: errorMessage, loading: false });
          // alert(errorMessage); // 또는 컴포넌트에서 submissionError를 사용해 알림
          throw new Error(errorMessage); // 에러를 throw하여 handleSubmit에서 catch 가능
        }
        set({ loading: true, error: null });
        try {
          await emailjs.send(
            import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
            {
              from_name: formData.name,
              to_name: "이현빈", // 필요시 수정
              from_email: formData.email,
              to_email: "lhb0107@naver.com", // 수신자 이메일 주소
              message: formData.message,
            },
            import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY
          );
          set({ loading: false });
          get().clearFormData(); // 성공 시 스토어의 폼 데이터 초기화
        } catch (error) {
          console.error("EmailJS Error:", error);
          const errorMessage = error.text || "메일 전송에 실패했습니다. 다시 시도해주세요.";
          set({ loading: false, error: errorMessage });
          throw error; // 컴포넌트에서 에러를 처리할 수 있도록 다시 throw
        }
      },
    }),
    {
      name: 'contact-storage',
      storage: createJSONStorage(() => localStorage),
      // partialize 함수를 수정하여 formData만 localStorage에 저장하도록 명시
      partialize: (state) => ({
        formData: state.formData,
      }),
      // version: 0, // 필요에 따라 버전 관리
    }
  )
);

export default useContactStore;