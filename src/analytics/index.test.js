import { describe, expect, it, vi } from "vitest";

import { createAnalytics, track } from "./index";

const fakeClient = () => ({ capture: vi.fn() });

describe("createAnalytics", () => {
  it("꺼져 있으면 불러오지도 보내지도 않는다", () => {
    const load = vi.fn();
    const analytics = createAnalytics({ enabled: false, load });
    analytics.start();
    analytics.track("event");
    expect(load).not.toHaveBeenCalled();
  });

  it("불러오기 전 이벤트는 쌓아 두었다가 보내고, 그 뒤로는 바로 보낸다", async () => {
    const client = fakeClient();
    const analytics = createAnalytics({ enabled: true, load: () => Promise.resolve(client) });
    analytics.track("before", { a: 1 });
    analytics.start();
    analytics.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(client.capture).toHaveBeenCalledWith("before", { a: 1 });
    analytics.track("after");
    expect(client.capture).toHaveBeenCalledTimes(2);
  });

  it("불러오지 못하면 조용히 버린다", async () => {
    const analytics = createAnalytics({ enabled: true, load: () => Promise.reject(new Error("blocked")) });
    analytics.track("event");
    analytics.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(() => analytics.track("later")).not.toThrow();
  });
});

describe("track", () => {
  it("토큰이 없는 환경(테스트·개발)에서는 아무것도 하지 않는다", () => {
    expect(() => track("event", { a: 1 })).not.toThrow();
  });
});
