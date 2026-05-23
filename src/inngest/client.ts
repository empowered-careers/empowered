import { eventType, Inngest } from "inngest";
import { z } from "zod/v3";

// Event schemas. Defined with zod/v3 to satisfy Inngest's StandardSchemaV1
// expectation (Inngest pins its own zod sub-export).
export const ResumeUploadedEvent = eventType("resume/uploaded", {
  schema: z.object({
    resumeId: z.string().uuid(),
    profileId: z.string().uuid(),
  }),
});

export const CandidateResumeParsedEvent = eventType("candidate/resume_parsed", {
  schema: z.object({
    resumeId: z.string().uuid(),
    profileId: z.string().uuid(),
    resumeScore: z.number().int().min(0).max(100),
  }),
});

export const LinkedinUploadedEvent = eventType("linkedin/uploaded", {
  schema: z.object({
    linkedinProfileId: z.string().uuid(),
    profileId: z.string().uuid(),
    storageObjectPath: z.string().min(1),
  }),
});

export const CandidateLinkedinParsedEvent = eventType(
  "candidate/linkedin_parsed",
  {
    schema: z.object({
      linkedinProfileId: z.string().uuid(),
      profileId: z.string().uuid(),
      profileScore: z.number().int().min(0).max(100),
    }),
  }
);

export const inngest = new Inngest({
  id: "empowered-careers",
});
