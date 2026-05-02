import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Missing Supabase env vars — check your .env file')
}

export const supabase = createClient(url, key)

// ── AUTH ─────────────────────────────────────────────────────
export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── VIDEOS ───────────────────────────────────────────────────
export const getFeedVideos = () =>
  supabase
    .from('videos')
    .select('*, profiles(id, username, full_name, position, school, year, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(30)

export const getUserVideos = (userId) =>
  supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

export const uploadVideo = async (userId, file, meta) => {
  // 1. Upload file to storage
  const ext      = file.name.split('.').pop()
  const path     = `${userId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) throw uploadError

  // 2. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(path)

  // 3. Save to videos table
  const { data, error } = await supabase
    .from('videos')
    .insert({ user_id: userId, video_url: publicUrl, ...meta })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── LIKES ─────────────────────────────────────────────────────
export const getLike = (userId, videoId) =>
  supabase.from('likes').select('id').eq('user_id', userId).eq('video_id', videoId).maybeSingle()

export const addLike = (userId, videoId) =>
  supabase.from('likes').insert({ user_id: userId, video_id: videoId })

export const removeLike = (userId, videoId) =>
  supabase.from('likes').delete().eq('user_id', userId).eq('video_id', videoId)

// ── COMMENTS ─────────────────────────────────────────────────
export const getComments = (videoId) =>
  supabase
    .from('comments')
    .select('*, profiles(id, username, full_name, avatar_url)')
    .eq('video_id', videoId)
    .order('created_at', { ascending: true })

export const addComment = (userId, videoId, text) =>
  supabase.from('comments').insert({ user_id: userId, video_id: videoId, text })

// ── PROFILE ──────────────────────────────────────────────────
export const getProfile = (userId) =>
  supabase.from('profiles').select('*').eq('id', userId).single()

export const updateProfile = (userId, data) =>
  supabase.from('profiles').update(data).eq('id', userId)

export const searchProfiles = (query) =>
  supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,school.ilike.%${query}%`)
    .limit(20)

// ── FOLLOWS ──────────────────────────────────────────────────
export const getFollow = (followerId, followingId) =>
  supabase.from('follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle()

export const follow = (followerId, followingId) =>
  supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })

export const unfollow = (followerId, followingId) =>
  supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)

// ── REAL-TIME subscription ───────────────────────────────────
export const subscribeToFeed = (callback) =>
  supabase
    .channel('feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, callback)
    .subscribe()
