import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { parseResumeFn } from "@/inngest/functions/parse-resume";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [parseResumeFn],
});
