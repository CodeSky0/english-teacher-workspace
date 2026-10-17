import { createResourceRoutes } from "./_factory";
import { students } from "@/db/schema/classes";
import { ck } from "@/server/cache";
import type { AnyPgTable } from "drizzle-orm/pg-core";

export const studentsRoutes = createResourceRoutes(students as unknown as AnyPgTable, { key: ck.students, ttl: 300 });
