// AI Studio: Claude drafts topic ideas and scripts from a client's Brand Brain. Everything it
// makes lands as a draft for the team to edit. Nothing goes to a client until someone sends it.
import { fields, loadBrand, type Answers } from "../brand";
import { one, query } from "../db";
import { addEvent, formatLabel, formats, getItem, platforms, type Item } from "../pipeline";
import { getPlan } from "../plans";
import { generateJson, type AiResult } from "./claude";

type Client = { id: number; slug: string; name: string; plan: string; languages: string };

const SYSTEM = `You are the content strategist and scriptwriter at Nirakar Media, an Indian agency that makes faceless short and long-form videos for businesses and creators.

Write for real Indian audiences. Sound like the client, never like an ad agency or a chatbot. Lead with a hook a viewer cares about in the first two seconds. Be specific and concrete; avoid filler, cliches, and generic advice anyone could give.

Follow the client's compliance rules exactly. Never invent facts, prices, statistics, testimonials, or claims that are not in the brand profile; when a fact is needed and missing, write a clearly marked placeholder in square brackets for the team to fill, like [price]. Never claim medical, financial, or legal results.

Write in the language asked for. For Hinglish, use natural Roman-script Hinglish as people actually speak it.`;

function brandText(client: Client, data: Answers) {
  const lines = [`Client: ${client.name}`, `Plan: ${getPlan(client.plan)?.name ?? client.plan}`];
  for (const [key, f] of Object.entries(fields)) {
    if (["logo_url", "brand_guide_url", "assets_folder_url", "website"].includes(key)) continue;
    const v = data[key];
    const text = Array.isArray(v) ? v.join(", ") : (v ?? "").trim();
    if (text) lines.push(`${f.label}\n${text}`);
  }
  return lines.join("\n\n");
}

async function clientById(id: number) {
  return one<Client>("SELECT id, slug, name, plan, languages FROM clients WHERE id = $1", [id]);
}

// ---- Topic ideas ----

type Idea = { title: string; hook: string; angle: string; pillar: string; format: string; platform: string };

const ideaSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "hook", "angle", "pillar", "format", "platform"],
        properties: {
          title: { type: "string", description: "Working title, under 70 characters" },
          hook: { type: "string", description: "The first line the viewer hears" },
          angle: { type: "string", description: "Two or three sentences: what the video covers and why this audience will care" },
          pillar: { type: "string", description: "Which content pillar this belongs to" },
          format: { type: "string", enum: formats.map((f) => f.id) },
          platform: { type: "string", enum: platforms },
        },
      },
    },
  },
};

export async function suggestIdeas(clientId: number, count: number, focus: string): Promise<AiResult<number[]>> {
  const client = await clientById(clientId);
  if (!client) return { ok: false, error: "Client not found." };
  const brand = await loadBrand(client.id, client.languages);
  const recent = await query<{ title: string }>("SELECT title FROM content_items WHERE client_id = $1 ORDER BY id DESC LIMIT 60", [client.id]);
  const n = Math.min(Math.max(count, 1), 12);

  const prompt = `${brandText(client, brand.data)}

Already planned or made (don't repeat these):
${recent.map((r) => `- ${r.title}`).join("\n") || "- nothing yet"}

${focus ? `Focus for this batch: ${focus}\n\n` : ""}Suggest ${n} new video ideas for this client. Spread them across their content pillars (suggest sensible pillars if none are given) and their goals. Mostly short videos unless the plan or focus says otherwise. Use only these platforms: ${platforms.join(", ")}.`;

  const res = await generateJson<{ ideas: Idea[] }>({ kind: "ideas", clientId: client.id, system: SYSTEM, prompt, schema: ideaSchema, effort: "medium" });
  if (!res.ok) return res;

  const ids: number[] = [];
  const language = client.languages.split(",")[0].trim() || "English";
  for (const idea of res.data.ideas.slice(0, n)) {
    const title = idea.title.trim().slice(0, 200);
    if (!title) continue;
    const brief = [`Hook: ${idea.hook.trim()}`, idea.angle.trim(), idea.pillar.trim() && `Pillar: ${idea.pillar.trim()}`].filter(Boolean).join("\n\n");
    const row = await one<{ id: number }>(
      `INSERT INTO content_items (client_id, title, format, platform, language, brief) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        client.id, title,
        formats.some((f) => f.id === idea.format) ? idea.format : "short",
        platforms.includes(idea.platform) ? idea.platform : "",
        language, brief.slice(0, 3000),
      ],
    );
    await addEvent(row!.id, "Nirakar Media", "created", "Idea suggested by AI.", true);
    ids.push(row!.id);
  }
  return { ok: true, data: ids };
}

// ---- Script drafts ----

export type Scene = { seconds: number; voiceover: string; visual: string; on_screen_text: string };
type Draft = { script: string; scenes: Scene[]; caption: string; hashtags: string[] };

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["script", "scenes", "caption", "hashtags"],
  properties: {
    script: { type: "string", description: "The full voiceover script, exactly as it will be read aloud, one paragraph per scene" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seconds", "voiceover", "visual", "on_screen_text"],
        properties: {
          seconds: { type: "integer", description: "Rough length of this scene in seconds" },
          voiceover: { type: "string", description: "The lines spoken in this scene" },
          visual: { type: "string", description: "What is on screen: a stock-footage search phrase or a shot description" },
          on_screen_text: { type: "string", description: "Short caption text shown on screen, or empty" },
        },
      },
    },
    caption: { type: "string", description: "Post caption for the platform, ending with the call to action" },
    hashtags: { type: "array", items: { type: "string" } },
  },
};

const lengthGuide = (format: string) =>
  format === "long" ? "a 6 to 10 minute long-form video (roughly 900 to 1,400 spoken words)" : "a 30 to 50 second vertical short (roughly 80 to 120 spoken words)";

export async function draftScript(itemId: number): Promise<AiResult<Draft>> {
  const item = await getItem(itemId);
  if (!item) return { ok: false, error: "Content item not found." };
  const client = await clientById(item.client_id);
  if (!client) return { ok: false, error: "Client not found." };
  const brand = await loadBrand(client.id, client.languages);

  const revising = Boolean(item.changes_requested.trim() && item.script.trim());
  const prompt = `${brandText(client, brand.data)}

Video: ${item.title}
Format: ${formatLabel(item.format)}, ${lengthGuide(item.format)}
Platform: ${item.platform || "YouTube and Instagram"}
Language: ${item.language || "English"}

Brief:
${item.brief.trim() || "No brief. Work from the title and the brand profile."}
${revising ? `\nCurrent script:\n${item.script}\n\nThe client asked for these changes. Revise the script to address them and keep what they didn't mention:\n${item.changes_requested}\n` : ""}
Write the voiceover script and break it into scenes for a faceless video. Open with the hook, deliver one clear idea, and end with the client's call to action. Scene seconds should add up to the target length. Hashtags: 3 to 8, relevant and not generic.`;

  return generateJson<Draft>({
    kind: revising ? "script-revision" : "script",
    clientId: client.id,
    itemId: item.id,
    system: SYSTEM,
    prompt,
    schema: draftSchema,
    effort: "medium",
  });
}

// Saves a draft onto the item. The old script, if any, is kept in the internal history.
export async function saveDraft(item: Item, draft: Draft, actor: string) {
  if (item.script.trim()) await addEvent(item.id, actor, "note", `Script before the AI redraft:\n\n${item.script}`, true);
  const scenes = draft.scenes.map((s) => ({
    seconds: Math.max(1, Math.round(Number(s.seconds) || 1)),
    voiceover: String(s.voiceover ?? ""), visual: String(s.visual ?? ""), on_screen_text: String(s.on_screen_text ?? ""),
  }));
  const tags = draft.hashtags.map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`));
  const caption = [draft.caption.trim(), tags.join(" ")].filter(Boolean).join("\n\n");
  await query(
    `UPDATE content_items SET script = $2, scenes = $3::jsonb, caption = $4, ai_drafted_at = now(),
       stage = CASE WHEN stage = 'idea' THEN 'script' ELSE stage END, updated_at = now() WHERE id = $1`,
    [item.id, draft.script.slice(0, 20000), JSON.stringify(scenes), caption.slice(0, 5000)],
  );
  await addEvent(item.id, actor, "note", "Script drafted with AI.", true);
}

export async function loadScenes(itemId: number): Promise<Scene[]> {
  const row = await one<{ scenes: Scene[] | string | null }>("SELECT scenes FROM content_items WHERE id = $1", [itemId]);
  const raw = row?.scenes;
  return typeof raw === "string" ? (JSON.parse(raw) as Scene[]) : (raw ?? []);
}

export async function aiUsage() {
  const month = await one<{ runs: string; cost: string }>(
    `SELECT count(*) FILTER (WHERE status = 'ok')::text AS runs, COALESCE(sum(cost_usd), 0)::text AS cost FROM ai_runs
     WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'`,
  );
  const log = await query<{ id: number; kind: string; model: string; status: string; input_tokens: number; output_tokens: number; cost_usd: string; error: string; created_at: string; client_name: string | null; item_id: number | null }>(
    `SELECT r.id, r.kind, r.model, r.status, r.input_tokens, r.output_tokens, r.cost_usd::text, r.error, r.created_at::text, c.name AS client_name, r.item_id
     FROM ai_runs r LEFT JOIN clients c ON c.id = r.client_id ORDER BY r.id DESC LIMIT 50`,
  );
  return { runs: Number(month?.runs ?? 0), costUsd: Number(month?.cost ?? 0), log };
}
