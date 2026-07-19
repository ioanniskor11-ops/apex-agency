// ── Apex Agency — Blog Route ───────────────────────────────
const express = require('express');
const router = express.Router();
const { query, cacheGetOrSet } = require('../db');
const sanitizeHtml = require('sanitize-html');

// ── Sanitization options ──────────────────────────────────
const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'figure', 'figcaption', 'hr']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'loading'],
    a: ['href', 'target', 'rel', 'aria-label'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

// ── GET /api/blog ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 9,
      search,
      category,
      tag,
      featured,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 9));
    const offset = (pageNum - 1) * limitNum;

    // Build cache key
    const cacheKey = `blog:${pageNum}:${limitNum}:${search || ''}:${category || ''}:${tag || ''}:${featured || ''}`;

    const data = await cacheGetOrSet(cacheKey, async () => {
      let whereClause = 'WHERE published = TRUE';
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (title ILIKE $${paramIndex} OR excerpt ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (tag) {
        whereClause += ` AND $${paramIndex} = ANY(tags)`;
        params.push(tag);
        paramIndex++;
      }

      if (featured === 'true') {
        whereClause += ' AND featured = TRUE';
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) FROM blog_posts ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      // Get paginated posts
      const postsResult = await query(
        `SELECT id, slug, title, excerpt, author, author_role, category, tags, thumbnail, 
                featured, published_at, created_at,
                CASE WHEN LENGTH(content) > 200 THEN LEFT(content, 200) || '...' ELSE content END as content_preview,
                LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1 as word_count
         FROM blog_posts ${whereClause}
         ORDER BY featured DESC, published_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limitNum, offset]
      );

      return {
        posts: postsResult.rows.map(post => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt || post.content_preview,
          author: post.author,
          author_role: post.author_role,
          category: post.category,
          tags: post.tags,
          thumbnail: post.thumbnail,
          featured: post.featured,
          published_at: post.published_at || post.created_at,
          reading_time: `${Math.ceil((post.word_count || 200) / 200)} min read`,
          url: `/blog/${post.slug}/`,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
          has_next: offset + limitNum < total,
          has_previous: pageNum > 1,
        },
      };
    }, 300); // Cache for 5 minutes

    res.json(data);
  } catch (err) {
    console.error('[Blog] List error:', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// ── GET /api/blog/:slug ────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `blog:post:${slug}`;

    const post = await cacheGetOrSet(cacheKey, async () => {
      const result = await query(
        `SELECT * FROM blog_posts WHERE slug = $1 AND published = TRUE LIMIT 1`,
        [slug]
      );

      if (result.rows.length === 0) return null;

      const p = result.rows[0];
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: sanitizeHtml(p.content, sanitizeOptions),
        author: p.author,
        author_role: p.author_role,
        author_social: p.author_social,
        category: p.category,
        tags: p.tags,
        thumbnail: p.thumbnail,
        featured: p.featured,
        published_at: p.published_at,
        reading_time: `${Math.ceil((p.content.split(/\s+/).length || 200) / 200)} min read`,
        url: `/blog/${p.slug}/`,
      };
    }, 300);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('[Blog] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

module.exports = router;
