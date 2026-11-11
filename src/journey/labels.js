// 위성 라벨·연결선 요소 레지스트리(id → element). DOM 쪽 Journey가 등록하고
// Canvas 쪽 PlanetSystem이 매 프레임 위치를 쓴다. three를 import하지 않는다.
const elements = new Map();

// 앞 위성과 카드를 잇는 연결선의 id
export const CONNECTOR_ID = "journey-connector";
// 행성 아래 챕터 이름표의 id
export const PLANET_TAG_ID = "journey-planet-tag";

export const registerLabel = (id, element) => {
  elements.set(id, element);
  return () => {
    if (elements.get(id) === element) elements.delete(id);
  };
};

export const getLabel = (id) => elements.get(id) || null;
