import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'wildcatter',
    user: process.env.PGUSER || 'wildcatter',
    password: process.env.PGPASSWORD || 'wildcatter',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'wildcatter-dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
} as const;
