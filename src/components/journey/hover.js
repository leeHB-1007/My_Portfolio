import { setJourneyHover } from "../../scroll/scrollRig";

// 위성 라벨·목차 버튼에 마우스나 포커스가 올라가면 그 위성을 3D에서 강조한다(강조는 PlanetSystem).
export const hoverProps = (itemId) => ({
  onPointerEnter: () => setJourneyHover(itemId),
  onPointerLeave: () => setJourneyHover(null),
  onFocus: () => setJourneyHover(itemId),
  onBlur: () => setJourneyHover(null),
});
