import { handleRequest, runScheduled, type Env } from "./app";

export default {
  fetch: (request, env, context) => handleRequest(request, env, context),
  scheduled: (_controller, env) => runScheduled(env),
} satisfies ExportedHandler<Env>;
