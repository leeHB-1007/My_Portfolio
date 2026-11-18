import {
  experiences,
  profile,
  projects,
  services,
  skillGroups,
  technologies,
  workPrinciples,
} from "../constants";
import { createJourneyLayout } from "../scroll/journeyPose";
import { buildJourneyChapters, buildJourneyItems } from "./items";

const journeyItems = buildJourneyItems({
  profile,
  services,
  experiences,
  technologies,
  skillGroups,
  projects,
  workPrinciples,
});

export const journeyChapters = buildJourneyChapters(journeyItems);

export const journeyLayout = createJourneyLayout(journeyChapters);
