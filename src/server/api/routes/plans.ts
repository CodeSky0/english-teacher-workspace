import { createResourceRoutes } from "./_factory";
import { lessonPlans } from "@/db/schema/plans";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export const plansRoutes = createResourceRoutes(lessonPlans as unknown as AnyPgTable);
