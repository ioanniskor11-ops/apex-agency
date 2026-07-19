// ── Apex Agency — Production Build Script ───────────────────
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const terser = require('terser');

async function build() {
  console.log('\n  🏗️  Building Apex Agency for Production\n');

  const startTime = Date.now();

  try {
    // Step 1: Build frontend (Eleventy)
    console.log('  [1/4] Building static site with Eleventy...');
    execSync('npx eleventy', { stdio: 'inherit' });
    console.log('  ✓ Static site built\n');

    // Step 2: Minify JavaScript
    console.log('  [2/4] Minifying JavaScript...');
    const jsDir = path.join(__dirname, '../../_site/assets/js');
    if (fs.existsSync(jsDir)) {
      const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
      for (const file of files) {
        const filePath = path.join(jsDir, file);
        const code = fs.readFileSync(filePath, 'utf8');
        const minified = await terser.minify(code, {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          mangle: true,
          output: {
            comments: false,
          },
        });
        if (minified.code) {
          fs.writeFileSync(filePath, minified.code);
          console.log(`  ✓ Minified: ${file}`);
        }
      }
    }
    console.log('');

    // Step 3: Optimize CSS
    console.log('  [3/4] Building & optimizing CSS...');
    execSync('NODE_ENV=production npx postcss assets/css/main.css -o _site/assets/css/main.css', { stdio: 'inherit' });
    console.log('  ✓ CSS built\n');

    // Step 4: Generate asset manifest
    console.log('  [4/4] Generating asset manifest...');
    const manifest = {
      buildTime: new Date().toISOString(),
      assets: {},
    };

    const siteDir = path.join(__dirname, '../../_site');
    function walkDir(dir, prefix = '') {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath, `${prefix}${entry.name}/`);
        } else if (entry.isFile() && /\.(css|js|png|jpg|svg|webp|woff2)$/i.test(entry.name)) {
          const stats = fs.statSync(fullPath);
          const relativePath = `/${prefix}${entry.name}`;
          manifest.assets[relativePath] = {
            size: stats.size,
            modified: stats.mtime.toISOString(),
            hash: require('crypto').createHash('md5').update(fs.readFileSync(fullPath)).digest('hex').substring(0, 8),
          };
        }
      }
    }
    walkDir(siteDir);
    fs.writeFileSync(path.join(siteDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('  ✓ Asset manifest generated\n');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✨ Build complete in ${duration}s\n`);
    console.log(`  📁 Output: ${path.resolve(siteDir)}\n`);

  } catch (err) {
    console.error('\n  ❌ Build failed:', err.message);
    process.exit(1);
  }
}

build();
