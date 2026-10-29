"""Weekly Google Search Console pull for 904garagedoors.com.

Writes reports/gsc/latest.json (raw data) and reports/gsc/latest.md (action list
the SEO agent works from). Read-only access: it never changes anything in Search Console.
"""
import json
import os
import re
import urllib.parse
from datetime import date, timedelta
from pathlib import Path

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

SITE = "sc-domain:904garagedoors.com"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "reports" / "gsc"

creds = service_account.Credentials.from_service_account_info(
    json.loads(os.environ["GSC_SA_KEY"]), scopes=SCOPES
)
http = AuthorizedSession(creds)
site_enc = urllib.parse.quote(SITE, safe="")

# Search Console data lags ~3 days; use the latest complete 28 days.
end = date.today() - timedelta(days=3)
start = end - timedelta(days=27)


def analytics(dimensions, limit=250):
    r = http.post(
        f"https://www.googleapis.com/webmasters/v3/sites/{site_enc}/searchAnalytics/query",
        json={
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
            "dimensions": dimensions,
            "rowLimit": limit,
        },
    )
    r.raise_for_status()
    return r.json().get("rows", [])


def totals():
    r = http.post(
        f"https://www.googleapis.com/webmasters/v3/sites/{site_enc}/searchAnalytics/query",
        json={"startDate": start.isoformat(), "endDate": end.isoformat()},
    )
    r.raise_for_status()
    rows = r.json().get("rows", [])
    return rows[0] if rows else {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}


def inspect(url):
    r = http.post(
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        json={"inspectionUrl": url, "siteUrl": SITE},
    )
    if r.status_code != 200:
        return {"url": url, "error": r.text[:200]}
    res = r.json()["inspectionResult"]["indexStatusResult"]
    return {
        "url": url,
        "verdict": res.get("verdict"),
        "coverage": res.get("coverageState"),
        "lastCrawl": res.get("lastCrawlTime"),
    }


def sitemaps():
    r = http.get(f"https://www.googleapis.com/webmasters/v3/sites/{site_enc}/sitemaps")
    r.raise_for_status()
    return r.json().get("sitemap", [])


urls = re.findall(r"<loc>(.*?)</loc>", (ROOT / "sitemap.xml").read_text())
data = {
    "range": [start.isoformat(), end.isoformat()],
    "totals": totals(),
    "queries": analytics(["query"]),
    "pages": analytics(["page"]),
    "query_page": analytics(["query", "page"], 500),
    "index": [inspect(u) for u in urls],
    "sitemaps": sitemaps(),
}

prev_path = OUT / "latest.json"
prev = json.loads(prev_path.read_text()) if prev_path.exists() else None
OUT.mkdir(parents=True, exist_ok=True)
prev_path.write_text(json.dumps(data, indent=1))
(OUT / f"{end.isoformat()}.json").write_text(json.dumps(data, indent=1))

# ---- Action list for the SEO agent ----
t = data["totals"]
lines = [
    f"# Search Console report — {start} to {end}",
    "",
    f"**Clicks:** {t['clicks']:.0f} · **Impressions:** {t['impressions']:.0f} · "
    f"**CTR:** {t['ctr']*100:.1f}% · **Avg position:** {t['position']:.1f}",
]
if prev:
    p = prev["totals"]
    lines.append(
        f"Last report: {p['clicks']:.0f} clicks, {p['impressions']:.0f} impressions, "
        f"position {p['position']:.1f}"
    )

not_indexed = [i for i in data["index"] if i.get("verdict") != "PASS"]
lines += ["", f"## Not indexed ({len(not_indexed)} of {len(urls)} pages)"]
lines += [f"- {i['url']} — {i.get('coverage') or i.get('error')}" for i in not_indexed] or ["- None"]

striking = [
    r for r in data["query_page"]
    if 4 <= r["position"] <= 20 and r["impressions"] >= 10
]
striking.sort(key=lambda r: -r["impressions"])
lines += ["", "## Close to page 1 (position 4–20) — improve these pages first"]
lines += [
    f"- \"{r['keys'][0]}\" → {r['keys'][1]} — pos {r['position']:.1f}, "
    f"{r['impressions']:.0f} impr, {r['clicks']:.0f} clicks"
    for r in striking[:15]
] or ["- None yet"]

low_ctr = [
    r for r in data["pages"]
    if r["impressions"] >= 50 and r["ctr"] < 0.02 and r["position"] <= 10
]
lines += ["", "## Seen but not clicked (CTR under 2%) — rewrite title/description"]
lines += [
    f"- {r['keys'][0]} — {r['impressions']:.0f} impr, CTR {r['ctr']*100:.1f}%, pos {r['position']:.1f}"
    for r in low_ctr
] or ["- None"]

lines += ["", "## Top 15 searches"]
lines += [
    f"- \"{r['keys'][0]}\" — {r['clicks']:.0f} clicks, {r['impressions']:.0f} impr, pos {r['position']:.1f}"
    for r in sorted(data["queries"], key=lambda r: -r["impressions"])[:15]
] or ["- No data yet"]

(OUT / "latest.md").write_text("\n".join(lines) + "\n")
print("\n".join(lines))
