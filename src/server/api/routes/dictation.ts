import { createResourceRoutes } from "./_factory";
import { dictationLists, dictationWords, dictationResults } from "@/db/schema/dictation";
import { Hono } from "hono";

const routes = new Hono<{ Variables: { user: { id: string }; session: any } }>();

const listsCrud = createResourceRoutes(dictationLists as any);
const wordsCrud = createResourceRoutes(dictationWords as any);
const resultsCrud = createResourceRoutes(dictationResults as any);

routes.route("/lists", listsCrud);
routes.route("/words", wordsCrud);
routes.route("/results", resultsCrud);

export { routes as dictationRoutes };
