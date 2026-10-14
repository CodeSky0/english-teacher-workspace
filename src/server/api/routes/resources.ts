import { createResourceRoutes } from "./_factory";
import { teachingResources } from "@/db/schema/resources";

export const resourcesRoutes = createResourceRoutes(teachingResources as any);
