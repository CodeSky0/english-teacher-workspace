import { createResourceRoutes } from "./_factory";
import { teachingResearch } from "@/db/schema/plans";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export const researchRoutes = createResourceRoutes(teachingResearch as unknown as AnyPgTable);
