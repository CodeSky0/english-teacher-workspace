import { createResourceRoutes } from "./_factory";
import { students } from "@/db/schema/classes";
import { ck } from "@/server/cache";

export const studentsRoutes = createResourceRoutes(students as any, { key: ck.students, ttl: 300 });
