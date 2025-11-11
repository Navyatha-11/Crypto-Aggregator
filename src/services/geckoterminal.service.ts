/*import axios, { AxiosError } from "axios"; this line
import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rateLimiter";
import { config } from "../config/env";
import {
  GeckoTerminalResponse,
  GeckoTerminalPool,
  Token,
} from "../types/token.types";

/**
 * GeckoTerminal API Service
 * From PDF: Fetch token data with rate limiting (30 req/min)
 */
/*export class GeckoTerminalService {   this line
  private readonly baseUrl = "https://api.geckoterminal.com/api/v2";
  private rateLimiter: RateLimiter;
  private readonly maxRetries = 3;

  constructor() {
    // From PDF requirement: GeckoTerminal = 30 requests/min
    this.rateLimiter = new RateLimiter(config.rateLimits.geckoterminal);
    Logger.info("GeckoTerminal service initialized");
  }

  /**
   * Get trending pools on Solana
   */
/*  async getTrendingTokens(): Promise<Token[]> {  this line
    const url = `${this.baseUrl}/networks/solana/trending_pools`;

    try {
      Logger.debug("Fetching trending pools from GeckoTerminal");

      await this.rateLimiter.throttle();

      const startTime = Date.now();
      const response = await this.fetchWithRetry<GeckoTerminalResponse>(url);
      const duration = Date.now() - startTime;

      Logger.apiCall("GET", url, duration);

      if (!response.data || response.data.length === 0) {
        Logger.warn("No trending pools found on GeckoTerminal");
        return [];
      }

      const tokens = response.data.map((pool) =>
        this.transformPoolToToken(pool)
      );

      Logger.info(`GeckoTerminal: Found ${tokens.length} trending tokens`);
      return tokens;
    } catch (error) {
      Logger.error("GeckoTerminal trending fetch failed", error);
      return [];
    }
  }

  /**
   * Search for tokens by query
   */
/*  async searchTokens(query: string): Promise<Token[]> {  this line
    const url = `${this.baseUrl}/search/pools?query=${encodeURIComponent(
      query
    )}&network=solana`;

    try {
      await this.rateLimiter.throttle();

      const response = await this.fetchWithRetry<GeckoTerminalResponse>(url);

      if (!response.data || response.data.length === 0) {
        return [];
      }

      const tokens = response.data.map((pool) =>
        this.transformPoolToToken(pool)
      );

      Logger.info(
        `GeckoTerminal: Found ${tokens.length} tokens for "${query}"`
      );
      return tokens;
    } catch (error) {
      Logger.error("GeckoTerminal search failed", error);
      return [];
    }
  }

  /**
   * Transform GeckoTerminal pool to our Token format
   */
/*  private transformPoolToToken(pool: GeckoTerminalPool): Token { this line
    const attr = pool.attributes;

    // Parse prices
    const priceUsd = parseFloat(attr.base_token_price_usd || "0");
    const priceSol = parseFloat(attr.base_token_price_native_currency || "0");

    // Parse volumes
    const volume24hStr = attr.volume_usd?.h24 || "0";
    const volume24hUsd = parseFloat(volume24hStr);
    const SOL_PRICE_USD = 100;
    const volumeSol = volume24hUsd / SOL_PRICE_USD;

    // Parse liquidity
    const liquidityUsd = parseFloat(attr.reserve_in_usd || "0");
    const liquiditySol = liquidityUsd / SOL_PRICE_USD;

    // Parse market cap
    const marketCapUsd = parseFloat(attr.market_cap_usd || "0");
    const marketCapSol = marketCapUsd / SOL_PRICE_USD;

    // Transaction count
    const txnCount =
      (attr.transactions?.h24?.buys || 0) +
      (attr.transactions?.h24?.sells || 0);

    return {
      token_address: attr.base_token_address,
      token_name: attr.base_token_name || attr.name,
      token_ticker: attr.base_token_symbol,
      price_sol: priceSol,
     // price_usd: priceUsd,
      market_cap_sol: marketCapSol,
      volume_sol: volumeSol,
      liquidity_sol: liquiditySol,
      transaction_count: txnCount,
      price_1hr_change: parseFloat(attr.price_change_percentage?.h1 || "0"),
      price_24hr_change: parseFloat(attr.price_change_percentage?.h24 || "0"),
      //volume_24hr: volumeSol,
      protocol: attr.dex_id || 'unknown',
      source: "geckoterminal",
      last_updated: Date.now(),
      chain: "solana",
    };
  }

  /**
   * Fetch with retry and exponential backoff
   */
/*  private async fetchWithRetry<T>(url: string, attempt = 1): Promise<T> {  this line
    try {
      const response = await axios.get<T>(url, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
        },
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (
        axiosError.response?.status === 429 ||
        (axiosError.response?.status && axiosError.response.status >= 500)
      ) {
        if (attempt >= this.maxRetries) {
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000;
        Logger.warn(`Retry ${attempt}/${this.maxRetries} after ${delay}ms`);

        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const geckoterminalService = new GeckoTerminalService(); */

import axios, { AxiosError } from "axios";
import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rateLimiter";
import { config } from "../config/env";
import {
  GeckoTerminalResponse,
  GeckoTerminalPool,
  Token,
} from "../types/token.types";

/**
 * GeckoTerminal API Service
 * Transforms API data to match PDF token structure
 */
export class GeckoTerminalService {
  private readonly baseUrl = "https://api.geckoterminal.com/api/v2";
  private rateLimiter: RateLimiter;
  private readonly maxRetries = 3;

  // Current SOL price in USD
  private readonly SOL_PRICE_USD = 100; // Update dynamically

  constructor() {
    this.rateLimiter = new RateLimiter(config.rateLimits.geckoterminal);
    Logger.info("GeckoTerminal service initialized");
  }

  /**
   * Get trending pools on Solana
   */
  async getTrendingTokens(): Promise<Token[]> {
    const url = `${this.baseUrl}/networks/solana/trending_pools`;

    try {
      Logger.debug("Fetching trending pools from GeckoTerminal");

      await this.rateLimiter.throttle();

      const startTime = Date.now();
      const response = await this.fetchWithRetry<GeckoTerminalResponse>(url);
      const duration = Date.now() - startTime;

      Logger.apiCall("GET", url, duration);

      if (!response.data || response.data.length === 0) {
        Logger.warn("No trending pools found on GeckoTerminal");
        return [];
      }

      const tokens = response.data.map((pool) => this.transformToToken(pool));

      Logger.info(`GeckoTerminal: Found ${tokens.length} trending tokens`);
      return tokens;
    } catch (error) {
      Logger.error("GeckoTerminal trending fetch failed", error);
      return [];
    }
  }

  /**
   * Search for tokens by query
   */
  async searchTokens(query: string): Promise<Token[]> {
    const url = `${this.baseUrl}/search/pools?query=${encodeURIComponent(
      query
    )}&network=solana`;

    try {
      await this.rateLimiter.throttle();

      const response = await this.fetchWithRetry<GeckoTerminalResponse>(url);

      if (!response.data || response.data.length === 0) {
        return [];
      }

      const tokens = response.data.map((pool) => this.transformToToken(pool));

      Logger.info(
        `GeckoTerminal: Found ${tokens.length} tokens for "${query}"`
      );
      return tokens;
    } catch (error) {
      Logger.error("GeckoTerminal search failed", error);
      return [];
    }
  }

  /**
   * Transform GeckoTerminal pool to PDF token structure
   * CRITICAL: Must match exact PDF format
   */
  private transformToToken(pool: GeckoTerminalPool): Token {
    const attr = pool.attributes;

    // Parse price in SOL (native currency)
    const priceSol = parseFloat(attr.base_token_price_native_currency || "0");

    // Parse price in USD
    const priceUsd = parseFloat(attr.base_token_price_usd || "0");

    // Parse volumes (API returns strings!)
    const volume24hUsdStr = attr.volume_usd?.h24 || "0";
    const volume1hUsdStr = attr.volume_usd?.h1 || "0";
    const volume24hUsd = parseFloat(volume24hUsdStr);
    const volume1hUsd = parseFloat(volume1hUsdStr);

    // Convert to SOL
    const volumeSol = volume24hUsd / this.SOL_PRICE_USD;
    const volume1hrSol = volume1hUsd / this.SOL_PRICE_USD;

    // Parse liquidity (API returns string!)
    const liquidityUsdStr = attr.reserve_in_usd || "0";
    const liquidityUsd = parseFloat(liquidityUsdStr);
    const liquiditySol = liquidityUsd / this.SOL_PRICE_USD;

    // Parse market cap
    const marketCapUsdStr = attr.market_cap_usd || "0";
    const marketCapUsd = parseFloat(marketCapUsdStr);
    const marketCapSol = marketCapUsd / this.SOL_PRICE_USD;

    // Calculate transaction count
    const txns24h = attr.transactions?.h24;
    const transactionCount = txns24h
      ? (txns24h.buys || 0) + (txns24h.sells || 0)
      : 0;

    // Parse price changes (API returns strings!)
    const price1hrChangeStr = attr.price_change_percentage?.h1 || "0";
    const price24hrChangeStr = attr.price_change_percentage?.h24 || "0";
    const price1hrChange = parseFloat(price1hrChangeStr);
    const price24hrChange = parseFloat(price24hrChangeStr);

    // Build protocol name
    // GeckoTerminal sometimes provides more detail in pool name
    const protocol = this.extractProtocolName(attr.name);

    return {
      token_address: attr.base_token_address,
      token_name: attr.base_token_name || this.extractTokenName(attr.name),
      token_ticker: attr.base_token_symbol,
      price_sol: priceSol,
      market_cap_sol: marketCapSol,
      volume_sol: volumeSol, // 24h volume (default)
      liquidity_sol: liquiditySol,
      transaction_count: transactionCount,
      price_1hr_change: price1hrChange,
      protocol: protocol,

      // Additional fields
      price_24hr_change: price24hrChange,
      volume_1hr_sol: volume1hrSol,
      volume_24hr_sol: volumeSol,
      price_usd: priceUsd,

      // Metadata
      source: "geckoterminal",
      last_updated: Date.now(),
      chain: "solana",
    };
  }

  /**
   * Extract protocol name from pool name
   * Example: "BONK/SOL on Raydium" → "Raydium"
   */
  private extractProtocolName(poolName: string): string {
    // Common patterns
    if (poolName.includes("Raydium")) return "Raydium CLMM";
    if (poolName.includes("Orca")) return "Orca Whirlpool";
    if (poolName.includes("Serum")) return "Serum";
    if (poolName.includes("Meteora")) return "Meteora";

    // Default
    return poolName.split("/")[0] || "Unknown";
  }

  /**
   * Extract token name from pool name
   * Example: "BONK/SOL" → "BONK"
   */
  private extractTokenName(poolName: string): string {
    return poolName.split("/")[0] || poolName;
  }

  /**
   * Fetch with retry and exponential backoff
   */
  private async fetchWithRetry<T>(url: string, attempt = 1): Promise<T> {
    try {
      const response = await axios.get<T>(url, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
        },
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (
        axiosError.response?.status === 429 ||
        (axiosError.response?.status && axiosError.response.status >= 500)
      ) {
        if (attempt >= this.maxRetries) {
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000;
        Logger.warn(
          `Rate limited! Retry ${attempt}/${this.maxRetries} after ${delay}ms`
        );

        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const geckoterminalService = new GeckoTerminalService();
