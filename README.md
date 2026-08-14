# 이현빈 | Frontend Developer Portfolio

React 18, Vite, Tailwind CSS, Framer Motion, GSAP, Three.js 기반으로 만든 개인 프론트엔드 포트폴리오입니다. 소개 문구부터 경험, 기술 스택, 프로젝트 카드, 강점, 연락 채널까지 `src/constants/index.js`를 중심으로 관리하며, 3D 씬과 모션을 더하되 유지보수성과 접근성을 함께 챙기는 구성을 목표로 했습니다.

- Live Demo: https://my-portfolios-bice.vercel.app
- Name: 이현빈 / Hyun bin Lee
- Role: Frontend Developer
- Email: lhb0107@naver.com

## 개요

이 프로젝트는 한 화면 안에서 다음 내용을 일관된 흐름으로 보여줍니다.

- Hero: 이름, 역할, 핵심 헤드라인, 직접 연락 링크
- About: 소개 문구와 현재 집중 영역
- Experience: 경력, 교육, 학업 타임라인
- Skills: 대표 기술 아이콘과 스킬 그룹
- Projects: 문제 정의와 개선 포인트 중심의 케이스 스터디 카드
- Strengths: 일하는 방식과 전달 기준을 담은 6가지 강점
- Contact: EmailJS 기반 연락 폼과 직접 연결 링크

## 주요 특징

### 1. `src/constants/index.js`를 중심으로 한 단일 데이터 소스

내비게이션, 프로필, 경력, 스킬, 프로젝트, 강점, 연락 링크를 한 곳에서 관리합니다. 섹션 구성이나 문구를 바꿀 때 UI 컴포넌트보다 먼저 데이터 정의를 수정하는 구조입니다.

### 2. 지연 로딩과 `Suspense`

`src/App.jsx`에서 `Navbar`, `Hero`, `About`, `Experience`, `Tech`, `Works`, `Feedbacks`, `Contact`, `StarsCanvas`, `Footer`를 `lazy()`로 불러오고, 전역 `Suspense` fallback으로 초기 로딩 상태를 처리합니다.

### 3. 모션과 3D를 쓰되 성능과 접근성도 함께 고려

- Hero와 Strengths 섹션은 `framer-motion`의 `useReducedMotion`을 사용합니다.
- About, Skills, Projects는 GSAP + ScrollTrigger를 사용하지만 `prefers-reduced-motion` 환경에서는 애니메이션을 생략합니다.
- 외부 링크는 `target="_blank"`와 `rel="noopener noreferrer"`를 함께 사용합니다.
- 연락 폼은 `aria-live`, `role="alert"`, `role="status"`, `autoComplete`를 설정해 상태 전달과 입력 편의성을 보강합니다.

### 4. 반응형 레이아웃과 모바일 분기

- `Navbar`는 데스크톱 링크 목록과 모바일 토글 메뉴를 분리합니다.
- Hero의 `ComputersCanvas`는 큰 화면에서만 보이도록 배치되어 있고, 내부에서도 `window.innerWidth <= 500`일 때 렌더링을 중단합니다.
- Contact 섹션의 `EarthCanvas`는 별도 3D 포인트로 유지됩니다.

### 5. 케이스 스터디 중심 프로젝트 구성

`src/constants/index.js`에는 현재 6개의 프로젝트/케이스 스터디가 정의되어 있습니다.

- BoostUs: WebView OAuth 안정화
- BoostUs: 캐시 전략 및 Client -> Server Component 전환
- BoostUs: 인증 경계 재설계
- BoostUs: 폼 리팩터링과 테스트 전략
- Classic-Mac: 재사용 가능한 window 로직과 CI 가드레일
- My Portfolio: 애니메이션 충돌 정리와 R3F 최적화

### 6. 직접 연결 가능한 연락 채널

연락 폼이 실패하더라도 아래 직접 링크로 바로 연락할 수 있도록 구성되어 있습니다.

- Email: `mailto:lhb0107@naver.com`
- GitHub: https://github.com/leeHB-1007
- Velog: https://velog.io/@lhb0107
- LinkedIn: https://linkedin.com/in/lhb0107

## 기술 스택

이 저장소의 `package.json`과 실제 코드 사용 기준 주요 스택은 다음과 같습니다.

- React 18
- Vite
- Tailwind CSS
- Framer Motion
- GSAP
- Three.js
- `@react-three/fiber`
- `@react-three/drei`
- Zustand
- EmailJS (`@emailjs/browser`)
- React Router (`react-router-dom`)

## 섹션별 구현 포인트

### Hero

- `profile`, `profileLinks` 데이터를 사용해 이름, 역할, 헤드라인, 직접 링크를 표시합니다.
- 데스크톱 환경에서는 `ComputersCanvas`로 3D 데스크톱 PC 씬을 노출합니다.

### About

- 소개 문구와 `profile.focus`를 함께 배치합니다.
- `services` 데이터를 카드 형태로 보여줍니다.

### Experience

- `react-vertical-timeline-component`로 경력 흐름을 시각화합니다.
- 실무, 교육, 학업을 하나의 타임라인으로 연결합니다.

### Skills

- `technologies`와 `skillGroups`를 함께 사용해 대표 기술과 확장 가능한 스택을 분리해 보여줍니다.

### Projects / Case Studies

- 각 카드는 문제 정의, 설명, 핵심 개선 포인트, 태그를 포함합니다.
- 카드 진입 애니메이션은 GSAP ScrollTrigger로 처리합니다.

### Strengths

`workPrinciples`에 정의된 6가지 강점이 카드로 렌더링됩니다.

1. Prioritization First
2. Structure That Lasts
3. Performance With Evidence
4. DX To UX
5. Verification Mindset
6. Collaboration As Delivery

### Contact

- Zustand store(`src/store/contractStore.js`)가 폼 상태와 전송 로직을 관리합니다.
- EmailJS 전송 실패 시에도 직접 링크를 사용할 수 있도록 안내 문구와 링크 카드를 함께 제공합니다.
- Contact 섹션에는 별도의 `EarthCanvas` 3D 씬이 포함됩니다.

## 프로젝트 구조

```text
.
├── public/
│   ├── desktop_pc/        # Hero 3D 모델 및 license.txt
│   └── planet/            # Contact 3D 모델 및 license.txt
├── src/
│   ├── assets/            # 이미지, 아이콘, 프로젝트 비주얼
│   ├── components/        # Hero/About/Experience/Skills/Projects/Strengths/Contact 등 UI
│   ├── components/canvas/ # R3F canvas 구성요소
│   ├── constants/         # 프로필, 섹션 데이터, 링크, 프로젝트 정의
│   ├── hoc/               # Section wrapper
│   ├── store/             # Zustand contact store
│   ├── utils/             # motion 유틸
│   ├── App.jsx
│   └── main.jsx
├── Dockerfile
├── nginx.conf
├── package.json
└── vite.config.js
```

## 시작하기

### prerequisites

- Node.js 18+
- npm

### 설치

```bash
npm install
```

### 개발 서버

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
```

### 빌드 결과 미리보기

```bash
npm run preview
```

## 환경 변수

연락 폼은 EmailJS를 사용합니다. 루트에 `.env` 파일을 두고 아래 값을 설정하면 됩니다.

```env
VITE_APP_EMAILJS_SERVICE_ID=your_service_id
VITE_APP_EMAILJS_TEMPLATE_ID=your_template_id
VITE_APP_EMAILJS_PUBLIC_KEY=your_public_key
```

EmailJS 설정이 없거나 전송이 실패해도, UI에는 Email / GitHub / Velog / LinkedIn 직접 링크가 함께 노출됩니다.

## 배포

### Vercel

현재 공개 데모는 Vercel에서 운영 중입니다.

- Live Demo: https://my-portfolios-bice.vercel.app
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

### Docker

이 저장소에는 `Dockerfile`과 `nginx.conf`가 포함되어 있어 정적 빌드 산출물을 Nginx로 서빙할 수 있습니다.

```bash
docker build -t my-portfolios .
docker run --rm -p 8080:80 my-portfolios
```

## 검증 메모

README를 기준으로 로컬 검증할 때는 아래를 확인하면 됩니다.

- `npm run dev`: 개발 서버 실행 여부
- `npm run build`: Vite 프로덕션 빌드 성공 여부
- `npm run preview`: 빌드 결과 미리보기
- 데스크톱 넓이에서 Hero 3D PC 씬이 보이는지
- 매우 작은 모바일 폭(`<= 500px`)에서 Hero 3D PC 씬이 비활성화되는지
- Contact 폼 실패 시에도 직접 링크 카드가 계속 노출되는지

## 3D 모델 및 라이선스 파일

3D 모델 출처와 라이선스 정보는 저장소 안의 원본 파일에 포함되어 있습니다.

- `public/planet/license.txt`
- `public/desktop_pc/license.txt`

README에서는 별도 라이선스 조건을 재작성하지 않고, 위 파일을 기준으로 확인하는 방식을 따릅니다.
