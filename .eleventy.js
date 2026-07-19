// ── Apex Agency — Eleventy (11ty) Configuration ─────────────
const pluginRss = require('@11ty/eleventy-plugin-rss');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

module.exports = function (eleventyConfig) {
  // ── Plugins ─────────────────────────────────────────────
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);

  // ── Copy static assets to output ────────────────────────
  eleventyConfig.addPassthroughCopy('assets/css');
  eleventyConfig.addPassthroughCopy('assets/js');
  eleventyConfig.addPassthroughCopy('assets/images');
  eleventyConfig.addPassthroughCopy('assets/fonts');
  eleventyConfig.addPassthroughCopy('_redirects');
  eleventyConfig.addPassthroughCopy('_headers');
  eleventyConfig.addPassthroughCopy('robots.txt');
  eleventyConfig.addPassthroughCopy('favicon.ico');

  // ── Watch targets ──────────────────────────────────────
  eleventyConfig.addWatchTarget('./assets/css/');
  eleventyConfig.addWatchTarget('./assets/js/');

  // ── Collections ─────────────────────────────────────────
  // Blog posts collection
  eleventyConfig.addCollection('posts', function (collectionApi) {
    return collectionApi.getFilteredByGlob('./pages/posts/*.md')
      .filter(p => p.data.draft !== true)
      .sort((a, b) => b.date - a.date);
  });

  // Featured posts
  eleventyConfig.addCollection('featuredPosts', function (collectionApi) {
    return collectionApi.getFilteredByGlob('./pages/posts/*.md')
      .filter(p => p.data.featured && p.data.draft !== true)
      .sort((a, b) => b.date - a.date);
  });

  // Case studies
  eleventyConfig.addCollection('caseStudies', function (collectionApi) {
    return collectionApi.getFilteredByGlob('./pages/case-studies/*.md')
      .filter(p => p.data.draft !== true)
      .sort((a, b) => (a.data.order || 99) - (b.data.order || 99));
  });

  // ── Filters ─────────────────────────────────────────────
  // Safe filter (marks output as safe HTML — LiquidJS compatibility)
  eleventyConfig.addFilter('safe', function (text) {
    return text;
  });

  // url_encode filter
  eleventyConfig.addFilter('url_encode', function (text) {
    if (!text) return '';
    return encodeURIComponent(text);
  });

  // Asset URL filter
  eleventyConfig.addFilter('asset_url', function (assetPath) {
    if (!assetPath) return '';
    return `/assets/${assetPath}`;
  });

  // Absolute URL filter
  eleventyConfig.addFilter('absolute_url', function (relativePath) {
    if (!relativePath) return '';
    const siteUrl = this.ctx?.site?.url || 'https://www.apexagency.com';
    return `${siteUrl}${relativePath}`;
  });

  // Slugify filter
  eleventyConfig.addFilter('slugify', function (text) {
    if (!text) return '';
    return slugify(text, { lower: true, strict: true });
  });

  // Resize image filter (returns URL with Cloudinary transforms)
  eleventyConfig.addFilter('resize', function (imageUrl, width, height) {
    if (!imageUrl) return '';
    // If using Cloudinary
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl.replace('/upload/', `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`);
    }
    return imageUrl;
  });

  // Date formatting
  eleventyConfig.addFilter('date_short', function (date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  eleventyConfig.addFilter('date_medium', function (date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  });

  // Reading time
  eleventyConfig.addFilter('reading_time', function (text) {
    if (!text) return '1 min read';
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  });

  // Truncate text
  eleventyConfig.addFilter('truncate', function (text, length = 150) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length).replace(/\s+\S*$/, '') + '...';
  });

  // JSON-LD helper
  eleventyConfig.addFilter('jsonld', function (data) {
    return JSON.stringify(data, null, 2);
  });

  // ── Shortcodes ──────────────────────────────────────────
  // Current year
  eleventyConfig.addShortcode('year', function () {
    return new Date().getFullYear().toString();
  });

  // SVG icon
  eleventyConfig.addShortcode('icon', function (name, className = 'w-6 h-6') {
    // This would load from a sprite file; placeholder for now
    return `<svg class="${className}" aria-hidden="true"><use href="/assets/icons/sprite.svg#${name}"/></svg>`;
  });

  // ── Transforms ──────────────────────────────────────────
  // Minify HTML in production (wrapped in try/catch for safety)
  if (process.env.NODE_ENV === 'production') {
    eleventyConfig.addTransform('htmlmin', function (content, outputPath) {
      if (outputPath && outputPath.endsWith('.html')) {
        try {
          const htmlmin = require('html-minifier-terser');
          return htmlmin.minify(content, {
            useShortDoctype: true,
            removeComments: true,
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
          });
        } catch (e) {
          // html-minifier-terser not available, skip minification
          return content;
        }
      }
      return content;
    });
  }

  // ── BrowserSync ─────────────────────────────────────────
  eleventyConfig.setBrowserSyncConfig({
    open: false,
  });

  // ── Template config ─────────────────────────────────────
  return {
    dir: {
      input: '.',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts',
      data: '_data',
    },
    templateFormats: ['liquid', 'md', 'html'],
    htmlTemplateEngine: 'liquid',
    markdownTemplateEngine: 'liquid',
    passthroughFileCopy: true,
  };
};
