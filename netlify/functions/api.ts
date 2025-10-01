import serverless from "serverless-http";

import { createServer } from "../../server";

export const handler = serverless(createServer(), {
  // Include '/api' so Express routes like '/api/anime/*' match after basePath is stripped
  basePath: "/.netlify/functions/api/api",
});
