// Claude vision check for one kitchen photo. Claude returns structured fields only;
// the diner-facing note is always built from fixed templates in buildFinding().
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const CHECK_MODEL = "claude-sonnet-5-5";
export const MIN_CONFIDENCE = 0.6;
const MAX_NOTE_ISSUES = 3;

// Fixed issue vocabulary, so the note can't carry inflated or invented wording.
const ISSUE_LABELS = {
  pest: "Pest",
  droppings: "Pest droppings",
  grease_buildup: "Grease buildup",
  grime: "Grime",
  spill: "Spill",
  uncovered_food: "Uncovered food",
  missing_lid: "Missing lid",
  spoilage: "Visible spoilage",
  mould: "Mould",
  dirty_dishes: "Dirty dishes",
  standing_water: "Standing water",
  raw_cooked_together: "Raw and cooked food together",
  other: "Possible hygiene issue",
} as const;
type IssueType = keyof typeof ISSUE_LABELS;
const ISSUE_TYPES = Object.keys(ISSUE_LABELS) as [IssueType, ...IssueType[]];

const Issue = z.object({
  type: z.enum(ISSUE_TYPES),
  where: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

// Shape sent to the API as the output format.
const ModelOutput = z.object({
  spot_match: z.boolean(),
  issues: z.array(Issue),
  confidence: z.number(),
  blurry: z.boolean(),
});

// Stricter validation applied to whatever comes back.
const CheckResult = ModelOutput.extend({
  confidence: z.number().min(0).max(1),
  issues: z.array(
    Issue.extend({
      where: z.string().trim().min(1).max(80),
    }),
  ),
});
export type CheckResult = z.infer<typeof CheckResult>;

export type Finding = {
  spot_match: boolean | null;
  // ok/issues/unclear are Claude's verdicts; "error" means the check itself didn't run.
  status: "ok" | "issues" | "unclear" | "error";
  issues: CheckResult["issues"];
  confidence: number;
  note: string;
  model: string;
};

export const NOTES = {
  ok: "No visible issues",
  unclear: "Unclear photo — too dark, blurry or hard to judge",
  error: "Not checked yet — the automatic check couldn't run",
  mismatch: (spotLabel: string) => `Photo doesn't match the ${spotLabel.toLowerCase()} spot`,
};

const SYSTEM = `You inspect photos of restaurant kitchens for visible hygiene problems. Diners will see a summary of your findings, and a wrong flag hurts a real business, so report only what is clearly visible in the photo. Do not guess about things you cannot see.

Return JSON only, matching the schema:
- spot_match: true if the photo clearly shows the named kitchen spot.
- issues: each visible problem, with type (exactly one of: ${ISSUE_TYPES.join(", ")}; use "other" only if none fit), where (a short location in the photo, under 8 words, e.g. "top shelf, left"), and severity (low | medium | high).
- confidence: 0 to 1, how sure you are of the whole assessment, including that nothing was missed.
- blurry: true if blur, darkness, glare or framing stops you checking the checklist properly.

An empty issues list means you looked and saw no problems, so only return it when the photo is clear enough to support that.`;

const ANSWER_FORMAT = betaZodOutputFormat(ModelOutput);

let client: Anthropic | undefined;

export async function runPhotoCheck(input: {
  jpeg: Buffer;
  spotLabel: string;
  checklist: string;
}): Promise<{ finding: Finding; raw: string | null }> {
  // Worst case 2 × 25 s stays inside the upload route's 60 s maxDuration, so a slow
  // API still ends in a saved "error" finding instead of a killed function.
  client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: CHECK_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: ANSWER_FORMAT },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: input.jpeg.toString("base64") } },
            { type: "text", text: `Kitchen spot: ${input.spotLabel}\nChecklist for this spot: ${input.checklist}` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      console.error("photo check refused", response.stop_details);
      return { finding: errorFinding(), raw: null };
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return { finding: buildFinding(text, input.spotLabel), raw: text };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`photo check API error ${err.status}:`, err.message);
    } else {
      console.error("photo check failed:", err);
    }
    return { finding: errorFinding(), raw: null };
  }
}

// Turns Claude's raw text into a finding. A reply that doesn't validate means the check
// failed ("error"); "unclear" is reserved for Claude judging the photo itself.
export function buildFinding(raw: string, spotLabel: string): Finding {
  let parsed: CheckResult;
  try {
    parsed = CheckResult.parse(JSON.parse(raw));
  } catch {
    console.error("photo check reply didn't validate:", raw.slice(0, 500));
    return errorFinding();
  }

  const base = { spot_match: parsed.spot_match, issues: parsed.issues, confidence: parsed.confidence, model: CHECK_MODEL };
  if (parsed.blurry || parsed.confidence < MIN_CONFIDENCE) {
    return { ...base, status: "unclear", note: NOTES.unclear };
  }
  if (!parsed.spot_match) {
    return { ...base, status: "unclear", note: NOTES.mismatch(spotLabel) };
  }
  if (parsed.issues.length === 0) {
    return { ...base, status: "ok", note: NOTES.ok };
  }

  const rank = { high: 0, medium: 1, low: 2 };
  const top = [...parsed.issues].sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, MAX_NOTE_ISSUES);
  const note = top.map((i) => `${ISSUE_LABELS[i.type]}, ${cleanWhere(i.where)}`).join("; ");
  return { ...base, status: "issues", note };
}

function errorFinding(): Finding {
  return { spot_match: null, status: "error", issues: [], confidence: 0, note: NOTES.error, model: CHECK_MODEL };
}

// Location phrase from Claude: plain words only, lower case, no punctuation tricks.
function cleanWhere(where: string) {
  return where
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N} ,'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
