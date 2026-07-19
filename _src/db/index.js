// ── Apex Agency — Database Client ──────────────────────────
const { Pool } = require('pg');
const Redis = require('ioredis');

let pool = null;
let redis = null;

/**
 * Get or initialize PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DB_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: true }
        : false,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err);
    });
  }
  return pool;
}

/**
 * Get or initialize Redis client
 */
function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      keyPrefix: process.env.REDIS_PREFIX || 'apex:',
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });

    redis.on('ready', () => {
      console.log('[Redis] Connected successfully');
    });
  }
  return redis;
}

/**
 * Execute a database query with parameters
 */
async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } finally {
    client.release();
  }
}

/**
 * Cache helper: get or set cache entry
 */
async function cacheGetOrSet(key, fetchFn, ttlSeconds = 300) {
  const cache = getRedis();
  
  try {
    const cached = await cache.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[Cache] Get error:', err.message);
  }

  const data = await fetchFn();

  try {
    await cache.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.warn('[Cache] Set error:', err.message);
  }

  return data;
}

/**
 * Invalidate cache entries matching a pattern
 */
async function cacheInvalidate(pattern) {
  const cache = getRedis();
  try {
    const keys = await cache.keys(pattern);
    if (keys.length > 0) {
      await cache.del(keys);
    }
  } catch (err) {
    console.warn('[Cache] Invalidate error:', err.message);
  }
}

/**
 * Initialize database schema (run migrations)
 */
async function initializeDatabase() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    await query(schema);
    console.log('[DB] Schema initialized successfully');
  } catch (err) {
    console.error('[DB] Schema initialization error:', err);
    throw err;
  }
}

/**
 * Health check
 */
async function healthCheck() {
  const results = { postgres: false, redis: false };
  
  try {
    await query('SELECT 1');
    results.postgres = true;
  } catch (err) {
    console.error('[Health] PostgreSQL check failed:', err.message);
  }

  try {
    const cache = getRedis();
    await cache.ping();
    results.redis = true;
  } catch (err) {
    console.error('[Health] Redis check failed:', err.message);
  }

  return results;
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  if (pool) {
    await pool.end();
    console.log('[DB] PostgreSQL pool closed');
  }
  if (redis) {
    redis.disconnect();
    console.log('[DB] Redis disconnected');
  }
}

module.exports = {
  getPool,
  getRedis,
  query,
  cacheGetOrSet,
  cacheInvalidate,
  initializeDatabase,
  healthCheck,
  shutdown,
};
