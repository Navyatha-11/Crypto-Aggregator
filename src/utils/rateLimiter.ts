import { Logger } from "./logger";

/**
 * Rate limiter to prevent hitting API limits
 * From PDF: DexScreener = 300 req/min, GeckoTerminal = 30 req/min
 */
export class RateLimiter {
  private lastCallTime: number = 0;
  private minInterval: number;
  private maxCallsPerMinute: number;
  private callCount: number = 0;
  private resetTime: number = Date.now();

  constructor(maxCallsPerMinute: number) {
    this.maxCallsPerMinute = maxCallsPerMinute;
    // Calculate minimum milliseconds between calls
    // Example: 300 calls/min = 60000ms / 300 = 200ms between calls
    this.minInterval = (60 * 1000) / maxCallsPerMinute;

    Logger.debug(
      `RateLimiter initialized: ${maxCallsPerMinute} calls/min (${this.minInterval}ms interval)`
    );
  }

  /**
   * Throttle: Wait if needed before making API call
   * Call this BEFORE every API request
   */
  async throttle(): Promise<void> {
    const now = Date.now();

    // Reset counter every minute
    if (now - this.resetTime >= 60000) {
      this.callCount = 0;
      this.resetTime = now;
      Logger.debug("RateLimiter: Counter reset");
    }

    // Check if we've hit the limit
    if (this.callCount >= this.maxCallsPerMinute) {
      const waitTime = 60000 - (now - this.resetTime);
      Logger.warn(`Rate limit reached! Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
      this.callCount = 0;
      this.resetTime = Date.now();
    }

    // Ensure minimum interval between calls
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < this.minInterval) {
      const delay = this.minInterval - timeSinceLastCall;
      Logger.debug(`Throttling: Waiting ${delay}ms`);
      await this.sleep(delay);
    }

    this.lastCallTime = Date.now();
    this.callCount++;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current stats (for monitoring)
   */
  getStats(): { callCount: number; maxCalls: number; resetsIn: number } {
    const now = Date.now();
    const resetsIn = Math.max(0, 60000 - (now - this.resetTime));
    return {
      callCount: this.callCount,
      maxCalls: this.maxCallsPerMinute,
      resetsIn,
    };
  }
}
