import { fileURLToPath } from "node:url";
import { createDropFunction } from "./neon-function";
import { serveStaticFile } from "./platform/node-runtime";

const publicDir = fileURLToPath(new URL("./public", import.meta.url));

export default { fetch: createDropFunction((request) => serveStaticFile(publicDir, request)) };
