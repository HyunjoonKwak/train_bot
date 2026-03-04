import type { SessionUser } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      validatedQuery?: any;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    user?: SessionUser;
    oauthState?: string;
  }
}
