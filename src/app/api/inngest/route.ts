import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { matchJdFn } from "@/inngest/functions/match-jd";
import { parseLinkedinFn } from "@/inngest/functions/parse-linkedin";
import { parseResumeFn } from "@/inngest/functions/parse-resume";
import { sweepInactiveFn } from "@/inngest/functions/sweep-inactive";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [parseResumeFn, parseLinkedinFn, matchJdFn, sweepInactiveFn],
});
