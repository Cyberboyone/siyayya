import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type LogLevel = 'info' | 'warn' | 'error' | 'critical';
type LogCategory = 'auth' | 'payment' | 'admin' | 'moderation' | 'chat' | 'api' | 'system';

interface LogContext {
  userId?: string;
  action?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

const IS_PROD = import.meta.env.PROD;

export const logger = {
  log: async (level: LogLevel, category: LogCategory, message: string, context?: LogContext) => {
    const logData = {
      level,
      category,
      message,
      context: context || {},
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    };

    // Console output for development and fallback
    if (!IS_PROD || level === 'error' || level === 'critical') {
      const consoleMsg = `[${level.toUpperCase()}] [${category}] ${message}`;
      if (level === 'error' || level === 'critical') console.error(consoleMsg, context);
      else if (level === 'warn') console.warn(consoleMsg, context);
      else console.log(consoleMsg, context);
    }

    // Persist to Firestore in production (or for important logs)
    if (IS_PROD || level === 'critical' || level === 'error') {
      try {
        await addDoc(collection(db, "system_logs"), {
          ...logData,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to write to system_logs:", e);
      }
    }
  },

  info: (category: LogCategory, message: string, context?: LogContext) => 
    logger.log('info', category, message, context),
  
  warn: (category: LogCategory, message: string, context?: LogContext) => 
    logger.log('warn', category, message, context),
  
  error: (category: LogCategory, message: string, context?: LogContext) => 
    logger.log('error', category, message, context),
    
  critical: (category: LogCategory, message: string, context?: LogContext) => 
    logger.log('critical', category, message, context),
};
