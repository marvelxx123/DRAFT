import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// ── AUTH ────────────────────────────────────────────────
export const signUp = (email, password, fullName) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()

// ── PROFILES ───────────────────────────────────────────
export const getProfile = (id) =>
  supabase.from('profiles').select('*').eq('id', id).single()
export const updateProfile = (id, data) =>
  supabase.from('profiles').update(data).eq('id', id)
export const searchProfiles = (q) =>
  supabase.from('profiles').select('*')
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%,school.ilike.%${q}%`)
    .limit(30)

// ── VIDEOS ───────────────────────────────────────────────
export const getFeedVideos = () =>
  supabase.from('videos')
    .select('*, profiles(id,username,full_name,position,school,year,avatar_url,draft_score)')
    .order('created_at', { ascending: false })
    .limit(30)

export const getUserVideos = (userId) =>
  supabase.from('videos').select('*').eq('user_id', userId).order('created_at', { ascending: false })

export const uploadVideo = async (userId, file, meta) => {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('videos').upload(path, file, { cacheControl:'3600', upsert:false })
  if (error) throw error
  const { data:{ publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)
  const { data, error:dbErr } = await supabase.from('videos').insert({ user_id:userId, video_url:publicUrl, ...meta }).select().single()
  if (dbErr) throw dbErr
  return data
}

// ── AI SCOUTING ─────────────────────────────────────────
export const analyzeVideo = (videoId, videoUrl, userId) =>
  supabase.functions.invoke('analyze-video', {
    body: { video_id: videoId, video_url: videoUrl, user_id: userId }
  })

// ── LIKES ─────────────────────────────────────────────────
export const getLike = (userId, videoId) =>
  supabase.from('likes').select('id').eq('user_id', userId).eq('video_id', videoId).maybeSingle()
export const addLike = (userId, videoId) =>
  supabase.from('likes').insert({ user_id:userId, video_id:videoId })
export const removeLike = (userId, videoId) =>
  supabase.from('likes').delete().eq('user_id', userId).eq('video_id', videoId)

// ── COMMENTS ─────────────────────────────────────────────
export const getComments = (videoId) =>
  supabase.from('comments').select('*, profiles(id,username,full_name,avatar_url,role)')
    .eq('video_id', videoId).order('created_at', { ascending:true })
export const addComment = (userId, videoId, text) =>
  supabase.from('comments').insert({ user_id:userId, video_id:videoId, text })

// ── FOLLOWS ──────────────────────────────────────────────
export const getFollow = (followerId, followingId) =>
  supabase.from('follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle()
export const follow = (followerId, followingId) =>
  supabase.from('follows').insert({ follower_id:followerId, following_id:followingId })
export const unfollow = (followerId, followingId) =>
  supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)

// ── MESSAGES ─────────────────────────────────────────────
export const getConversations = (userId) =>
  supabase.from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id,full_name,avatar_url,role,position), receiver:profiles!messages_receiver_id_fkey(id,full_name,avatar_url,role,position)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending:false })

export const getMessages = (userId, otherId) =>
  supabase.from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id,full_name,avatar_url)')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending:true })

export const sendMessage = (senderId, receiverId, text) =>
  supabase.from('messages').insert({ sender_id:senderId, receiver_id:receiverId, text, read:false }).select().single()

export const markRead = (userId, otherId) =>
  supabase.from('messages').update({ read:true }).eq('receiver_id', userId).eq('sender_id', otherId)

// ── NOTIFICATIONS ───────────────────────────────────────────
export const getNotifications = (userId) =>
  supabase.from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(id,full_name,avatar_url,role)')
    .eq('user_id', userId)
    .order('created_at', { ascending:false })
    .limit(30)

export const markNotifsRead = (userId) =>
  supabase.from('notifications').update({ read:true }).eq('user_id', userId)

export const createNotification = (userId, actorId, type, text, link) =>
  supabase.from('notifications').insert({ user_id:userId, actor_id:actorId, type, text, link, read:false })
