import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { parseLinkedinFn } from "@/inngest/functions/parse-linkedin";
import { parseResumeFn } from "@/inngest/functions/parse-resume";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [parseResumeFn, parseLinkedinFn],
});
