import { createResourceRoutes } from "./_factory";
import { students } from "@/db/schema/classes";

export const studentsRoutes = createResourceRoutes(students as any);
