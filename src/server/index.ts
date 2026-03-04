import app from './app.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});
