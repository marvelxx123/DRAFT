import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Set these in Supabase Dashboard > Edge Functions > Secrets:
//   GEMINI_API_KEY  — from aistudio.google.com
const GEMINI_KEY         = Deno.env.get("GEMINI_API_KEY") ?? ""
const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function uploadToGemini(bytes: ArrayBuffer, mime: string, videoId: string) {
  const boundary = `boundary_${Date.now()}`
  const meta = JSON.stringify({ file: { display_name: `draft_${videoId}` } })
  const enc  = new TextEncoder()
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`
  )
  const tail = enc.encode(`\r\n--${boundary}--`)
  const body = new Uint8Array(head.byteLength + bytes.byteLength + tail.byteLength)
  body.set(head, 0)
  body.set(new Uint8Array(bytes), head.byteLength)
  body.set(tail, head.byteLength + bytes.byteLength)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_KEY}`,
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }
  )
  if (!res.ok) throw new Error(`Gemini upload failed: ${await res.text()}`)
  return (await res.json()).file
}

async function waitForActive(fileName: string) {
  const fileId = fileName.split("/").pop()
  for (let i = 0; i < 30; i++) {
    const res  = await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${GEMINI_KEY}`)
    const file = await res.json()
    if (file.state === "ACTIVE") return file
    if (file.state === "FAILED") throw new Error("Gemini file processing failed")
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error("Gemini file processing timeout")
}

async function scout(fileUri: string, mime: string) {
  const prompt = `You are an expert basketball scout with 20 years of experience evaluating players for college and pro teams.

Watch this video and provide a scouting report. Respond in this exact JSON format only — no extra text:
{
  "overall_score": <integer 0-100>,
  "categories": {
    "athleticism": <integer 1-10>,
    "shooting": <integer 1-10>,
    "ball_handling": <integer 1-10>,
    "court_vision": <integer 1-10>,
    "defense": <integer 1-10>,
    "physicality": <integer 1-10>
  },
  "scouting_report": "<2-3 sentence professional scouting report written like a real scout>",
  "strengths": ["<strength>", "<strength>"],
  "areas_to_improve": ["<area>"]
}

Score guide: 0-59 = developing, 60-69 = varsity level, 70-79 = college prospect, 80-89 = high-level prospect, 90-100 = elite/pro prospect.
If basketball gameplay is not clearly visible, set overall_score to 0 and explain in the report.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ fileData: { mimeType: mime, fileUri } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      })
    }
  )
  if (!res.ok) throw new Error(`Gemini analysis failed: ${await res.text()}`)
  const data = await res.json()
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const { video_id, video_url, user_id } = await req.json()
    if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY secret not set")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch video (50 MB cap to stay within edge function limits)
    const videoRes = await fetch(video_url)
    if (!videoRes.ok) throw new Error("Failed to fetch video")
    const size = parseInt(videoRes.headers.get("content-length") ?? "0")
    if (size > 50 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Video over 50 MB — skipping AI analysis" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      })
    }
    const mime  = videoRes.headers.get("content-type") ?? "video/mp4"
    const bytes = await videoRes.arrayBuffer()

    // Upload to Gemini Files API, wait for it to be ready, then analyze
    const uploaded   = await uploadToGemini(bytes, mime, video_id)
    const activeFile = await waitForActive(uploaded.name)
    const report     = await scout(activeFile.uri, mime)

    // Persist results
    await supabase.from("videos").update({ scout_score: report.overall_score, scout_report: report }).eq("id", video_id)

    // Update player's draft_score if this is their personal best
    const { data: profile } = await supabase.from("profiles").select("draft_score").eq("id", user_id).single()
    if (!profile?.draft_score || report.overall_score > profile.draft_score) {
      await supabase.from("profiles").update({ draft_score: report.overall_score }).eq("id", user_id)
    }

    // Clean up Gemini file
    const fileId = uploaded.name.split("/").pop()
    await fetch(`https://generativelanguage.googleapis.com/v1beta/files/${fileId}?key=${GEMINI_KEY}`, { method: "DELETE" }).catch(() => {})

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...cors, "Content-Type": "application/json" }
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})
