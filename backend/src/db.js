import mysql from 'mysql2/promise';
import 'dotenv/config';

const poolConfig = {
  database:           process.env.DB_NAME     || 'modulaerp_db',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
};

if (process.env.DB_SOCKET) {
  poolConfig.socketPath = process.env.DB_SOCKET;
} else {
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = process.env.DB_PORT || 3306;
}

const pool = mysql.createPool(poolConfig);

export default pool;
