import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Helper function: Get required env var or throw error
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function: Get number from env var
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`❌ Invalid number for ${key}: ${value}`);
  }
  return parsed;
}

// Export configuration object
export const config = {
  // Server settings
  server: {
    port: getEnvNumber("PORT", 3000),
    nodeEnv: getEnvVar("NODE_ENV", "development"),
    isDevelopment: getEnvVar("NODE_ENV", "development") === "development",
    isProduction: getEnvVar("NODE_ENV", "development") === "production",
  },

  // Redis settings
  redis: {
    host: getEnvVar("REDIS_HOST", "localhost"),
    port: getEnvNumber("REDIS_PORT", 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Cache settings (from PDF: configurable TTL, default 30s)
  cache: {
    ttl: getEnvNumber("CACHE_TTL", 30), // Time-to-live in seconds
  },

  // API rate limits (from PDF requirements)
  rateLimits: {
    dexscreener: getEnvNumber("DEXSCREENER_RATE_LIMIT", 300), // 300/min
    geckoterminal: getEnvNumber("GECKOTERMINAL_RATE_LIMIT", 30), // 30/min
  },

  // Pagination (from PDF: 20-30 tokens per page)
  pagination: {
    defaultLimit: getEnvNumber("DEFAULT_PAGE_LIMIT", 30),
    maxLimit: getEnvNumber("MAX_PAGE_LIMIT", 100),
  },

  // WebSocket settings
  websocket: {
    updateInterval: getEnvNumber("WEBSOCKET_UPDATE_INTERVAL", 30000), // 30s
  },

  // Logging
  logging: {
    level: getEnvVar("LOG_LEVEL", "info"),
  },
};

// Log configuration on startup (only in development)
if (config.server.isDevelopment) {
  console.log("📋 Configuration loaded:");
  console.log(`   Port: ${config.server.port}`);
  console.log(`   Environment: ${config.server.nodeEnv}`);
  console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`   Cache TTL: ${config.cache.ttl}s`);
  console.log(`   Page Limit: ${config.pagination.defaultLimit}`);
}
