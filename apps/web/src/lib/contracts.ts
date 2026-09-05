import { z } from "zod";

export const verdictValues = [
  "missing_evidence",
  "pickup_required",
  "safe_to_wrap",
] as const;

export const verdictSchema = z.enum(verdictValues);

export type Verdict = z.infer<typeof verdictSchema>;
