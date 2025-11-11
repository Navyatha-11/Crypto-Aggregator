import Redis from "ioredis";
import { config } from "../config/env";
import { Logger } from "../utils/logger";
import { Token, PaginatedTokenResponse } from "../types/token.types";

/**
 * Cache Service using Redis
 * From PDF: Configurable TTL (default 30s) to reduce API calls
 */
export class CacheService {
  private redis: Redis;
  private readonly ttl: number; // Time-to-live in seconds

  constructor() {
    // Initialize Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        // Exponential backoff for reconnection
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Get TTL from config (default 30s from PDF)
    this.ttl = config.cache.ttl;

    // Connection event handlers
    this.redis.on("connect", () => {
      Logger.info("✅ Redis connected successfully");
    });

    this.redis.on("error", (error) => {
      Logger.error("❌ Redis connection error", error);
    });

    this.redis.on("reconnecting", () => {
      Logger.warn("🔄 Redis reconnecting...");
    });

    Logger.info(`Cache service initialized with TTL: ${this.ttl}s`);
  }

  /**
   * Generate cache key from query parameters
   * Example: "tokens:solana:1h:volume:desc:limit=30"
   */
  private generateKey(prefix: string, params?: any): string {
    if (!params) return prefix;

    // Create deterministic key from params
    const paramStr = Object.keys(params)
      .sort() // Sort keys for consistency
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join(":");

    return paramStr ? `${prefix}:${paramStr}` : prefix;
  }

  /**
   * Get tokens from cache
   * @param key - Cache key
   * @returns Token array or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);

      if (!data) {
        Logger.cache("miss", key);
        return null;
      }

      Logger.cache("hit", key);
      return JSON.parse(data) as T;
    } catch (error) {
      Logger.error("Cache GET error", error);
      return null;
    }
  }

  /**
   * Store tokens in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param customTtl - Optional custom TTL (overrides default)
   */
  async set<T>(key: string, data: T, customTtl?: number): Promise<void> {
    try {
      const ttl = customTtl || this.ttl;
      const serialized = JSON.stringify(data);

      // Set with expiration (EX = seconds)
      await this.redis.set(key, serialized, "EX", ttl);

      Logger.cache("set", key);
      Logger.debug(
        `Cache set: ${key} (TTL: ${ttl}s, Size: ${serialized.length} bytes)`
      );
    } catch (error) {
      Logger.error("Cache SET error", error);
    }
  }

  /**
   * Delete key from cache
   * @param key - Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      Logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      Logger.error("Cache DELETE error", error);
    }
  }

  /**
   * Delete all keys matching pattern
   * Example: deletePattern('tokens:*') deletes all token caches
   * @param pattern - Redis key pattern (supports * wildcard)
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // Get all matching keys
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        Logger.debug(`No keys found matching pattern: ${pattern}`);
        return;
      }

      // Delete all matching keys
      await this.redis.del(...keys);
      Logger.info(`Cache cleared: ${keys.length} keys matching '${pattern}'`);
    } catch (error) {
      Logger.error("Cache DELETEPATTERN error", error);
    }
  }

  /**
   * Get remaining TTL for a key
   * @param key - Cache key
   * @returns Remaining seconds or null if key doesn't exist
   */
  async getTTL(key: string): Promise<number | null> {
    try {
      const ttl = await this.redis.ttl(key);
      return ttl > 0 ? ttl : null;
    } catch (error) {
      Logger.error("Cache TTL error", error);
      return null;
    }
  }

  /**
   * Check if cache is healthy
   * @returns true if Redis is connected
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch (error) {
      Logger.error("Redis health check failed", error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns Stats about Redis memory and keys
   */
  async getStats(): Promise<{
    connected: boolean;
    keysCount: number;
    memoryUsed: string;
    uptime: number;
  }> {
    try {
      const info = await this.redis.info("stats");
      const memory = await this.redis.info("memory");
      const server = await this.redis.info("server");

      // Parse Redis INFO response
      const parseInfo = (str: string): Record<string, string> => {
        const result: Record<string, string> = {};
        str.split("\r\n").forEach((line) => {
          if (line.includes(":")) {
            const [key, value] = line.split(":");
            result[key] = value;
          }
        });
        return result;
      };

      const statsInfo = parseInfo(info);
      const memoryInfo = parseInfo(memory);
      const serverInfo = parseInfo(server);

      const keys = await this.redis.dbsize();

      return {
        connected: true,
        keysCount: keys,
        memoryUsed: memoryInfo.used_memory_human || "0",
        uptime: parseInt(serverInfo.uptime_in_seconds || "0", 10),
      };
    } catch (error) {
      Logger.error("Failed to get cache stats", error);
      return {
        connected: false,
        keysCount: 0,
        memoryUsed: "0",
        uptime: 0,
      };
    }
  }

  /**
   * Cache tokens with query parameters as key
   * Example: cacheTokens({ time_period: '1h', sort: 'volume' }, tokens)
   */
  async cacheTokens(params: any, data: Token[]): Promise<void> {
    const key = this.generateKey("tokens", params);
    await this.set(key, data);
  }

  /**
   * Get cached tokens by query parameters
   */
  async getCachedTokens(params: any): Promise<Token[] | null> {
    const key = this.generateKey("tokens", params);
    return await this.get<Token[]>(key);
  }

  /**
   * Cache paginated response
   */
  async cachePaginatedTokens(
    params: any,
    data: PaginatedTokenResponse
  ): Promise<void> {
    const key = this.generateKey("tokens:paginated", params);
    await this.set(key, data);
  }

  /**
   * Get cached paginated response
   */
  async getCachedPaginatedTokens(
    params: any
  ): Promise<PaginatedTokenResponse | null> {
    const key = this.generateKey("tokens:paginated", params);
    return await this.get<PaginatedTokenResponse>(key);
  }

  /**
   * Invalidate all token caches
   * Call this when you fetch fresh data from APIs
   */
  async invalidateTokenCache(): Promise<void> {
    await this.deletePattern("tokens:*");
    Logger.info("🔄 Token cache invalidated");
  }

  /**
   * Close Redis connection (call on app shutdown)
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    Logger.info("Redis disconnected");
  }
}

// Export singleton instance
export const cacheService = new CacheService();
