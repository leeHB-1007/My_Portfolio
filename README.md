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

- `Navbar`, `Hero`, `MotionToggle`과 정적 배경(`StaticGalaxy`)은 처음부터 함께 로드합니다. 이름·역할·연락 링크가 3D 코드 로딩을 기다리지 않게 하기 위해서이며, 이 경로에는 `three`·`framer-motion`을 import하지 않습니다.
- 은하 canvas(`GalaxyCanvas`)는 `lazy()`와 별도의 `Suspense`로 불러옵니다. 로딩 중이거나 실패하면 아래에 깔린 `StaticGalaxy`가 그대로 보입니다.
- `About`, `Experience`, `Tech`, `Works`, `Feedbacks`, `Contact`, `Footer`는 `lazy()`로 불러오고 하나의 `Suspense`로 묶습니다.

### 3. 스크롤 연동 은하 배경

첫 화면에서 작게 보이던 은하에 스크롤에 따라 카메라가 공전하며 다가가는 연출입니다. 스크롤을 가로채지 않고 네이티브 스크롤 위치만 읽습니다.

- 고정 레이어: 뷰포트 크기의 `position: fixed` 레이어에 R3F canvas 1장, 그 아래 `StaticGalaxy`, 그 위 베일(`--veil`)을 둡니다.
- sticky 인트로: Hero는 `div.hero-track`(220vh, 폭 640px 이하 160vh) 안의 `section.hero-stage`(`position: sticky`)로 구성됩니다. 트랙을 지나는 동안 Hero 텍스트가 `--hero-p`에 따라 사라지고 카메라가 은하에 접근합니다. 화면 높이가 낮거나(559px 이하) 모션 줄이기 환경에서는 고정하지 않고 일반 흐름으로 표시하며, 이 판정은 `src/index.css`의 미디어쿼리만으로 합니다.
- `scrollRig`(`src/scroll/`): passive scroll 리스너 1개와 rAF로 진행도를 계산해 카메라 목표 pose(`samplePose`), CSS 변수, Navbar 상태를 갱신합니다. 인트로 이후에는 베일로 어둡게 누른 은하가 천천히 흐릅니다.
- 모션 줄이기(`prefers-reduced-motion`): 스크롤과 무관한 고정 시점으로 마운트와 리사이즈 때만 그립니다.
- 일시정지: 우하단 `MotionToggle`로 자전·반짝임을 멈출 수 있고(상태는 `localStorage`에 저장), 스크롤에 따른 카메라 이동은 유지됩니다.
- 폴백: WebGL 오류는 `CanvasErrorBoundary`가 받아 `StaticGalaxy`를 보여주고, WebGL 컨텍스트가 손실되면 canvas를 숨겼다가 복구 시 다시 그립니다.
- 성능: 화면 폭에 따라 입자 수를 정하고(45,000 / 25,000 / 12,000), drei `PerformanceMonitor`가 프레임 저하를 감지하면 입자 수와 dpr을 한 번 낮춥니다.
- 은하 표현: 별은 가우시안 원형에 멱분포 크기·색온도를 섞고 밝은 별에는 회절 스파이크를 붙입니다. 나선팔을 따라 성운(발광)과 먼지(어두운 띠) 구름을, 중심에는 따뜻한 빛 그라디언트를, 바깥에는 깊은 배경 별밭과 색 얼룩을 둡니다.
- 후처리(`PostEffects`): three 기본 제공 `EffectComposer`로 블룸 → ACES 톤매핑(`OutputPass`) → 비네팅·필름 그레인·색수차를 그립니다. 좁은 화면이나 성능 하향 시 블룸 해상도를 절반으로 낮추고, 둘이 겹치면 블룸을 끕니다.

#### 은하 항해(은하 속 행성, 위성을 스크롤로 하나씩)

Hero 인트로가 끝나면 카메라가 은하의 나선팔 한 지점으로 파고들어 챕터(About, Experience, Skills, Projects, Strengths)마다 작은 행성 하나를 비춥니다. 행성 주위에는 그 챕터의 세부항목이 위성으로 모두 떠 있고(5/4/9/6/6개), 스크롤하면 위성 고리가 회전목마처럼 돌며 앞으로 온 위성의 설명 카드가 차례로 나타납니다. 챕터의 위성을 다 지나면 카메라가 솟아올라 은하 전체를 보였다가 다음 행성으로 파고듭니다.

- 모드: `JOURNEY_QUERY = "(min-height: 600px) and (prefers-reduced-motion: no-preference)"`(`src/journey/useJourneyMode.js`)가 참이고 은하 canvas를 쓸 수 있으면 `Hero → Journey → Contact → Footer`입니다. 낮은 화면, 모션 줄이기, WebGL 오류·컨텍스트 손실(`src/scroll/canvasStatus.js`)에서는 기존 일반 섹션(About~Feedbacks)과 드리프트 배경을 렌더합니다.
- 스크롤 구조: `div.journey-track`(Hero 트랙의 마지막 한 화면과 겹침) 안의 `section.journey-stage`(sticky, 100svh). 챕터 구간 = 이동(`TRAVEL_VH = 1.0`) + 도착(`ARRIVE_VH = 0.6`) + 위성 n개(각 `ITEM_VH = 0.42`)이며, 단계·위성 번호·진행도와 패널·본문 투명도는 `src/scroll/journeyPose.js`의 순수 함수가 계산합니다.
- 규모: 행성 반지름 0.085, 위성 0.02, 행성 높이 0.06(원반 입자층 안)으로 은하에 비해 작습니다. 카메라는 행성에서 0.82×fit 거리까지 다가가고, 은하 셰이더는 카메라 가까이(0.08~0.35)의 입자를 페이드합니다. 멀리서는 행성 자리마다 비콘이 보입니다.
- 데이터·배치: `src/journey/items.js`가 항목과 챕터를, `src/journey/planets.js`가 행성 위치(`createPlanets`), 고리 각도(`ringAngle`), 위성 위치(`satellitePosition`)를 계산합니다. 행성의 시간 회전(`rotateByTime`)은 은하 셰이더와 같은 식(`ROTATION_GLSL`)을 쓰고, 위성 고리는 행성의 공전 좌표계에 고정됩니다.
- 3D: `PlanetSystem`이 챕터마다 다른 행성(가스 거성, 고리와 그림자가 있는 가스 거성, 구름·도시 불빛이 있는 바다 행성, 얇은 고리의 얼음 거성, 균열이 빛나는 용암 행성)을 텍스처 없이 노이즈로 그립니다. 조명은 카메라 기준 왼쪽 위 앞의 태양 하나이고, 대기 껍질의 프레넬 산란과 은하 중심 쪽 역광 테두리를 더합니다. 위성은 크레이터가 있는 작은 암석 달이며 앞 위성은 림 라이트와 선택 고리로 강조합니다. 현재 챕터 위성의 화면 좌표를 라벨 레지스트리(`src/journey/labels.js`)의 DOM 라벨과 연결선에 매 프레임 씁니다.
- 움직임: 이동은 출발이 느리고 도착이 길며, 이동 중에는 방위각 속도에 비례한 기울임(최대 6°)과 시야각 변화(60° → 68°)가 있습니다. 도착하면 위성이 고리를 따라 차례로 나타나고 행성 후광이 한 번 밝아집니다. 모두 스크롤 위치로 정해지며, 시간에 따른 움직임(유휴 흔들림, 위성 흔들림)은 일시정지 중 멈춥니다. 항해가 끝나면 카메라가 은하 중심을 향해 물러나 마지막 장면(Contact)이 됩니다: 넓은 화면은 은하 전체가 오른쪽, 좁은 화면은 위쪽 배경이며, 일반 섹션 모드도 Contact가 들어올 때 같은 구도로 바뀝니다(`CONTACT_SCENE`). 은하 canvas는 첫 프레임을 그린 뒤 서서히 나타납니다.
- 챕터 패널: 챕터마다 반투명 유리 패널(1px 그라디언트 테두리. 매 프레임 바뀌는 WebGL 위의 `backdrop-filter`는 프레임당 약 3.5ms가 들어 쓰지 않음) 1개가 도착·위성 단계 내내 유지됩니다. 머리(큰 챕터 번호, 소제목, 챕터 제목, 한 줄 설명) → 목차 → 본문(위성 본문 30개는 모두 DOM에 있고, 보이지 않는 패널·본문은 `visibility: hidden`으로 합성 레이어에서 뺌) 순입니다. 도착 단계에는 목차가 큰 세로 번호 목록으로 보이고, 첫 위성으로 들어가면 작은 목차 줄(현재 항목만 제목 표시, 진행 선)로 접히며 본문이 들어옵니다. 본문은 제목·문단·목록이 서로 다른 시점·거리로 올라오는 시차로 나타나며, 모두 rig가 쓰는 `--k`를 CSS가 읽어 스크롤에 맞춰 스크럽(되돌리면 역재생)됩니다. 내부 세로 스크롤 없이 CSS로 압축합니다.
- 화면 구성(`JOURNEY_VIEWS`): 폭 1024px 이상은 행성 가로 30%·패널 오른쪽(가로 54~92%), 768~1023px은 같은 좌우 배치에 카메라를 조금 물리고 패널을 가로 50%부터, 768px 미만은 위쪽이 행성·고리 전용이고 패널이 그 아래(세로 35%부터)이며 현재 위성 라벨만 보입니다. 목차 줄은 모든 폭에서 한 줄 가로 스크롤입니다. 앞 위성이 패널과 겹치지 않는지는 투영 계산(`src/journey/projection.js`)으로 단위 테스트합니다.
- 모드 전환: 항해 ↔ 일반 섹션으로 트리가 바뀌면 바뀌기 직전에 읽던 섹션 앵커로 이동합니다(`src/scroll/sectionMemory.js`). WebGL 컨텍스트 손실은 2초 안에 복구되지 않을 때만 일반 섹션으로 내려갑니다.
- 이동 구간: 다음 행성으로 가는 동안 화면 가운데에 챕터 번호·제목·소제목·위성 수가 떴다 사라지고(스크롤 스크럽), 행성 이름표는 글자를 감추고 목적지를 가리키는 행성 둘레 점선 원만 남깁니다.
- 첫 도착 안내: 첫 챕터에 도착하면 "스크롤 / ← → 방향키 / 버튼" 안내가 한 번 뜨고, 첫 조작 뒤 사라져 세션 동안(`sessionStorage`) 다시 뜨지 않습니다.
- 패널 아래 이전·다음 줄: 다음 위성(챕터의 마지막이면 다음 행성, 전체 마지막이면 Contact)의 이름을 보여 주는 버튼으로, 넘기기 버튼·방향키와 같은 정지점으로 이동합니다.
- Navbar: 항해 중에는 현재 챕터 링크에 `aria-current`와 밑줄을 달고, Navbar 아래 얇은 선으로 전체 진행도를 보여 줍니다.
- 내비게이션: 위성 라벨(가는 선 + 자간 넓은 태그)이나 목차를 누르면 그 위성 위치로 스크롤하고, 마우스·포커스를 올리면 그 위성이 3D에서 강조됩니다. 행성 아래에는 챕터 번호 + 제목 이름표가 따라다니고, 앞 위성에서 패널 가장자리의 점까지 연결선이 이어집니다. 오른쪽에는 번호 눈금과 현재 챕터 이름(세로 글자)의 챕터 내비게이션이 있으며(터치 대상 44px, 호버·포커스 시 챕터 이름 표시, 좁은 화면은 위쪽 가로 눈금), 트랙 안의 `#about`~`#strengths` 앵커(각 챕터 첫 위성)로 Navbar 링크가 동작합니다.
- 이전/다음: 스크롤 말고도 스테이지의 이전/다음 버튼이나 방향키(← →)로 정지점(챕터마다 도착 1개 + 위성 n개, 전체 35개) 사이를 넘깁니다(`journeyStops`, `stepJourney`). 넘기기·라벨·목차 이동은 rig가 rAF로 직접 보간하며(`src/scroll/stepMotion.js`: 같은 챕터 한 칸 약 0.9초, 챕터를 넘는 이동 약 2.4초, Hero·Contact 경계 약 2.0초), 휠·터치·스크롤 키로 직접 스크롤하면 즉시 멈춥니다. 첫 정지점에서 이전은 Hero 맨 위로, 마지막 정지점에서 다음은 Contact로 이동하며, 입력 칸에 포커스가 있거나 수정 키를 함께 누르면 방향키는 동작하지 않습니다.
- 스크롤 감각: 네이티브 스크롤은 그대로 두고, rig가 장면 계산에 쓰는 위치만 실제 스크롤을 임계 감쇠 스프링으로 지연 보간(`src/scroll/smoothScroll.js`, 스프링 시간 0.06초)해 휠의 끊김이 화면에 드러나지 않게 합니다. 속도가 0에서 부드럽게 올라가므로 휠 한 칸마다 속도가 튀지 않습니다. 항해 구간 안에서는 휠·트랙패드 한 번(한 제스처)이 정지점 한 칸 자동 넘기기입니다(위성 사이 1.3초, 행성 사이 3.2초, `STEP_TIMING`). 손으로 스크롤하면 위성·행성 사이에서 중간에 끊기므로 버튼·방향키와 같은 넘기기 보간으로 옮기며, 넘기는 동안의 휠·터치 입력은 막습니다. 넘긴 뒤 같은 방향으로 이어지며 줄어드는 입력(휠을 계속 돌리는 중, 트랙패드 관성)은 같은 제스처로 보고 무시하고, 0.12초 쉬었다 굴리거나 다시 세게 밀거나 방향을 바꾸면 바로 넘깁니다(`WHEEL_GESTURE`). 위성 한 칸 넘기기는 고리가 돌고 본문이 바뀌는 구간에 시간의 70%를 쓰고 앞뒤의 화면이 그대로인 구간은 빠르게 지나갑니다(`createGlide`의 `focus`). 터치·스크롤바·스크롤 키처럼 네이티브로 스크롤한 경우에는 멈추고 약 0.26초 뒤 방금 스크롤한 방향의 다음 정지점으로 같은 시간 규칙으로 정착합니다(이번 스크롤이 정지점을 지나쳤으면 지나친 정지점과 다음 정지점 중 가까운 쪽). 터치·스크롤바 드래그 중이거나 Hero·Contact로 나가는 방향에서는 정착하지 않습니다.

### 4. 모션과 3D를 쓰되 성능과 접근성도 함께 고려

- Strengths 섹션은 `framer-motion`의 `useReducedMotion`을 사용하고, Hero의 스크롤 인디케이터는 CSS 애니메이션이라 모션 줄이기 환경에서 멈춥니다.
- About, Skills, Projects는 GSAP + ScrollTrigger를 사용하지만 `prefers-reduced-motion` 환경에서는 애니메이션을 생략합니다.
- 외부 링크는 `target="_blank"`와 `rel="noopener noreferrer"`를 함께 사용합니다.
- 연락 폼은 `aria-live`, `role="alert"`, `role="status"`, `autoComplete`를 설정해 상태 전달과 입력 편의성을 보강합니다.

### 5. 반응형 레이아웃과 모바일 분기

- `Navbar`는 데스크톱 링크 목록과 모바일 토글 메뉴를 분리합니다.
- Hero는 화면 높이에 따라 소개 문단(860px 이하 또는 폭 640px 이하), 집중 영역 칩과 스크롤 인디케이터(700px 이하)를 숨겨 고정된 첫 화면 안에 이름·헤드라인·링크가 들어가게 합니다.
- 항해 화면은 넓은 화면(1024px 이상), 중간(768~1023px), 좁은 화면(768px 미만)으로 배치를 나눕니다. 중간·좁은 화면에서는 현재 위성 라벨만 보이고, 패널 아래 이전·다음 줄은 좁은 화면에서 숨깁니다(아래 넘기기 버튼이 같은 역할).
- 글꼴: 라틴은 Poppins, 한글은 Pretendard(jsDelivr의 dynamic subset 스타일시트, `index.html`)가 받도록 글꼴 스택을 `index.css`와 `tailwind.config.cjs`에 함께 둡니다.

### 6. 케이스 스터디 중심 프로젝트 구성

`src/constants/index.js`에는 현재 6개의 프로젝트/케이스 스터디가 정의되어 있습니다.

- BoostUs: WebView OAuth 안정화
- BoostUs: 캐시 전략 및 Client -> Server Component 전환
- BoostUs: 인증 경계 재설계
- BoostUs: 폼 리팩터링과 테스트 전략
- Classic-Mac: 재사용 가능한 window 로직과 CI 가드레일
- My Portfolio: 애니메이션 충돌 정리와 R3F 최적화

### 7. 직접 연결 가능한 연락 채널

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
- 배경의 은하와 함께 sticky 인트로로 동작하며, 인트로가 진행되면 텍스트가 페이드되고 클릭을 받지 않습니다. 키보드 포커스가 페이드된 Hero로 들어오면 텍스트가 보이는 인트로 시작 위치로 스크롤합니다.

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
- Contact는 항해의 마지막 장면입니다. 항해 패널과 같은 유리 패널(넓은 화면에서 왼쪽 약 46%)에 링크 카드와 폼을 두고, 오른쪽은 물러난 은하가 보이도록 비웁니다. Footer도 같은 톤의 가는 선과 작은 글자로 정리했습니다.

## 프로젝트 구조

```text
.
├── public/
│   └── planet/            # Contact 3D 모델 및 license.txt
├── src/
│   ├── assets/            # 이미지, 아이콘, 프로젝트 비주얼
│   ├── components/        # Hero/About/Experience/Skills/Projects/Strengths/Contact 등 UI
│   ├── components/canvas/ # R3F canvas 구성요소(은하, 행성)와 정적 배경
│   ├── components/journey/ # 은하 항해 챕터 패널·인터스티셜·위성 라벨·챕터 내비게이션·넘기기·조작 안내
│   ├── journey/           # 항해 항목·챕터 구성, 행성·위성 배치, 라벨 레지스트리, 모드 판정
│   ├── scroll/            # scrollRig, 카메라 pose 계산(인트로·항해), 모션 일시정지 상태
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

### 단위 테스트

```bash
npm test
```

Vitest로 은하 geometry 생성, 스크롤 → 카메라 pose 계산(`samplePose`), 항해 항목·챕터 구성, 행성 배치·위성 고리, 구간 계산을 검증합니다.

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

사용 분석(PostHog)은 아래 값이 있을 때만 프로덕션 빌드에서 켜집니다. 전체 목록은 `.env.example`에 있습니다.

```env
VITE_POSTHOG_PROJECT_TOKEN=phc_your_project_token
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

## 모니터링과 사용 분석

- **Vercel Web Analytics·Speed Insights**: 방문·유입 경로와 실제 사용자 성능(LCP·INP·CLS)을 Vercel 프로젝트 대시보드의 Analytics·Speed Insights 탭에서 봅니다. 대시보드에서 각각 Enable해야 수집됩니다(`src/App.jsx`).
- **PostHog**: 이벤트·퍼널·세션 리플레이와 feature flag·실험(A/B)에 씁니다. `posthog-js`는 첫 화면을 그린 뒤 브라우저가 한가할 때 별도 청크로 불러오고, 브라우저의 Do Not Track 설정을 따릅니다(`src/analytics/index.js`).
- 수집하는 이벤트:

| 이벤트 | 속성 | 시점 |
| --- | --- | --- |
| `journey_chapter_reached` | `chapter`(1~), `id` | 항해에서 챕터에 처음 도착 |
| `journey_completed` | - | 항해 트랙 끝을 지남 |
| `contact_form_submitted` | `result`(`success`·`error`) | 연락 폼 전송 결과 |
| `contact_link_clicked` | `channel`, `location`(`hero`·`contact`) | 직접 연락 링크 클릭 |

## 배포

### Vercel

현재 공개 데모는 Vercel에서 운영 중입니다.

- Live Demo: https://my-portfolios-bice.vercel.app
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment Variables: EmailJS·PostHog 값(`.env.example` 참고)

### Docker

이 저장소에는 `Dockerfile`과 `nginx.conf`가 포함되어 있어 정적 빌드 산출물을 Nginx로 서빙할 수 있습니다.

```bash
docker build -t my-portfolios .
docker run --rm -p 8080:80 my-portfolios
```

## 검증 메모

README를 기준으로 로컬 검증할 때는 아래를 확인하면 됩니다.

- `npm run dev`: 개발 서버 실행 여부
- `npm test`: 단위 테스트 통과 여부
- `npm run build`: Vite 프로덕션 빌드 성공 여부
- `npm run preview`: 빌드 결과 미리보기
- 스크롤하는 동안 Hero가 고정되고 은하에 접근하는지, 인트로가 끝난 뒤 본문이 읽히는지
- 모션 줄이기 환경에서 Hero가 고정되지 않고 은하가 정지 화면으로 보이는지
- 스크롤 성능: `scripts/bench-scroll.js` 내용을 브라우저 콘솔에 붙여 넣고 `await benchScroll()`을 실행하면 평균·p95 프레임 시간과 드롭 비율을 반환합니다.
- 우하단 일시정지 버튼을 누르면 은하의 자전이 멈추고 새로고침 후에도 유지되는지
- Contact 폼 실패 시에도 직접 링크 카드가 계속 노출되는지

## 3D 모델 및 라이선스 파일

3D 모델 출처와 라이선스 정보는 저장소 안의 원본 파일에 포함되어 있습니다.

- `public/planet/license.txt`

배경의 은하는 외부 모델 없이 코드로 생성합니다.

README에서는 별도 라이선스 조건을 재작성하지 않고, 위 파일을 기준으로 확인하는 방식을 따릅니다.
