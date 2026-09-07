import 'dotenv/config';

const env = {
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/messaging_crm',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DEMO_MODE: (process.env.DEMO_MODE || 'true') === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default env;
