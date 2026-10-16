import { createResourceRoutes } from "./_factory";
import { classes } from "@/db/schema/classes";
import { ck } from "@/server/cache";

export const classesRoutes = createResourceRoutes(classes as any, { key: ck.classes, ttl: 300 });
