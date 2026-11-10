import { fileURLToPath } from "node:url";
import { createDrop, optionsFromEnv } from "./neon-function";
import { serveStaticFile } from "./platform/node-runtime";

const publicDir = fileURLToPath(new URL("./public", import.meta.url));

export default createDrop(optionsFromEnv(), (request) => serveStaticFile(publicDir, request));
