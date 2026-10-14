import { createResourceRoutes } from "./_factory";
import { classes } from "@/db/schema/classes";

export const classesRoutes = createResourceRoutes(classes as any);
