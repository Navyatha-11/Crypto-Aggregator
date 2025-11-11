// ============================================
// TOKEN DATA STRUCTURE (From PDF)
// ============================================

/*export interface Token {  this line
  token_address: string; // Unique Solana address (44 chars)
  token_name: string; // "PIPE CTO"
  token_ticker: string; // "PIPE"
  price_sol: number; // Price in SOL (e.g., 4.4141209798877615e-7)
  market_cap_sol: number; // Market cap in SOL
  volume_sol: number; // 24h volume in SOL
  liquidity_sol: number; // Liquidity in SOL
  transaction_count: number; // Total transactions
  price_1hr_change: number; // 1-hour price change %
  protocol: string; // "Raydium CLMM", "Orca Whirlpool"

  // Additional fields for system (not in PDF but needed)
  price_24hr_change?: number; // 24-hour price change % (for filtering)
  price_7d_change?: number; // 7-day price change % (for filtering)
  volume_1hr?: number; // 1-hour volume
  volume_7d?: number; // 7-day volume
  source?: "dexscreener" | "geckoterminal" | "merged";
  last_updated: number; // Timestamp
  chain?: string; // "solana"
}

// ============================================
// FILTERING & SORTING (From PDF Requirements)
// ============================================

// Time periods for filtering
export type TimePeriod = "1h" | "24h" | "7d";

// Sort metrics (from PDF: volume, price change, market cap)
export type SortMetric =
  | "volume" // Sort by volume_sol
  | "price_change" // Sort by price_1hr_change (or 24h/7d based on filter)
  | "market_cap" // Sort by market_cap_sol
  | "liquidity" // Sort by liquidity_sol
  | "transactions"; // Sort by transaction_count

// Sort order
export type SortOrder = "asc" | "desc";

// Filter parameters
export interface TokenFilters {
  time_period?: TimePeriod; // '1h' | '24h' | '7d'
  min_volume?: number; // Minimum volume threshold
  min_price_change?: number; // Minimum price change %
  min_market_cap?: number; // Minimum market cap
  min_liquidity?: number; // Minimum liquidity
  protocol?: string; // Filter by protocol name
  search?: string; // Search token name or ticker
}

// Sort parameters
export interface TokenSort {
  metric: SortMetric; // What to sort by
  order: SortOrder; // 'asc' or 'desc'
  time_period?: TimePeriod; // Which time period to use for sorting
}

// Pagination (cursor-based, from PDF)
export interface PaginationParams {
  limit: number; // 20-30 tokens per page (from PDF)
  cursor?: string; // Token address to start from
}

// Complete query parameters
export interface TokenQueryParams {
  filters?: TokenFilters;
  sort?: TokenSort;
  pagination: PaginationParams;
}

// ============================================
// API RESPONSES
// ============================================

// Paginated response (with cursor)
export interface PaginatedTokenResponse {
  success: boolean;
  data: Token[];
  pagination: {
    total: number;
    limit: number;
    next_cursor?: string; // Next page cursor (null = last page)
    has_more: boolean;
  };
  filters_applied?: TokenFilters;
  sort_applied?: TokenSort;
  cached: boolean; // Was response from cache?
  timestamp: number;
}

// Generic API response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: number;
}

// ============================================
// RAW API STRUCTURES (DexScreener)
// ============================================

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

export interface DexScreenerPair {
  chainId: string; // "solana"
  dexId: string; // "raydium", "orca"
  pairAddress: string;
  baseToken: {
    address: string; // This is our token_address
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string; // Usually "SOL"
  };
  priceNative?: string; // Price in SOL (as string!)
  priceUsd?: string; // Price in USD
  volume?: {
    h1?: number; // 1-hour volume in USD
    h24?: number; // 24-hour volume in USD
  };
  priceChange?: {
    h1?: number; // 1-hour % change
    h24?: number; // 24-hour % change
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number; // Liquidity in SOL
  };
  fdv?: number; // Fully Diluted Valuation
  marketCap?: number; // Market cap in USD
  txns?: {
    h1?: {
      buys: number;
      sells: number;
    };
    h24?: {
      buys: number;
      sells: number;
    };
  };
  pairCreatedAt?: number;
}

// ============================================
// RAW API STRUCTURES (GeckoTerminal)
// ============================================

export interface GeckoTerminalResponse {
  data: GeckoTerminalPool[];
}

export interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    base_token_address: string; // This is our token_address
    base_token_symbol: string;
    base_token_name?: string;
    quote_token_symbol: string; // Usually "SOL"
    base_token_price_native_currency?: string; // Price in SOL
    base_token_price_usd?: string;
    volume_usd?: {
      h1?: string;
      h24?: string;
    };
    price_change_percentage?: {
      h1?: string;
      h24?: string;
    };
    reserve_in_usd?: string; // Liquidity
    market_cap_usd?: string;
    pool_created_at?: string;
    transactions?: {
      h24?: {
        buys?: number;
        sells?: number;
      };
    };
  };
}

// ============================================
// WEBSOCKET MESSAGES
// ============================================

// Message types for WebSocket
export type WebSocketMessageType =
  | "token_update" // Price/volume changed
  | "initial_data" // First data load
  | "filter_update" // Filtered data
  | "error"; // Error message

// WebSocket message structure
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: Token[] | Token;
  error?: string;
  timestamp: number;
}

// Update event (for internal use)
export interface TokenUpdateEvent {
  token_address: string;
  old_price: number;
  new_price: number;
  price_change_percent: number;
  volume_spike?: boolean; // Volume increased significantly
  timestamp: number;
} */
// ============================================
// EXACT TOKEN STRUCTURE FROM PDF
// ============================================

// ============================================
// EXACT TOKEN STRUCTURE FROM PDF
// ============================================

export interface Token {
  token_address: string;           // Solana address
  token_name: string;               // Full name: "PIPE CTO"
  token_ticker: string;             // Symbol: "PIPE"
  price_sol: number;                // Price in SOL
  market_cap_sol: number;           // Market cap in SOL
  volume_sol: number;               // 24h volume in SOL (default timeframe)
  liquidity_sol: number;            // Liquidity in SOL
  transaction_count: number;        // Total transactions (buys + sells)
  price_1hr_change: number;         // 1-hour price change %
  protocol: string;                 // "Raydium CLMM", "Orca Whirlpool", etc.
  
  // Additional fields for filtering/sorting (not in PDF but needed)
  price_24hr_change?: number;       // For 24h filtering
  volume_1hr_sol?: number;          // For 1h filtering
  volume_24hr_sol?: number;         // For 24h filtering
  price_usd?: number;               // Keep USD for reference
  
  // System metadata
  source?: 'dexscreener' | 'geckoterminal' | 'merged';
  last_updated: number;
  chain?: string;
}

// ============================================
// FILTERING & SORTING (From PDF Requirements)
// ============================================

export type TimePeriod = '1h' | '24h' | '7d';

export type SortMetric = 
  | 'volume'           // Sort by volume_sol
  | 'price_change'     // Sort by price change %
  | 'market_cap'       // Sort by market_cap_sol
  | 'liquidity'        // Sort by liquidity_sol
  | 'transactions';    // Sort by transaction_count

export type SortOrder = 'asc' | 'desc';

export interface TokenFilters {
  time_period?: TimePeriod;
  min_volume?: number;
  min_price_change?: number;
  min_market_cap?: number;
  min_liquidity?: number;
  protocol?: string;
  search?: string;
}

export interface TokenSort {
  metric: SortMetric;
  order: SortOrder;
  time_period?: TimePeriod;
}

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface TokenQueryParams {
  filters?: TokenFilters;
  sort?: TokenSort;
  pagination: PaginationParams;
}

export interface PaginatedTokenResponse {
  success: boolean;
  data: Token[];
  pagination: {
    total: number;
    limit: number;
    next_cursor?: string;
    has_more: boolean;
  };
  filters_applied?: TokenFilters;
  sort_applied?: TokenSort;
  cached: boolean;
  timestamp: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: number;
}

// ============================================
// RAW API STRUCTURES
// ============================================

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerPair[];
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    symbol: string;
  };
  priceNative?: string;            // Price in quote token (SOL) - STRING!
  priceUsd?: string;
  volume?: {
    h1?: number;                   // 1h volume in USD
    h24?: number;                  // 24h volume in USD
  };
  priceChange?: {
    h1?: number;                   // 1h % change
    h24?: number;                  // 24h % change
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;                // Liquidity in quote token (SOL)
  };
  marketCap?: number;              // Market cap in USD
  txns?: {
    h1?: {
      buys: number;
      sells: number;
    };
    h24?: {
      buys: number;
      sells: number;
    };
  };
  fdv?: number;
  pairCreatedAt?: number;
}

export interface GeckoTerminalResponse {
  data: GeckoTerminalPool[];
}

export interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    base_token_address: string;
    base_token_symbol: string;
    base_token_name?: string;
    base_token_price_native_currency?: string;  // Price in native (SOL) - STRING!
    base_token_price_usd?: string;
    volume_usd?: {
      h1?: string;                 // 1h volume in USD - STRING!
      h24?: string;                // 24h volume in USD - STRING!
    };
    price_change_percentage?: {
      h1?: string;                 // 1h % change - STRING!
      h24?: string;                // 24h % change - STRING!
    };
    reserve_in_usd?: string;       // Liquidity in USD - STRING!
    market_cap_usd?: string;
    pool_created_at?: string;
    transactions?: {
      h24?: {
        buys?: number;
        sells?: number;
      };
    };
  };
}

// ============================================
// WEBSOCKET MESSAGES
// ============================================

export type WebSocketMessageType = 
  | 'token_update'
  | 'initial_data'
  | 'filter_update'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: Token[] | Token;
  error?: string;
  timestamp: number;
}

export interface TokenUpdateEvent {
  token_address: string;
  old_price: number;
  new_price: number;
  price_change_percent: number;
  volume_spike?: boolean;
  timestamp: number;
}