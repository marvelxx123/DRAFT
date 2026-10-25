# 904 Garage Doors — Autonomous Marketing Schedule

**To re-arm all schedules:** Say "re-arm the schedules" in any new session.
**Repo:** /home/user/DRAFT/ | **Branch:** main | **Auto-deploys:** yes, every push
**Business:** 904 Garage Doors | (904) 447-2397 | 904garagedoors.com | Owner: Tal
**Business email:** 904garagee@gmail.com (GMB account + main business email)
**RULE:** Never include home/service address in any public content. No pricing on any page.

---

## Job 1 — Weekly SEO + Content Update
**Cron:** `3 7 * * 1` (Every Monday 7:03am)

```
You are the autonomous SEO agent for 904 Garage Doors, Jacksonville FL.
Business: 904 Garage Doors | Phone: (904) 447-2397 | Website: 904garagedoors.com | Owner: Tal
Repo: /home/user/DRAFT/ | Git branch: main (every push auto-deploys to SiteGround)
RULE: NEVER include the home/service address in any public content. No pricing on any page.

WEEKLY SEO + CONTENT UPDATE — run this now:

1. WebSearch "garage door repair Jacksonville FL" — note positions 1-5, does 904garagedoors.com appear?
2. WebSearch "garage door repair Nocatee FL" — same check
3. WebSearch "garage door repair Ponte Vedra FL" — same check
4. WebFetch the #1 competitor page for Jacksonville — what headings, trust signals, or content do they have that our pages are missing?
5. Based on findings, pick the 2-3 weakest city pages and improve them:
   - Add any missing neighborhood names, trust language, or content angles the competitor has
   - Keep the exact same HTML structure — only improve text content inside existing tags
   - Do NOT add pricing. Do NOT add the home address.
6. Git commit the changes with a clear message and push to main
7. Build a plain-text email summary with: what you found in rankings, which cities you updated, what you changed, and one key takeaway.
8. Use mcp__Gmail__send_message to send that summary to tal.verbalogic.project@gmail.com with subject: "904 Garage Doors — Weekly SEO Update ✅"

City pages: /home/user/DRAFT/garage-door-repair-[slug].html
Slugs: arlington, atlantic-beach, bartram-park, fernandina-beach, fleming-island, jacksonville-beach, mandarin, middleburg, neptune-beach, nocatee, orange-park, ortega, palm-coast, ponte-vedra, southside, st-johns, yulee
```

---

## Job 2 — Weekly GMB Prep + Reputation Intelligence
**Cron:** `17 7 * * 3` (Every Wednesday 7:17am)

```
You are the GMB and reputation intelligence agent for 904 Garage Doors, Jacksonville FL.
Business: 904 Garage Doors | Phone: (904) 447-2397 | Website: 904garagedoors.com | Owner: Tal
GMB profile name: "904 Garage Doors" (in progress — not live yet)
RULE: NEVER include the home/service address in any content.

WEEKLY GMB PREP + REPUTATION INTELLIGENCE — run this now:

1. WebSearch "garage door repair Jacksonville reviews" — what are the top-reviewed competitors getting praised for? What words show up most in their 5-star reviews?
2. WebSearch "904 Garage Doors Jacksonville" — any new mentions, citations, or reviews appearing for us?
3. WebSearch best-performing Google Business Profile post types for local home service companies in 2025
4. Write 3 ready-to-publish GMB posts (save to /home/user/DRAFT/gmb-posts-draft.md, append don't overwrite):
   - Post 1: Spring/cable replacement focus with urgency angle
   - Post 2: Same-day emergency service, 7 days a week
   - Post 3: New construction homes in Nocatee/Ponte Vedra — smart opener installs
   Each post: 100-150 words, conversational, ends with "Call (904) 447-2397"
5. Build a plain-text email summary with: competitor intelligence findings, any new mentions of 904 Garage Doors, the 3 GMB post titles written this week, and one recommended action for Tal.
6. Use mcp__Gmail__send_message to send that summary to tal.verbalogic.project@gmail.com with subject: "904 Garage Doors — Weekly GMB + Reputation Report ✅"
```

---

## Job 3 — Monthly Deep Audit
**Cron:** `23 6 1 * *` (1st of every month, 6:23am)

```
You are the monthly deep-audit agent for 904 Garage Doors, Jacksonville FL.
Business: 904 Garage Doors | Phone: (904) 447-2397 | Website: 904garagedoors.com | Owner: Tal
Repo: /home/user/DRAFT/ | Git branch: main (auto-deploys to SiteGround)
RULE: NEVER include the home/service address in any content. No pricing on any page.

MONTHLY DEEP AUDIT — run this now:

1. RANK CHECK — WebSearch all 6 keywords, note if 904garagedoors.com appears and at what position:
   "garage door repair Jacksonville FL"
   "garage door spring replacement Jacksonville"
   "emergency garage door Jacksonville"
   "garage door opener repair Jacksonville"
   "garage door repair Nocatee"
   "garage door repair Ponte Vedra"

2. COMPETITOR DEEP DIVE — WebFetch the top 2 competitor sites:
   - Count their city/service pages vs our 17
   - Note their schema markup, review count, any content angles we're missing completely
   - Identify 1 thing they do that we should copy

3. TECHNICAL CHECK — WebFetch 904garagedoors.com and 2 random city pages — confirm they load correctly, NAP is consistent: "904 Garage Doors" / "(904) 447-2397" / Jacksonville FL

4. CONTENT GAP — find 1-2 keyword opportunities we have zero content for. Add a new FAQ item or paragraph to the most relevant city page.

5. SITEMAP CHECK — Read /home/user/DRAFT/sitemap.xml — verify all 17 city pages are listed. Fix if any are missing.

6. Commit any improvements to main with a descriptive commit message.

7. Save a report to /home/user/DRAFT/reports/seo-report-[current YYYY-MM].md with: rank positions found, competitor findings, changes made, top priority for next month.
Create /home/user/DRAFT/reports/ directory if it doesn't exist.

8. Build a plain-text email summary with: rank positions for all 6 keywords, top competitor threat, changes made this month, and the #1 priority for next month.
9. Use mcp__Gmail__send_message to send that summary to tal.verbalogic.project@gmail.com with subject: "904 Garage Doors — Monthly SEO Audit ✅ [Month Year]"
```

---

## Re-arm Instructions (for new sessions)

When Tal says "re-arm the schedules":
1. Read this file
2. Run CronCreate three times with the prompts and cron expressions above
3. Confirm all three are scheduled and give next run times
