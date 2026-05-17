import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Set these in Supabase Dashboard > Edge Functions > Secrets:
//   ANTHROPIC_API_KEY — from console.anthropic.com
const ANTHROPIC_KEY        = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function buildPrompt(video: Record<string, unknown>, profile: Record<string, unknown>): string {
  const lines: string[] = [
    "You are an expert basketball scout with 20 years of experience evaluating players for college and pro teams.",
    "",
    "A player has submitted a video highlight. Based on the information below, provide a professional scouting report.",
    "",
    "=== PLAYER INFO ===",
  ]

  if (profile?.full_name)  lines.push(`Name: ${profile.full_name}`)
  if (profile?.position)   lines.push(`Position: ${profile.position}`)
  if (profile?.school)     lines.push(`School: ${profile.school}`)
  if (profile?.year)       lines.push(`Year: ${profile.year}`)
  if (profile?.height)     lines.push(`Height: ${profile.height}`)
  if (profile?.wingspan)   lines.push(`Wingspan: ${profile.wingspan}`)

  if (lines[lines.length - 1] === "=== PLAYER INFO ===") {
    lines.push("Player information not provided")
  }

  lines.push("", "=== SEASON STATS ===")
  const stats: string[] = []
  if (profile?.ppg != null) stats.push(`PPG: ${profile.ppg}`)
  if (profile?.apg != null) stats.push(`APG: ${profile.apg}`)
  if (profile?.rpg != null) stats.push(`RPG: ${profile.rpg}`)
  if (profile?.spg != null) stats.push(`SPG: ${profile.spg}`)
  if (profile?.bpg != null) stats.push(`BPG: ${profile.bpg}`)
  if (profile?.fgp != null) stats.push(`FG%: ${profile.fgp}`)
  if (profile?.tpp != null) stats.push(`3P%: ${profile.tpp}`)
  if (profile?.ftp != null) stats.push(`FT%: ${profile.ftp}`)
  lines.push(stats.length > 0 ? stats.join(", ") : "No season stats provided")

  lines.push("", "=== VIDEO SUBMISSION ===")
  if (video?.title)       lines.push(`Title: ${video.title}`)
  if (video?.category)    lines.push(`Category: ${video.category}`)
  if (video?.description) lines.push(`Description: ${video.description}`)

  if (!video?.title && !video?.category && !video?.description) {
    lines.push("No video metadata provided")
  }

  lines.push(
    "",
    'Respond in this exact JSON format only — no extra text:',
    '{',
    '  "overall_score": <integer 0-100>,',
    '  "categories": {',
    '    "athleticism": <integer 1-10>,',
    '    "shooting": <integer 1-10>,',
    '    "ball_handling": <integer 1-10>,',
    '    "court_vision": <integer 1-10>,',
    '    "defense": <integer 1-10>,',
    '    "physicality": <integer 1-10>',
    '  },',
    '  "scouting_report": "<2-3 sentence professional scouting report written like a real scout>",',
    '  "strengths": ["<strength>", "<strength>"],',
    '  "areas_to_improve": ["<area>"]',
    '}',
    "",
    "Score guide: 0-59 = developing, 60-69 = varsity level, 70-79 = college prospect, 80-89 = high-level prospect, 90-100 = elite/pro prospect.",
  )

  return lines.join("\n")
}

async function callClaude(prompt: string): Promise<Record<string, unknown>> {
  // Guard: Claude API rejects empty text content blocks
  const safePrompt = prompt.trim()
  if (!safePrompt) throw new Error("Prompt must not be empty")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [
        { role: "user", content: safePrompt },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error: ${errText}`)
  }

  const data = await res.json()
  const text = data?.content?.[0]?.text ?? ""
  if (!text.trim()) throw new Error("Empty response from Claude")

  // Extract JSON even if Claude wraps it in markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Claude did not return valid JSON")
  return JSON.parse(jsonMatch[0])
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const { video_id, video_url, user_id } = await req.json()
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY secret not set")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch video metadata and player profile in parallel
    const [{ data: video }, { data: profile }] = await Promise.all([
      supabase.from("videos")
        .select("title, category, description")
        .eq("id", video_id)
        .single(),
      supabase.from("profiles")
        .select("full_name, position, school, year, ppg, apg, rpg, spg, bpg, fgp, tpp, ftp, height, wingspan, draft_score")
        .eq("id", user_id)
        .single(),
    ])

    const prompt = buildPrompt(video ?? {}, profile ?? {})
    const report = await callClaude(prompt)

    // Persist results
    await supabase.from("videos")
      .update({ scout_score: report.overall_score, scout_report: report })
      .eq("id", video_id)

    // Update player's draft_score if this is their personal best
    if (!profile?.draft_score || (report.overall_score as number) > profile.draft_score) {
      await supabase.from("profiles")
        .update({ draft_score: report.overall_score })
        .eq("id", user_id)
    }

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
