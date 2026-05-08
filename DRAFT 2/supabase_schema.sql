-- =============================================
-- DRAFT APP — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- PROFILES (one per user, auto-created on signup)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  position text check (position in ('PG','SG','SF','PF','C','Scout','Coach')),
  school text,
  year text,
  height text,
  wingspan text,
  bio text,
  avatar_url text,
  role text default 'player' check (role in ('player','scout','coach')),
  draft_score int default null,
  followers_count int default 0,
  following_count int default 0,
  created_at timestamptz default now()
);

-- VIDEOS
create table videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  category text check (category in ('GAME','HIGHLIGHT','TRAINING','DEFENSE','TOURNAMENT','CAMP')),
  video_url text not null,
  thumbnail_url text,
  likes_count int default 0,
  comments_count int default 0,
  views_count int default 0,
  created_at timestamptz default now()
);

-- LIKES
create table likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, video_id)
);

-- COMMENTS
create table comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  text text not null,
  likes_count int default 0,
  created_at timestamptz default now()
);

-- FOLLOWS
create table follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references profiles(id) on delete cascade not null,
  following_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

-- MESSAGES
create table messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  actor_id uuid references profiles(id) on delete cascade,
  type text not null,
  text text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────

alter table profiles      enable row level security;
alter table videos        enable row level security;
alter table likes         enable row level security;
alter table comments      enable row level security;
alter table follows       enable row level security;
alter table messages      enable row level security;
alter table notifications enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_public_read"  on profiles for select using (true);
create policy "profiles_owner_update" on profiles for update using (auth.uid() = id);
create policy "profiles_owner_insert" on profiles for insert with check (auth.uid() = id);

-- Videos: anyone can read, only owner can insert/delete
create policy "videos_public_read"   on videos for select using (true);
create policy "videos_owner_insert"  on videos for insert with check (auth.uid() = user_id);
create policy "videos_owner_delete"  on videos for delete using (auth.uid() = user_id);

-- Likes: anyone can read, authenticated users can insert/delete their own
create policy "likes_public_read"    on likes for select using (true);
create policy "likes_auth_insert"    on likes for insert with check (auth.uid() = user_id);
create policy "likes_auth_delete"    on likes for delete using (auth.uid() = user_id);

-- Comments: anyone can read, authenticated users can insert
create policy "comments_public_read" on comments for select using (true);
create policy "comments_auth_insert" on comments for insert with check (auth.uid() = user_id);

-- Follows: anyone can read, authenticated users can manage their own
create policy "follows_public_read"  on follows for select using (true);
create policy "follows_auth_insert"  on follows for insert with check (auth.uid() = follower_id);
create policy "follows_auth_delete"  on follows for delete using (auth.uid() = follower_id);

-- Messages: only sender and receiver can read, only sender can insert
create policy "messages_read"   on messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "messages_insert" on messages for insert with check (auth.uid() = sender_id);
create policy "messages_update" on messages for update using (auth.uid() = receiver_id);

-- Notifications: only the recipient can read/update
create policy "notifs_read"   on notifications for select using (auth.uid() = user_id);
create policy "notifs_insert" on notifications for insert with check (true);
create policy "notifs_update" on notifications for update using (auth.uid() = user_id);

-- ── TRIGGERS ────────────────────────────────────────────────

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username, full_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Keep likes_count in sync
create or replace function sync_likes_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update videos set likes_count = likes_count + 1 where id = NEW.video_id;
  elsif TG_OP = 'DELETE' then
    update videos set likes_count = likes_count - 1 where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_change
  after insert or delete on likes
  for each row execute procedure sync_likes_count();

-- Keep comments_count in sync
create or replace function sync_comments_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update videos set comments_count = comments_count + 1 where id = NEW.video_id;
  elsif TG_OP = 'DELETE' then
    update videos set comments_count = comments_count - 1 where id = OLD.video_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_comment_change
  after insert or delete on comments
  for each row execute procedure sync_comments_count();

-- Keep followers_count / following_count in sync
create or replace function sync_follow_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = NEW.following_id;
    update profiles set following_count = following_count + 1 where id = NEW.follower_id;
  elsif TG_OP = 'DELETE' then
    update profiles set followers_count = greatest(followers_count - 1, 0) where id = OLD.following_id;
    update profiles set following_count = greatest(following_count - 1, 0) where id = OLD.follower_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_follow_change
  after insert or delete on follows
  for each row execute procedure sync_follow_counts();

-- ── STORAGE BUCKET ──────────────────────────────────────────
-- Run this separately in Supabase dashboard > Storage > New bucket
-- Name: videos
-- Public: true
-- Max file size: 500MB
-- Allowed MIME types: video/mp4, video/quicktime, video/webm
