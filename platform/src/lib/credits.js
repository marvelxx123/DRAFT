import { supabase } from './supabase.js'

export const TOOL_COSTS = {
  ad_copy: 5,
  content_calendar: 8,
  email_campaign: 5,
  video_script: 6,
}

export const PLAN_CREDITS = {
  free: 30,
  starter: 200,
  growth: 600,
  pro: 2000,
}

export async function checkCredits(userId, tool) {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits_remaining, plan')
    .eq('id', userId)
    .single()
  if (error) throw error
  const cost = TOOL_COSTS[tool] ?? 5
  return {
    sufficient: data.credits_remaining >= cost,
    remaining: data.credits_remaining,
    cost,
    plan: data.plan,
  }
}

export async function deductCredits(userId, tool, generationId) {
  const cost = TOOL_COSTS[tool] ?? 5
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({ user_id: userId, amount: -cost, type: 'usage', tool, description: `${tool} generation` })
  if (txError) throw txError

  const { data, error } = await supabase.rpc('deduct_credits', { p_user_id: userId, p_amount: cost })
  if (error) throw error
  return data
}
