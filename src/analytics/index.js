// 사용 분석(PostHog). 프로젝트 토큰(VITE_POSTHOG_PROJECT_TOKEN)이 있는 프로덕션 빌드에서만 켠다.
// posthog-js는 첫 화면(Hero)을 그린 뒤 브라우저가 한가할 때 별도 청크로 불러와 첫 로딩을 늦추지 않는다.
// 불러오기 전에 생긴 이벤트는 잠시 쌓아 두었다가 보낸다. 토큰이 없으면 모든 호출이 아무것도 하지 않는다.

const QUEUE_LIMIT = 50;
// 브라우저가 한가해지지 않아도 이 시간(ms) 안에는 불러온다.
const LOAD_TIMEOUT_MS = 4000;

// enabled: 분석을 켤지, load: posthog 클라이언트를 돌려주는 비동기 함수(초기화 포함)
export const createAnalytics = ({ enabled, load }) => {
  let client = null;
  let started = false;
  const queue = [];

  const flush = () => {
    queue.splice(0).forEach(([event, properties]) => client.capture(event, properties));
  };

  return {
    start(schedule = (run) => run()) {
      if (!enabled || started) return;
      started = true;
      schedule(() =>
        load()
          .then((loaded) => {
            client = loaded;
            flush();
          })
          // 광고 차단기 등으로 불러오지 못하면 조용히 끈다.
          .catch(() => {
            queue.length = 0;
          })
      );
    },
    track(event, properties) {
      if (!enabled) return;
      if (client) client.capture(event, properties);
      else if (queue.length < QUEUE_LIMIT) queue.push([event, properties]);
    },
  };
};

const TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

const analytics = createAnalytics({
  enabled: Boolean(TOKEN) && import.meta.env.PROD && typeof window !== "undefined",
  load: () =>
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(TOKEN, {
        api_host: HOST,
        defaults: "2026-08-30",
        // 브라우저의 추적 거부(Do Not Track) 설정을 따른다.
        respect_dnt: true,
      });
      return posthog;
    }),
});

const whenIdle = (run) => {
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: LOAD_TIMEOUT_MS });
  else window.setTimeout(run, LOAD_TIMEOUT_MS / 2);
};

export const startAnalytics = () => analytics.start(whenIdle);
export const track = (event, properties) => analytics.track(event, properties);
