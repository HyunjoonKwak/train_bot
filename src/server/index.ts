import { createApp } from './app.js';
import { DatabaseManager } from './infrastructure/database/index.js';
import { CronManager } from './infrastructure/scheduler/cronManager.js';
import { logger } from './utils/logger.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);
  CronManager.destroy();
  DatabaseManager.getInstance().close();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
