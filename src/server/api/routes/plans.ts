import { createResourceRoutes } from "./_factory";
import { lessonPlans } from "@/db/schema/plans";

export const plansRoutes = createResourceRoutes(lessonPlans as any);
