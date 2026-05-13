import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOOL_COSTS: Record<string, number> = {
  ad_copy: 5, content_calendar: 8, email_campaign: 5, video_script: 6,
}

const PROMPTS: Record<string, (inputs: Record<string, string>, brand: Record<string, string>) => string> = {
  ad_copy: (i, b) => `You are a world-class copywriter creating ad copy for ${b.brand_name || 'a brand'}.

BRAND CONTEXT:
- Brand: ${b.brand_name}
- Niche: ${b.brand_niche}
- Tone: ${b.brand_tone}
- Target Audience: ${b.brand_audience}
- Brand Description: ${b.brand_description}

TASK:
Write high-converting ad copy for:
- Product/Service: ${i.product_name}
- Offer: ${i.offer}
- Platform: ${i.platform || 'Facebook/Instagram'}
- Goal: ${i.goal || 'Drive Sales'}
- Extra context: ${i.extra || 'None'}

Output 3 variations. For each include:
HEADLINE: (attention-grabbing, platform-appropriate)
BODY: (persuasive copy with emotional hook)
CTA: (clear call to action)

Keep the tone ${b.brand_tone || 'professional'} and speak directly to ${b.brand_audience || 'the target audience'}.`,

  content_calendar: (i, b) => `You are a social media strategist creating a content calendar for ${b.brand_name || 'a brand'}.

BRAND CONTEXT:
- Brand: ${b.brand_name}
- Niche: ${b.brand_niche}
- Tone: ${b.brand_tone}
- Target Audience: ${b.brand_audience}

TASK:
Create a 2-week content calendar (14 posts) for ${i.period || 'next month'} on ${i.platform || 'Instagram'}.
Content theme focus: ${i.theme || 'Mixed'}
Upcoming promotions: ${i.promotions || 'None'}

Format each day as:
Day 1: [Post idea title]
Type: [Reel/Carousel/Story/Static]
Caption hook: [First line of caption]
Hashtag category: [theme]`,

  email_campaign: (i, b) => `You are an expert email marketer writing for ${b.brand_name || 'a brand'}.

BRAND CONTEXT:
- Brand: ${b.brand_name}
- Niche: ${b.brand_niche}
- Tone: ${b.brand_tone}
- Target Audience: ${b.brand_audience}

TASK:
Write a complete email campaign for:
- Goal: ${i.goal}
- Offer: ${i.offer}
- CTA: ${i.cta || 'Shop Now'}
- Extra: ${i.extra || 'None'}

Include:
SUBJECT LINE: (high open rate, under 50 chars)
PREVIEW TEXT: (complements subject, under 90 chars)
BODY:
[Full email body — greeting, hook, value proposition, offer details, CTA, sign-off]

Tone: ${b.brand_tone || 'professional'} and personal.`,

  video_script: (i, b) => `You are a video scriptwriter for ${b.brand_name || 'a brand'}.

BRAND CONTEXT:
- Brand: ${b.brand_name}
- Niche: ${b.brand_niche}
- Tone: ${b.brand_tone}
- Target Audience: ${b.brand_audience}

TASK:
Write a ${i.duration || '30-second'} ${i.format || 'product demo'} video script.
Topic: ${i.topic}
Key message: ${i.key_message || 'Not specified'}

Format:
HOOK: (first 3 seconds — stops the scroll)
BODY: (delivers value/story/demo)
CTA: (clear action for the viewer)

Also include [Visual cues] in brackets where relevant.
Tone: ${b.brand_tone || 'engaging'}.`,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { tool, inputs, profile } = await req.json()
    const cost = TOOL_COSTS[tool] ?? 5

    const { data: profileData } = await supabase
      .from('profiles')
      .select('credits_remaining, plan')
      .eq('id', user.id)
      .single()

    if (!profileData || profileData.credits_remaining < cost) {
      return new Response(JSON.stringify({ error: `Insufficient credits. Need ${cost}, have ${profileData?.credits_remaining ?? 0}.` }), {
        status: 402, headers: corsHeaders,
      })
    }

    const promptFn = PROMPTS[tool]
    if (!promptFn) return new Response(JSON.stringify({ error: 'Unknown tool' }), { status: 400, headers: corsHeaders })

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: promptFn(inputs, profile || {}) }],
    })

    const output = message.content[0].type === 'text' ? message.content[0].text : ''

    await supabase.rpc('deduct_credits', { p_user_id: user.id, p_amount: cost })
    await supabase.from('credit_transactions').insert({
      user_id: user.id, amount: -cost, type: 'usage', tool, description: `${tool} generation`,
    })
    await supabase.from('generations').insert({
      user_id: user.id, tool, inputs, outputs: { raw: output }, credits_used: cost,
    })

    return new Response(JSON.stringify({ output }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
