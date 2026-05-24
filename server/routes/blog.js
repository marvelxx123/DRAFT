const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const BLOG_FILE = path.join(__dirname, '../../data/blog-articles.json');

// CORS header for all blog routes (SiteGround static pages fetching from Railway)
router.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

router.options('*', (_req, res) => res.sendStatus(200));

function readArticles() {
  try {
    const raw = JSON.parse(fs.readFileSync(BLOG_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return null; // null = file not found / unreadable
  }
}

// GET /api/blog — listing (no content field)
router.get('/', (_req, res) => {
  const articles = readArticles();
  if (articles === null) return res.json([]);

  const listing = articles.map(({ title, slug, metaDescription, customerType, seoKeywords, estimatedReadTime, publishedAt }) => ({
    title,
    slug,
    metaDescription,
    customerType,
    seoKeywords,
    estimatedReadTime,
    publishedAt,
  }));

  res.json(listing);
});

// GET /api/blog/:slug — full single article including content HTML
router.get('/:slug', (req, res) => {
  const articles = readArticles();
  if (articles === null) return res.status(404).json({ error: 'Article not found' });

  const article = articles.find(a => a.slug === req.params.slug);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  res.json(article);
});

module.exports = router;
