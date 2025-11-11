/*import axios, { AxiosError } from 'axios'; this line
import { Logger } from '../utils/logger';
import { RateLimiter } from '../utils/rateLimiter';
import { config } from '../config/env';
import { DexScreenerResponse, DexScreenerPair, Token } from '../types/token.types';

/**
 * DexScreener API Service
 * From PDF: Fetch token data with rate limiting (300 req/min)
 */
/*export class DexScreenerService { this line
  private readonly baseUrl = 'https://api.dexscreener.com/latest/dex';
  private rateLimiter: RateLimiter;
  private readonly maxRetries = 3;

  constructor() {
    // From PDF: DexScreener = 300 requests/min
    this.rateLimiter = new RateLimiter(config.rateLimits.dexscreener);
    Logger.info('DexScreener service initialized');
  }

  /**
   * Search for tokens by query
   * @param query - Token name or ticker (e.g., "BONK", "SOL")
   * @returns Array of tokens
   */
/*  async searchTokens(query: string): Promise<Token[]> { thsi line
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
    
    try {
      Logger.debug(`Searching DexScreener for: ${query}`);
      
      // Apply rate limiting
      await this.rateLimiter.throttle();
      
      const startTime = Date.now();
      const response = await this.fetchWithRetry<DexScreenerResponse>(url);
      const duration = Date.now() - startTime;
      
      Logger.apiCall('GET', url, duration);
      
      if (!response.pairs || response.pairs.length === 0) {
        Logger.warn(`No tokens found for query: ${query}`);
        return [];
      }

      // Transform to our Token format
      const tokens = response.pairs
        .filter(pair => pair.chainId === 'solana') // Only Solana tokens
        .map(pair => this.transformPairToToken(pair));

      Logger.info(`DexScreener: Found ${tokens.length} tokens for "${query}"`);
      return tokens;

    } catch (error) {
      Logger.error('DexScreener search failed', error);
      return [];
    }
  }


  /**
   * Get trending tokens on Solana
   * Uses search with popular queries as DexScreener doesn't have trending endpoint
   */
/*  async getTrendingTokens(): Promise<Token[]> { this line
    try {
      // Search for multiple popular terms to get diverse results
      const queries = ['SOL', 'BONK', 'WIF', 'POPCAT', 'USDC'];
      const allTokens: Token[] = [];

      for (const query of queries) {
        const tokens = await this.searchTokens(query);
        allTokens.push(...tokens);
      }

      // Remove duplicates by token_address
      const uniqueTokens = this.deduplicateTokens(allTokens);
      
      // Sort by volume (highest first)
      uniqueTokens.sort((a, b) => b.volume_sol - a.volume_sol);

      Logger.info(`DexScreener: Got ${uniqueTokens.length} unique trending tokens`);
      return uniqueTokens.slice(0, 50); // Return top 50

    } catch (error) {
      Logger.error('Failed to get trending tokens', error);
      return [];
    }
  }

  /**
   * Get token by specific address
   * @param tokenAddress - Solana token address
   */
/*  async getTokenByAddress(tokenAddress: string): Promise<Token | null> {  this line
    const url = `${this.baseUrl}/tokens/${tokenAddress}`;
    
    try {
      await this.rateLimiter.throttle();
      
      const response = await this.fetchWithRetry<DexScreenerResponse>(url);
      
      if (!response.pairs || response.pairs.length === 0) {
        return null;
      }

      // Get the pair with highest liquidity
      const bestPair = response.pairs
        .filter(pair => pair.chainId === 'solana')
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

      return bestPair ? this.transformPairToToken(bestPair) : null;

    } catch (error) {
      Logger.error(`Failed to get token ${tokenAddress}`, error);
      return null;
    }
  }

  /**
   * Transform DexScreener pair to our Token format
   */
/*  private transformPairToToken(pair: DexScreenerPair): Token {  this line
    // Calculate SOL price (assuming SOL = $100 for simplicity)
    const SOL_PRICE_USD = 100;
    const priceUsd = parseFloat(pair.priceUsd || '0');
    const priceSol = priceUsd / SOL_PRICE_USD;

    // Calculate volumes in SOL
    const volume24hUsd = pair.volume?.h24 || 0;
    const volumeSol = volume24hUsd / SOL_PRICE_USD;

    // Calculate liquidity in SOL
    const liquidityUsd = pair.liquidity?.usd || 0;
    const liquiditySol = liquidityUsd / SOL_PRICE_USD;

    // Calculate market cap in SOL
    const marketCapUsd = pair.marketCap || 0;
    const marketCapSol = marketCapUsd / SOL_PRICE_USD;

    // Transaction count
    const txnCount = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);

    return {
      token_address: pair.baseToken.address,
      token_name: pair.baseToken.name,
      token_ticker: pair.baseToken.symbol,
      price_sol: priceSol,
      // price_usd: priceUsd,
      market_cap_sol: marketCapSol,
      volume_sol: volumeSol,
      liquidity_sol: liquiditySol,
      transaction_count: txnCount,
      price_1hr_change: pair.priceChange?.h1 || 0,
      price_24hr_change: pair.priceChange?.h24 || 0,
      volume_1hr: (pair.volume?.h1 || 0) / SOL_PRICE_USD,
      protocol: `${pair.dexId}`,
      source: 'dexscreener',
      last_updated: Date.now(),
      chain: 'solana',
      // fdv: pair.fdv,
      // pair_created_at: pair.pairCreatedAt,
    };
  }
  
  /**
   * Helper to remove duplicate tokens based on token_address
   */
/*  private deduplicateTokens(tokens: Token[]): Token[] { this line
    const seen = new Map<string, Token>();
    for (const token of tokens) {
      if (!seen.has(token.token_address)) {
        seen.set(token.token_address, token);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Fetch with exponential backoff retry
   * From PDF: Handle rate limiting with exponential backoff
   */
/*  private async fetchWithRetry<T>(url: string, attempt = 1): Promise<T> { this line
    try {
      const response = await axios.get<T>(url, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        },
      });

      return response.data;

    } catch (error) {
      const axiosError = error as AxiosError;
      Logger.warn(`fetchWithRetry: Attempt ${attempt} failed for ${url}`, axiosError.message);

      // From PDF: Handle rate limiting (429) or server error (5xx)
      if (
        attempt < this.maxRetries &&
        (axiosError.response?.status === 429 || (axiosError.response?.status || 0) >= 500)
      ) {
        // Exponential backoff: 0.5s, 1s, 2s
        const delay = Math.pow(2, attempt - 1) * 500;
        Logger.debug(`API error (${axiosError.response?.status}). Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Call this function again
        return this.fetchWithRetry<T>(url, attempt + 1);
      }

      // If out of retries, throw the error
      Logger.error(`fetchWithRetry: All ${this.maxRetries} attempts failed for ${url}`, error);
      throw error;
    }
  } // <-- This closes fetchWithRetry

  // --- ADD THIS LINE TO THE VERY BOTTOM OF dexscreener.service.ts ---

} // <-- This is the final closing brace for the class
export const dexscreenerService = new DexScreenerService(); */
import axios, { AxiosError } from "axios";
import { Logger } from "../utils/logger";
import { RateLimiter } from "../utils/rateLimiter";
import { config } from "../config/env";
import {
  DexScreenerResponse,
  DexScreenerPair,
  Token,
} from "../types/token.types";

/**
 * DexScreener API Service
 * Transforms API data to match PDF token structure
 */
export class DexScreenerService {
  private readonly baseUrl = "https://api.dexscreener.com/latest/dex";
  private rateLimiter: RateLimiter;
  private readonly maxRetries = 3;

  // Current SOL price in USD (you should fetch this from an API in production)
  private readonly SOL_PRICE_USD = 100; // Update this dynamically

  constructor() {
    this.rateLimiter = new RateLimiter(config.rateLimits.dexscreener);
    Logger.info("DexScreener service initialized");
  }

  /**
   * Search for tokens by query
   */
  async searchTokens(query: string): Promise<Token[]> {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;

    try {
      Logger.debug(`Searching DexScreener for: ${query}`);

      await this.rateLimiter.throttle();

      const startTime = Date.now();
      const response = await this.fetchWithRetry<DexScreenerResponse>(url);
      const duration = Date.now() - startTime;

      Logger.apiCall("GET", url, duration);

      if (!response.pairs || response.pairs.length === 0) {
        Logger.warn(`No tokens found for query: ${query}`);
        return [];
      }

      // Filter only Solana pairs and transform
      const tokens = response.pairs
        .filter((pair) => pair.chainId === "solana")
        .map((pair) => this.transformToToken(pair));

      Logger.info(
        `DexScreener: Found ${tokens.length} Solana tokens for "${query}"`
      );
      return tokens;
    } catch (error) {
      Logger.error("DexScreener search failed", error);
      return [];
    }
  }

  /**
   * Get trending tokens
   */
  async getTrendingTokens(): Promise<Token[]> {
    try {
      // DexScreener doesn't have trending endpoint, so search popular tokens
      const queries = ["SOL", "BONK", "WIF", "POPCAT", "USDC", "USDT"];
      const allTokens: Token[] = [];

      for (const query of queries) {
        const tokens = await this.searchTokens(query);
        allTokens.push(...tokens);
      }

      // Remove duplicates
      const uniqueTokens = this.deduplicateTokens(allTokens);

      // Sort by volume (highest first)
      uniqueTokens.sort((a, b) => b.volume_sol - a.volume_sol);

      Logger.info(`DexScreener: Got ${uniqueTokens.length} unique tokens`);
      return uniqueTokens.slice(0, 50);
    } catch (error) {
      Logger.error("Failed to get trending tokens", error);
      return [];
    }
  }

  /**
   * Transform DexScreener pair to PDF token structure
   * CRITICAL: Must match exact PDF format
   */
  private transformToToken(pair: DexScreenerPair): Token {
    // Parse price in SOL (already in native token)
    const priceSol = parseFloat(pair.priceNative || "0");

    // Parse price in USD
    const priceUsd = parseFloat(pair.priceUsd || "0");

    // Calculate volume in SOL
    // API gives volume in USD, convert to SOL
    const volume24hUsd = pair.volume?.h24 || 0;
    const volume1hUsd = pair.volume?.h1 || 0;
    const volumeSol = volume24hUsd / this.SOL_PRICE_USD;
    const volume1hrSol = volume1hUsd / this.SOL_PRICE_USD;

    // Calculate liquidity in SOL
    // Use quote liquidity if available (already in SOL)
    // Otherwise convert from USD
    let liquiditySol: number;
    if (pair.liquidity?.quote !== undefined) {
      liquiditySol = pair.liquidity.quote;
    } else {
      const liquidityUsd = pair.liquidity?.usd || 0;
      liquiditySol = liquidityUsd / this.SOL_PRICE_USD;
    }

    // Calculate market cap in SOL
    const marketCapUsd = pair.marketCap || 0;
    const marketCapSol = marketCapUsd / this.SOL_PRICE_USD;

    // Calculate transaction count (total of buys + sells for 24h)
    const txns24h = pair.txns?.h24;
    const transactionCount = txns24h
      ? (txns24h.buys || 0) + (txns24h.sells || 0)
      : 0;

    // Get price changes
    const price1hrChange = pair.priceChange?.h1 || 0;
    const price24hrChange = pair.priceChange?.h24;

    // Build protocol name with more detail
    // From PDF example: "Raydium CLMM"
    const protocol = this.buildProtocolName(pair.dexId, pair.chainId);

    return {
      token_address: pair.baseToken.address,
      token_name: pair.baseToken.name,
      token_ticker: pair.baseToken.symbol,
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
      source: "dexscreener",
      last_updated: Date.now(),
      chain: "solana",
    };
  }

  /**
   * Build detailed protocol name
   * Examples: "Raydium CLMM", "Orca Whirlpool", "Serum", etc.
   */
  private buildProtocolName(dexId: string, chainId: string): string {
    // Map known DEX IDs to full names
    const protocolMap: Record<string, string> = {
      raydium: "Raydium CLMM",
      orca: "Orca Whirlpool",
      serum: "Serum",
      meteora: "Meteora",
      lifinity: "Lifinity",
    };

    return protocolMap[dexId.toLowerCase()] || `${dexId} ${chainId}`;
  }

  /**
   * Fetch with exponential backoff retry
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

      // Rate limited (429) or server error (5xx)
      if (
        axiosError.response?.status === 429 ||
        (axiosError.response?.status && axiosError.response.status >= 500)
      ) {
        if (attempt >= this.maxRetries) {
          Logger.error(`Max retries (${this.maxRetries}) exceeded for ${url}`);
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
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

  /**
   * Remove duplicate tokens (keep highest volume)
   */
  private deduplicateTokens(tokens: Token[]): Token[] {
    const seen = new Map<string, Token>();

    for (const token of tokens) {
      const existing = seen.get(token.token_address);

      if (!existing || token.volume_sol > existing.volume_sol) {
        seen.set(token.token_address, token);
      }
    }

    return Array.from(seen.values());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const dexscreenerService = new DexScreenerService();