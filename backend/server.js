const { createApp } = require('./app');
const { createDatabase } = require('./config/db');

const port = Number(process.env.PORT ?? 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535');
}

const database = createDatabase(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

createApp({ database, origins }).listen(port, () => {
  console.log(`Smilepoint backend listening on port ${port}`);
});
