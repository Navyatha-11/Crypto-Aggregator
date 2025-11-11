/*import { Logger } from "../utils/logger"; this line
import { cacheService } from "./cache.service";
import { dexscreenerService } from "./dexscreener.service";
import { geckoterminalService } from "./geckoterminal.service";
import {
  Token,
  TokenFilters,
  TokenSort,
  PaginationParams,
  PaginatedTokenResponse,
  TimePeriod,
} from "../types/token.types";

/**
 * Aggregation Service
 * From PDF: Merge duplicate tokens intelligently
 */
/*export class AggregationService { this line
  constructor() {
    Logger.info("Aggregation service initialized");
  }

  /**
   * Get all tokens (fetch from APIs and merge)
   * From PDF: Fetch from at least 2 APIs, merge duplicates
   */
/*  async getAllTokens(): Promise<Token[]> {      this line
    try {
      Logger.info("Fetching tokens from all sources...");

      // Fetch from both APIs in parallel
      const [dexTokens, geckoTokens] = await Promise.all([
        dexscreenerService.getTrendingTokens(),
        geckoterminalService.getTrendingTokens(),
      ]);

      Logger.info(
        `Fetched: ${dexTokens.length} from DexScreener, ${geckoTokens.length} from GeckoTerminal`
      );

      // Merge duplicates
      const mergedTokens = this.mergeTokens([...dexTokens, ...geckoTokens]);

      Logger.info(`After merging: ${mergedTokens.length} unique tokens`);

      return mergedTokens;
    } catch (error) {
      Logger.error("Failed to aggregate tokens", error);
      return [];
    }
  }

  /**
   * Get tokens with filters, sorting, and pagination
   * From PDF: Support filtering, sorting, cursor pagination
   */
/*  async getTokensPaginated(                    this line
    filters?: TokenFilters,
    sort?: TokenSort,
    pagination?: PaginationParams
  ): Promise<PaginatedTokenResponse> {
    try {
      // Generate cache key from params
      const cacheKey = this.generateCacheKey(filters, sort, pagination);

      // Check cache first
      const cached = await cacheService.getCachedPaginatedTokens(cacheKey);
      if (cached) {
        Logger.debug("Returning cached paginated tokens");
        return { ...cached, cached: true };
      }

      // Get all tokens
      let tokens = await this.getAllTokens();

      // Apply filters
      if (filters) {
        tokens = this.applyFilters(tokens, filters);
      }

      // Apply sorting
      if (sort) {
        tokens = this.applySorting(tokens, sort);
      }

      // Apply pagination
      const paginationParams = pagination || { limit: 30 };
      const paginated = this.applyPagination(tokens, paginationParams);

      const response: PaginatedTokenResponse = {
        success: true,
        data: paginated.data,
        pagination: paginated.pagination,
        filters_applied: filters,
        sort_applied: sort,
        cached: false,
        timestamp: Date.now(),
      };

      // Cache the response
      await cacheService.cachePaginatedTokens(cacheKey, response);

      return response;
    } catch (error) {
      Logger.error("Failed to get paginated tokens", error);
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          limit: 30,
          has_more: false,
        },
        cached: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Merge duplicate tokens from multiple sources
   * From PDF: Merge duplicate tokens intelligently
   */
/*  private mergeTokens(tokens: Token[]): Token[] {     this line
    const tokenMap = new Map<string, Token[]>();

    // Group by token address
    for (const token of tokens) {
      const existing = tokenMap.get(token.token_address) || [];
      existing.push(token);
      tokenMap.set(token.token_address, existing);
    }

    const merged: Token[] = [];

    // Merge tokens with same address
    for (const [address, tokenList] of tokenMap.entries()) {
      if (tokenList.length === 1) {
        // Only one source - keep as is
        merged.push(tokenList[0]);
      } else {
        // Multiple sources - merge them
        const mergedToken = this.mergeTwoTokens(tokenList[0], tokenList[1]);
        merged.push(mergedToken);
      }
    }

    return merged;
  }

  /**
   * Merge two tokens from different sources
   */
/*  private mergeTwoTokens(token1: Token, token2: Token): Token {       this line
    return {
      token_address: token1.token_address,
      token_name: token1.token_name,
      token_ticker: token1.token_ticker,

      // Average prices
      price_sol: (token1.price_sol + token2.price_sol) / 2,
      //price_usd:
       // token1.price_usd && token2.price_usd
         // ? (token1.price_usd + token2.price_usd) / 2
         // : token1.price_usd || token2.price_usd,

      // Take max volume (more reliable)
      volume_sol: Math.max(token1.volume_sol, token2.volume_sol),

      // Average liquidity
      liquidity_sol: (token1.liquidity_sol + token2.liquidity_sol) / 2,

      // Average market cap
      market_cap_sol: (token1.market_cap_sol + token2.market_cap_sol) / 2,

      // Sum transaction counts
      transaction_count: token1.transaction_count + token2.transaction_count,

      // Average price changes
      price_1hr_change: (token1.price_1hr_change + token2.price_1hr_change) / 2,
      price_24hr_change:
        token1.price_24hr_change && token2.price_24hr_change
          ? (token1.price_24hr_change + token2.price_24hr_change) / 2
          : token1.price_24hr_change || token2.price_24hr_change,

      // Combine protocols
      protocol: `${token1.protocol},${token2.protocol}`,

      // Mark as merged
      source: "merged",

      // Use latest timestamp
      last_updated: Math.max(token1.last_updated, token2.last_updated),

      chain: "solana",
     // fdv: token1.fdv || token2.fdv,
    };
  }

  /**
   * Apply filters to token list
   * From PDF: Support filtering by time periods (1h, 24h, 7d)
   */
/*  private applyFilters(tokens: Token[], filters: TokenFilters): Token[] {  this line
    let filtered = [...tokens];

    // Filter by minimum volume
    if (filters.min_volume !== undefined) {
      filtered = filtered.filter((t) => t.volume_sol >= filters.min_volume!);
    }

    // Filter by price change (use appropriate time period)
    if (filters.min_price_change !== undefined) {
      filtered = filtered.filter((t) => {
        const change =
          filters.time_period === "1h"
            ? t.price_1hr_change
            : t.price_24hr_change || t.price_1hr_change;
        return change >= filters.min_price_change!;
      });
    }

    // Filter by minimum market cap
    if (filters.min_market_cap !== undefined) {
      filtered = filtered.filter(
        (t) => t.market_cap_sol >= filters.min_market_cap!
      );
    }

    // Filter by minimum liquidity
    if (filters.min_liquidity !== undefined) {
      filtered = filtered.filter(
        (t) => t.liquidity_sol >= filters.min_liquidity!
      );
    }

    // Filter by protocol
    if (filters.protocol) {
      const protocolLower = filters.protocol.toLowerCase();
      filtered = filtered.filter((t) =>
        t.protocol.toLowerCase().includes(protocolLower)
      );
    }

    // Search by name or ticker
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.token_name.toLowerCase().includes(searchLower) ||
          t.token_ticker.toLowerCase().includes(searchLower)
      );
    }

    Logger.debug(
      `Filters applied: ${tokens.length} → ${filtered.length} tokens`
    );
    return filtered;
  }

  /**
   * Apply sorting to token list
   * From PDF: Sort by various metrics (volume, price change, market cap)
   */
/*  private applySorting(tokens: Token[], sort: TokenSort): Token[] {   this line
    const sorted = [...tokens];

    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sort.metric) {
        case "volume":
          aValue = a.volume_sol;
          bValue = b.volume_sol;
          break;

        case "price_change":
          aValue =
            sort.time_period === "1h"
              ? a.price_1hr_change
              : a.price_24hr_change || a.price_1hr_change;
          bValue =
            sort.time_period === "1h"
              ? b.price_1hr_change
              : b.price_24hr_change || b.price_1hr_change;
          break;

        case "market_cap":
          aValue = a.market_cap_sol;
          bValue = b.market_cap_sol;
          break;

        case "liquidity":
          aValue = a.liquidity_sol;
          bValue = b.liquidity_sol;
          break;

        case "transactions":
          aValue = a.transaction_count;
          bValue = b.transaction_count;
          break;

        default:
          aValue = a.volume_sol;
          bValue = b.volume_sol;
      }

      return sort.order === "asc" ? aValue - bValue : bValue - aValue;
    });

    Logger.debug(`Sorted by ${sort.metric} (${sort.order})`);
    return sorted;
  }

  /**
   * Apply cursor-based pagination
   * From PDF: Support cursor-based pagination (limit/next-cursor)
   */
/*  private applyPagination(         this line
    tokens: Token[],
    params: PaginationParams
  ): { data: Token[]; pagination: any } {
    let startIndex = 0;

    // If cursor provided, find where to start
    if (params.cursor) {
      const cursorIndex = tokens.findIndex(
        (t) => t.token_address === params.cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1; // Start after cursor
      }
    }

    const endIndex = startIndex + params.limit;
    const paginatedData = tokens.slice(startIndex, endIndex);

    // Next cursor = last token's address
    const nextCursor =
      paginatedData.length > 0
        ? paginatedData[paginatedData.length - 1].token_address
        : undefined;

    return {
      data: paginatedData,
      pagination: {
        total: tokens.length,
        limit: params.limit,
        next_cursor: endIndex < tokens.length ? nextCursor : undefined,
        has_more: endIndex < tokens.length,
      },
    };
  }

  /**
   * Generate cache key from params
   */
/*  private generateCacheKey(  this line
    filters?: TokenFilters,
    sort?: TokenSort,
    pagination?: PaginationParams
  ): string {
    const parts = ["tokens"];

    if (filters) {
      parts.push(JSON.stringify(filters));
    }
    if (sort) {
      parts.push(JSON.stringify(sort));
    }
    if (pagination) {
      parts.push(JSON.stringify(pagination));
    }

    return parts.join(":");
  }
}

// Export singleton instance
export const aggregationService = new AggregationService(); */

/*import { Logger } from "../utils/logger"; this line
import { cacheService } from "./cache.service";
import { dexscreenerService } from "./dexscreener.service";
import { geckoterminalService } from "./geckoterminal.service";
import {
  Token,
  TokenFilters,
  TokenSort,
  PaginationParams,
  PaginatedTokenResponse,
  TimePeriod,
} from "../types/token.types";

/**
 * Aggregation Service
 * From PDF: Merge duplicate tokens intelligently
 */
/*export class AggregationService {   this line
  constructor() {
    Logger.info("Aggregation service initialized");
  }

  /**
   * Get all tokens (fetch from APIs and merge)
   * From PDF: Fetch from at least 2 APIs, merge duplicates
   */
/*  async getAllTokens(): Promise<Token[]> {    this line
    try {
      Logger.info("Fetching tokens from all sources...");

      // Fetch from both APIs in parallel
      const [dexTokens, geckoTokens] = await Promise.all([
        dexscreenerService.getTrendingTokens(),
        geckoterminalService.getTrendingTokens(),
      ]);

      Logger.info(
        `Fetched: ${dexTokens.length} from DexScreener, ${geckoTokens.length} from GeckoTerminal`
      );

      // Merge duplicates
      const mergedTokens = this.mergeTokens([...dexTokens, ...geckoTokens]);

      Logger.info(`After merging: ${mergedTokens.length} unique tokens`);

      return mergedTokens;
    } catch (error) {
      Logger.error("Failed to aggregate tokens", error);
      return [];
    }
  }

  /**
   * Get tokens with filters, sorting, and pagination
   * From PDF: Support filtering, sorting, cursor pagination
   */
/*  async getTokensPaginated(   this line
    filters?: TokenFilters,
    sort?: TokenSort,
    pagination?: PaginationParams
  ): Promise<PaginatedTokenResponse> {
    try {
      // Generate cache key from params
      const cacheKey = this.generateCacheKey(filters, sort, pagination);

      // Check cache first
      const cached = await cacheService.getCachedPaginatedTokens(cacheKey);
      if (cached) {
        Logger.debug("Returning cached paginated tokens");
        return { ...cached, cached: true };
      }

      // Get all tokens
      let tokens = await this.getAllTokens();

      // Apply filters
      if (filters) {
        tokens = this.applyFilters(tokens, filters);
      }

      // Apply sorting
      if (sort) {
        tokens = this.applySorting(tokens, sort);
      }

      // Apply pagination
      const paginationParams = pagination || { limit: 30 };
      const paginated = this.applyPagination(tokens, paginationParams);

      const response: PaginatedTokenResponse = {
        success: true,
        data: paginated.data,
        pagination: paginated.pagination,
        filters_applied: filters,
        sort_applied: sort,
        cached: false,
        timestamp: Date.now(),
      };

      // Cache the response
      await cacheService.cachePaginatedTokens(cacheKey, response);

      return response;
    } catch (error) {
      Logger.error("Failed to get paginated tokens", error);
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          limit: 30,
          has_more: false,
        },
        cached: false,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Merge duplicate tokens from multiple sources
   * From PDF: Merge duplicate tokens intelligently
   */
/*  private mergeTokens(tokens: Token[]): Token[] {  this line
    const tokenMap = new Map<string, Token[]>();

    // Group by token address
    for (const token of tokens) {
      if (!token || !token.token_address) continue; // Safety check
      const existing = tokenMap.get(token.token_address) || [];
      existing.push(token);
      tokenMap.set(token.token_address, existing);
    }

    const merged: Token[] = [];

    // Merge all tokens with the same address
    for (const tokenList of tokenMap.values()) {
      merged.push(this.mergeTokenList(tokenList));
    }

    return merged;
  }

  /**
   * Helper to merge a list of duplicate tokens into one
   */
/*  private mergeTokenList(tokenList: Token[]): Token {  this line
    // If only one, return it immediately
    if (tokenList.length === 1) {
      return tokenList[0];
    }

    const base = tokenList[0]; // Use first token for static data
    const count = tokenList.length;

    // Helper to average valid numbers from a list
    const average = (key: keyof Token): number => {
      const values = tokenList
        .map((t) => t[key] as number | undefined)
        .filter((v) => typeof v === "number") as number[];
      if (values.length === 0) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    return {
      token_address: base.token_address,
      token_name: base.token_name,
      token_ticker: base.token_ticker,

      // Average prices
      price_sol: average("price_sol"),

      // Take max volume (more reliable)
      volume_sol: Math.max(...tokenList.map((t) => t.volume_sol || 0)),

      // Average liquidity
      liquidity_sol: average("liquidity_sol"),

      // Average market cap
      market_cap_sol: average("market_cap_sol"),

      // Sum transaction counts
      transaction_count: tokenList.reduce(
        (acc, t) => acc + (t.transaction_count || 0),
        0
      ),

      // Average price changes
      price_1hr_change: average("price_1hr_change"),
      price_24hr_change: average("price_24hr_change"),

      // Combine protocols and remove duplicates
      protocol: [
        ...new Set(tokenList.map((t) => t.protocol.toLowerCase())),
      ].join(","),

      // Mark as merged
      source: "merged",

      // Use latest timestamp
      last_updated: Math.max(...tokenList.map((t) => t.last_updated || 0)),

      chain: "solana",
    };
  }

  /**
   * Apply filters to token list
   * From PDF: Support filtering by time periods (1h, 24h, 7d)
   */
/*  private applyFilters(tokens: Token[], filters: TokenFilters): Token[] {  this line
    let filtered = [...tokens];

    // Filter by minimum volume
    if (filters.min_volume !== undefined) {
      filtered = filtered.filter((t) => t.volume_sol >= filters.min_volume!);
    }

    // Filter by price change (use appropriate time period)
    if (filters.min_price_change !== undefined) {
      filtered = filtered.filter((t) => {
        const change =
          filters.time_period === "1h"
            ? t.price_1hr_change
            : t.price_24hr_change || t.price_1hr_change;
        return change >= filters.min_price_change!;
      });
    }

    // Filter by minimum market cap
    if (filters.min_market_cap !== undefined) {
      filtered = filtered.filter(
        (t) => t.market_cap_sol >= filters.min_market_cap!
      );
    }

    // Filter by minimum liquidity
    if (filters.min_liquidity !== undefined) {
      filtered = filtered.filter(
        (t) => t.liquidity_sol >= filters.min_liquidity!
      );
    }

    // Filter by protocol
    if (filters.protocol) {
      const protocolLower = filters.protocol.toLowerCase();
      filtered = filtered.filter((t) =>
        t.protocol.toLowerCase().includes(protocolLower)
      );
    }

    // Search by name or ticker
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.token_name.toLowerCase().includes(searchLower) ||
          t.token_ticker.toLowerCase().includes(searchLower)
      );
    }

    Logger.debug(
      `Filters applied: ${tokens.length} → ${filtered.length} tokens`
    );
    return filtered;
  }

  /**
   * Apply sorting to token list
   * From PDF: Sort by various metrics (volume, price change, market cap)
   */
/*  private applySorting(tokens: Token[], sort: TokenSort): Token[] { this line
    const sorted = [...tokens];

    sorted.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sort.metric) {
        case "volume":
          aValue = a.volume_sol;
          bValue = b.volume_sol;
          break;

        case "price_change":
          aValue =
            sort.time_period === "1h"
              ? a.price_1hr_change
              : a.price_24hr_change || a.price_1hr_change;
          bValue =
            sort.time_period === "1h"
              ? b.price_1hr_change
              : b.price_24hr_change || b.price_1hr_change;
          break;

        case "market_cap":
          aValue = a.market_cap_sol;
          bValue = b.market_cap_sol;
          break;

        case "liquidity":
          aValue = a.liquidity_sol;
          bValue = b.liquidity_sol;
          break;

        case "transactions":
          aValue = a.transaction_count;
          bValue = b.transaction_count;
          break;

        default:
          aValue = a.volume_sol;
          bValue = b.volume_sol;
      }

      // Handle null/undefined values in sorting
      aValue = aValue || 0;
      bValue = bValue || 0;

      return sort.order === "asc" ? aValue - bValue : bValue - aValue;
    });

    Logger.debug(`Sorted by ${sort.metric} (${sort.order})`);
    return sorted;
  }

  /**
   * Apply cursor-based pagination
   * From PDF: Support cursor-based pagination (limit/next-cursor)
   */
/*  private applyPagination(
    tokens: Token[],
    params: PaginationParams
  ): { data: Token[]; pagination: any } {
    let startIndex = 0;

    // If cursor provided, find where to start
    if (params.cursor) {
      const cursorIndex = tokens.findIndex(
        (t) => t.token_address === params.cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1; // Start after cursor
      }
    }

    const endIndex = startIndex + params.limit;
    const paginatedData = tokens.slice(startIndex, endIndex);

    // Next cursor = last token's address
    const nextCursor =
      paginatedData.length > 0
        ? paginatedData[paginatedData.length - 1].token_address
        : undefined;

    return {
      data: paginatedData,
      pagination: {
        total: tokens.length,
        limit: params.limit,
        next_cursor: endIndex < tokens.length ? nextCursor : undefined,
        has_more: endIndex < tokens.length,
      },
    };
  }

  /**
   * Generate cache key from params
   */
/*  private generateCacheKey(
    filters?: TokenFilters,
    sort?: TokenSort,
    pagination?: PaginationParams
  ): string {
    const parts = ["tokens"];

    if (filters) {
      parts.push(JSON.stringify(filters));
    }
    if (sort) {
      parts.push(JSON.stringify(sort));
    }
    if (pagination) {
      parts.push(JSON.stringify(pagination));
    }

    // Simple hash to keep key length manageable
    return parts.join(":");
  }
}

// Export singleton instance
export const aggregationService = new AggregationService();*/
import { Logger } from "../utils/logger";
import { cacheService } from "./cache.service";
import { dexscreenerService } from "./dexscreener.service";
import { geckoterminalService } from "./geckoterminal.service";
import {
  Token,
  TokenFilters,
  TokenSort,
  PaginationParams,
  PaginatedTokenResponse,
  TimePeriod,
} from "../types/token.types";

/**
 * Aggregation Service
 * Fetches, merges, and caches token data from multiple sources.
 * In the new architecture, this service relies 100% on the WebSocketService
 * to proactively keep the 'master_token_list' cache populated.
 */
export class AggregationService {
  constructor() {
    Logger.info("Aggregation service initialized");
  }
  /**
   * Get tokens with filters, sorting, and pagination
   * This is the main function called by the API route.
   */

  async getTokensPaginated(
    filters?: TokenFilters,
    sort?: TokenSort,
    pagination?: PaginationParams
  ): Promise<PaginatedTokenResponse> {
    try {
      // 1. Get the MASTER list of all tokens from the cache.
      // It relies on the WebSocketService to keep this cache fresh.
      let tokens = await this.getTokensFromMasterCache(); // 2. Apply filters (this is now fast, in-memory)
      // If the cache is empty, we still proceed with an empty list.
      // The frontend will likely show an empty state or a loading spinner.

      if (filters) {
        tokens = this.applyFilters(tokens, filters);
      } // 3. Apply sorting (fast, in-memory)

      if (sort) {
        tokens = this.applySorting(tokens, sort);
      } // 4. Apply pagination (fast, in-memory)

      const paginationParams = pagination || { limit: 30 };
      const paginated = this.applyPagination(tokens, paginationParams); // 5. Build the final response

      const response: PaginatedTokenResponse = {
        success: true,
        data: paginated.data,
        pagination: paginated.pagination,
        filters_applied: filters,
        sort_applied: sort,
        cached: true, // This response is always built from the master cache
        timestamp: Date.now(),
      };

      return response;
    } catch (error) {
      Logger.error("Failed to get paginated tokens", error as Error);
      return {
        success: false,
        data: [],
        pagination: { total: 0, limit: 30, has_more: false },
        cached: false,
        timestamp: Date.now(),
      };
    }
  }  // --- NEW CACHE RETRIEVAL FUNCTION ---
  /**
   * Gets the master list of all tokens, *ONLY* from the cache.
   * This function relies on the WebSocketService to replenish the cache.
   * It will *NEVER* call external APIs.
   */

  private async getTokensFromMasterCache(): Promise<Token[]> {
    const cacheKey = "master_token_list";

    try {
      // 1. Try to get the master list from cache
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        Logger.debug(
          "Returning MASTER token list from cache (API call avoided)"
        );
        return cachedData as Token[];
      }
    } catch (err) {
      Logger.error("Failed to read from cache", err as Error); // Fall through to return empty list if cache read fails
    } // 2. Cache miss: Rely on WebSocketService to replenish. // Return an empty array to prevent a duplicate API fetch.

    Logger.warn(
      "Master cache miss/expired. Returning empty list. WebSocket service is responsible for replenishment."
    );
    return [];
  }
  /**
   * Fetches from all APIs and merges. This is the "worker"
   * function called *ONLY* by the WebSocketService.
   */

  async getAllTokens(): Promise<Token[]> {
    try {
      Logger.info("Fetching tokens from all sources...");

      const [dexTokens, geckoTokens] = await Promise.all([
        dexscreenerService.getTrendingTokens(),
        geckoterminalService.getTrendingTokens(),
      ]);

      Logger.info(
        `Fetched: ${dexTokens.length} from DexScreener, ${geckoTokens.length} from GeckoTerminal`
      ); // This now calls the VWAP merge function

      const mergedTokens = this.mergeTokensVWAP([...dexTokens, ...geckoTokens]);

      Logger.info(`After merging: ${mergedTokens.length} unique tokens`);
      return mergedTokens;
    } catch (error) {
      Logger.error("Failed to aggregate tokens", error as Error);
      return [];
    }
  }
  /**
   * Merge duplicate tokens using Volume-Weighted Average Price (VWAP)
   */

  private mergeTokensVWAP(tokens: Token[]): Token[] {
    const tokenMap = new Map<string, Token[]>(); // Group by token address

    for (const token of tokens) {
      if (!token || !token.token_address) continue;
      const existing = tokenMap.get(token.token_address) || [];
      existing.push(token);
      tokenMap.set(token.token_address, existing);
    }

    const merged: Token[] = []; // Merge all tokens with the same address

    for (const tokenList of tokenMap.values()) {
      merged.push(this.mergeTokenListVWAP(tokenList));
    }

    return merged;
  }  // --- NEW VWAP MERGE LOGIC ---
  /**
   * Helper to merge a list of duplicate tokens into ONE, using VWAP.
   */

  private mergeTokenListVWAP(tokenList: Token[]): Token {
    if (tokenList.length === 1) {
      return tokenList[0];
    }

    const base = tokenList[0]; // For static data like name, ticker

    let totalVolume = 0;
    let totalLiquidity = 0;
    let totalMarketCap = 0;
    let totalTransactions = 0; // Numerators for VWAP calculations

    let priceVolSum = 0;
    let price1hrChangeVolSum = 0;
    let price24hrChangeVolSum = 0;

    for (const token of tokenList) {
      const vol = token.volume_sol || 0; // Sum total metrics

      totalVolume += vol;
      totalLiquidity += token.liquidity_sol || 0;
      totalMarketCap += token.market_cap_sol || 0;
      totalTransactions += token.transaction_count || 0; // Add to VWAP numerators // (Price_A * Volume_A) + (Price_B * Volume_B) ...

      priceVolSum += (token.price_sol || 0) * vol;
      price1hrChangeVolSum += (token.price_1hr_change || 0) * vol;
      price24hrChangeVolSum += (token.price_24hr_change || 0) * vol;
    } // Calculate VWAP values (handle divide-by-zero)

    const vwapPrice = totalVolume === 0 ? 0 : priceVolSum / totalVolume;
    const vwap1hrChange =
      totalVolume === 0 ? 0 : price1hrChangeVolSum / totalVolume;
    const vwap24hrChange =
      totalVolume === 0 ? 0 : price24hrChangeVolSum / totalVolume;

    return {
      token_address: base.token_address,
      token_name: base.token_name,
      token_ticker: base.token_ticker, // Use VWAP for price

      price_sol: vwapPrice, // Use SUM for total metrics

      volume_sol: totalVolume,
      liquidity_sol: totalLiquidity,
      market_cap_sol: totalMarketCap,
      transaction_count: totalTransactions, // Use VWAP for price changes

      price_1hr_change: vwap1hrChange,
      price_24hr_change: vwap24hrChange, // Combine metadata

      protocol: [
        ...new Set(tokenList.map((t) => t.protocol.toLowerCase())),
      ].join(", "),
      source: "merged",
      last_updated: Math.max(...tokenList.map((t) => t.last_updated || 0)),
      chain: "solana",
    };
  }
  /**
   * Apply filters to token list
   */

  private applyFilters(tokens: Token[], filters: TokenFilters): Token[] {
    let filtered = [...tokens]; // Filter by minimum volume

    if (filters.min_volume !== undefined) {
      filtered = filtered.filter((t) => t.volume_sol >= filters.min_volume!);
    } // Filter by price change (REMOVED 7d LOGIC)

    if (filters.min_price_change !== undefined) {
      filtered = filtered.filter((t) => {
        const change =
          filters.time_period === "24h"
            ? t.price_24hr_change
            : t.price_1hr_change; // Default to 1h
        return (change || 0) >= filters.min_price_change!;
      });
    } // Filter by minimum market cap

    if (filters.min_market_cap !== undefined) {
      filtered = filtered.filter(
        (t) => t.market_cap_sol >= filters.min_market_cap!
      );
    } // Filter by minimum liquidity

    if (filters.min_liquidity !== undefined) {
      filtered = filtered.filter(
        (t) => t.liquidity_sol >= filters.min_liquidity!
      );
    } // Filter by protocol

    if (filters.protocol) {
      const protocolLower = filters.protocol.toLowerCase();
      filtered = filtered.filter((t) =>
        t.protocol.toLowerCase().includes(protocolLower)
      );
    } // Search by name or ticker

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.token_name.toLowerCase().includes(searchLower) ||
          t.token_ticker.toLowerCase().includes(searchLower)
      );
    }

    Logger.debug(
      `Filters applied: ${tokens.length} → ${filtered.length} tokens`
    );
    return filtered;
  }
  /**
   * Apply sorting to token list
   */

  private applySorting(tokens: Token[], sort: TokenSort): Token[] {
    const sorted = [...tokens];

    sorted.sort((a, b) => {
      let aValue: number | undefined;
      let bValue: number | undefined;

      switch (sort.metric) {
        case "volume":
          aValue = a.volume_sol;
          bValue = b.volume_sol;
          break;

        case "price_change": // (REMOVED 7d LOGIC)
          aValue =
            sort.time_period === "24h"
              ? a.price_24hr_change
              : a.price_1hr_change;
          bValue =
            sort.time_period === "24h"
              ? b.price_24hr_change
              : b.price_1hr_change;
          break;

        case "market_cap":
          aValue = a.market_cap_sol;
          bValue = b.market_cap_sol;
          break;

        case "liquidity":
          aValue = a.liquidity_sol;
          bValue = b.liquidity_sol;
          break;

        case "transactions":
          aValue = a.transaction_count;
          bValue = b.transaction_count;
          break;

        default:
          aValue = a.volume_sol;
          bValue = b.volume_sol;
      } // Handle null/undefined values

      const valA = aValue || 0;
      const valB = bValue || 0;

      return sort.order === "asc" ? valA - valB : valB - valA;
    });

    Logger.debug(`Sorted by ${sort.metric} (${sort.order})`);
    return sorted;
  }
  /**
   * Apply cursor-based pagination
   */

  private applyPagination(
    tokens: Token[],
    params: PaginationParams
  ): { data: Token[]; pagination: any } {
    let startIndex = 0;

    if (params.cursor) {
      const cursorIndex = tokens.findIndex(
        (t) => t.token_address === params.cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1; // Start *after* the cursor
      }
    }

    const endIndex = startIndex + params.limit;
    const paginatedData = tokens.slice(startIndex, endIndex);

    const nextCursor =
      paginatedData.length > 0 && endIndex < tokens.length
        ? paginatedData[paginatedData.length - 1].token_address
        : undefined;

    return {
      data: paginatedData,
      pagination: {
        total: tokens.length,
        limit: params.limit,
        next_cursor: nextCursor,
        has_more: endIndex < tokens.length,
      },
    };
  }
}

// Export singleton instance
export const aggregationService = new AggregationService();