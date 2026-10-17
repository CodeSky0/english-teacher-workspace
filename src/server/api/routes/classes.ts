import { createResourceRoutes } from "./_factory";
import { classes } from "@/db/schema/classes";
import { ck } from "@/server/cache";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export const classesRoutes = createResourceRoutes(classes as unknown as AnyPgTable, { key: ck.classes, ttl: 300 });
