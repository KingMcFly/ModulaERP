import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

let poolConfig;

if (process.env.DATABASE_URL) {
  // Strip sslmode from URL so our ssl config takes full effect.
  // When sslmode=require is in the URL, pg overrides ssl to { rejectUnauthorized: true }
  // which causes "self-signed certificate" errors with Aiven/cloud providers.
  const connectionString = process.env.DATABASE_URL.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/[?&]$/, '');
  poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
  };
} else {
  poolConfig = {
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'modulaerp_db',
    user:     process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    max:      10,
  };
}

const pool = new Pool(poolConfig);

// Mimic mysql2 pool API:
//   const [rows] = await db.query(sql, params)  → rows is an array of row objects
//   const [[row]] = await db.query(sql, params)  → single row destructure
const db = {
  async query(sql, params = []) {
    const pgSql = convertPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    return [result.rows];
  },

  // Returns a connection-like object that supports beginTransaction/commit/rollback/release
  async getConnection() {
    const client = await pool.connect();

    return {
      async query(sql, params = []) {
        const pgSql = convertPlaceholders(sql);
        const result = await client.query(pgSql, params);
        return [result.rows];
      },
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      },
    };
  },
};

export default db;
