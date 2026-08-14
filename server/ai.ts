import { invokeLLM } from "./_core/llm";

const slugify = (value: string, maxLength: number) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength) || "new-campaign";

const fallbackSuggestion = (campaign: string) => ({
  suggestion: slugify(campaign, 50),
  note: "Fallback suggestion. Review before publishing.",
});

const fallbackUtm = (campaign: string) => ({
  utmSource: "konnekt",
  utmMedium: "campaign",
  utmCampaign: slugify(campaign, 60),
  note: "Fallback UTM values. Review before publishing.",
});

function readText(content: string | Array<{ type?: string; text?: string }>) {
  if (typeof content === "string") return content;
  return content
    .filter(part => part.type === "text" && part.text)
    .map(part => part.text)
    .join("\n");
}

export async function suggestCampaignSlug(campaign: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You create short, memorable, lowercase URL slugs for marketing campaigns. Return only valid JSON.",
        },
        {
          role: "user",
          content: `Create one slug for this campaign: ${campaign}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "campaign_slug",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestion: { type: "string" },
              note: { type: "string" },
            },
            required: ["suggestion", "note"],
            additionalProperties: false,
          },
        },
      },
      maxTokens: 180,
    });
    const parsed = JSON.parse(readText(response.choices[0].message.content));
    const suggestion = slugify(String(parsed.suggestion || campaign), 50);
    return {
      suggestion,
      note: String(
        parsed.note || "Assistive suggestion only. Review before publishing."
      ),
    };
  } catch {
    return fallbackSuggestion(campaign);
  }
}

export async function generateCampaignUtm(campaign: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You create concise UTM values for campaign tracking. Return only valid JSON and use lowercase letters, numbers, and hyphens.",
        },
        {
          role: "user",
          content: `Create UTM source, medium, and campaign values for: ${campaign}`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "campaign_utm",
          strict: true,
          schema: {
            type: "object",
            properties: {
              utmSource: { type: "string" },
              utmMedium: { type: "string" },
              utmCampaign: { type: "string" },
              note: { type: "string" },
            },
            required: ["utmSource", "utmMedium", "utmCampaign", "note"],
            additionalProperties: false,
          },
        },
      },
      maxTokens: 220,
    });
    const parsed = JSON.parse(readText(response.choices[0].message.content));
    return {
      utmSource: slugify(String(parsed.utmSource || "konnekt"), 40),
      utmMedium: slugify(String(parsed.utmMedium || "campaign"), 40),
      utmCampaign: slugify(String(parsed.utmCampaign || campaign), 60),
      note: String(
        parsed.note || "Assistive UTM values. Review before publishing."
      ),
    };
  } catch {
    return fallbackUtm(campaign);
  }
}

export async function summarizeAnalytics(input: {
  clicks: number;
  scans: number;
  links: number;
  events: number;
}) {
  const fallback = `Konnekt recorded ${input.clicks} clicks and ${input.scans} QR scans across ${input.links} smart links and ${input.events} events.`;
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Summarize workspace analytics in one concise, factual sentence. Do not invent metrics or recommendations. Return only valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "analytics_summary",
          strict: true,
          schema: {
            type: "object",
            properties: { summary: { type: "string" } },
            required: ["summary"],
            additionalProperties: false,
          },
        },
      },
      maxTokens: 180,
    });
    const parsed = JSON.parse(readText(response.choices[0].message.content));
    const summary = String(parsed.summary || "").trim();
    return { summary: summary || fallback, generated: Boolean(summary) };
  } catch {
    return { summary: fallback, generated: false };
  }
}
