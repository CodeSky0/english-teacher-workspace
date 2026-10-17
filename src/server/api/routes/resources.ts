import { createResourceRoutes } from "./_factory";
import { teachingResources } from "@/db/schema/resources";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export const resourcesRoutes = createResourceRoutes(teachingResources as unknown as AnyPgTable);
