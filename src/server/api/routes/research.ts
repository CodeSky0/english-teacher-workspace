import { createResourceRoutes } from "./_factory";
import { teachingResearch } from "@/db/schema/plans";

export const researchRoutes = createResourceRoutes(teachingResearch as any);
