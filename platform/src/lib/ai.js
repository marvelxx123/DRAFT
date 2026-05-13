import { supabase } from './supabase.js'

export async function generate({ tool, inputs, profile }) {
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { tool, inputs, profile },
  })
  if (error) throw new Error(error.message || 'Generation failed')
  if (data?.error) throw new Error(data.error)
  return data
}
