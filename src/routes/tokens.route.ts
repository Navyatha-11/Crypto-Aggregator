import { Router, Request, Response } from "express";
import { Logger } from "../utils/logger";
import { aggregationService } from "../services/aggregation.service";
import { cacheService } from "../services/cache.service";
import { config } from "../config/env";
import {
  TokenFilters,
  TokenSort,
  PaginationParams,
  TimePeriod,
  SortMetric,
  SortOrder,
} from "../types/token.types";

const router = Router();

/**
 * GET /api/tokens
 * Get tokens with optional filters, sorting, and pagination
 *
 * Query Parameters:
 * - time_period: '1h' | '24h' | '7d'
 * - sort_by: 'volume' | 'price_change' | 'market_cap' | 'liquidity' | 'transactions'
 * - sort_order: 'asc' | 'desc'
 * - limit: number (default: 30, max: 100)
 * - cursor: string (token address to start from)
 * - min_volume: number
 * - min_price_change: number
 * - min_market_cap: number
 * - min_liquidity: number
 * - protocol: string
 * - search: string
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    Logger.info("GET /api/tokens", { query: req.query });

    // Parse filters
    const filters: TokenFilters = {};

    if (req.query.time_period) {
      filters.time_period = req.query.time_period as TimePeriod;
    }
    if (req.query.min_volume) {
      filters.min_volume = parseFloat(req.query.min_volume as string);
    }
    if (req.query.min_price_change) {
      filters.min_price_change = parseFloat(
        req.query.min_price_change as string
      );
    }
    if (req.query.min_market_cap) {
      filters.min_market_cap = parseFloat(req.query.min_market_cap as string);
    }
    if (req.query.min_liquidity) {
      filters.min_liquidity = parseFloat(req.query.min_liquidity as string);
    }
    if (req.query.protocol) {
      filters.protocol = req.query.protocol as string;
    }
    if (req.query.search) {
      filters.search = req.query.search as string;
    }

    // Parse sorting
    let sort: TokenSort | undefined;
    if (req.query.sort_by) {
      sort = {
        metric: req.query.sort_by as SortMetric,
        order: (req.query.sort_order as SortOrder) || "desc",
        time_period: filters.time_period,
      };
    }

    // Parse pagination
    const limit = Math.min(
      parseInt(req.query.limit as string) || config.pagination.defaultLimit,
      config.pagination.maxLimit
    );

    const pagination: PaginationParams = {
      limit,
      cursor: req.query.cursor as string,
    };

    // Get tokens
    const result = await aggregationService.getTokensPaginated(
      Object.keys(filters).length > 0 ? filters : undefined,
      sort,
      pagination
    );

    res.json(result);
  } catch (error) {
    Logger.error("GET /api/tokens error", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/tokens/trending
 * Get trending tokens (shortcut endpoint)
 */
router.get("/trending", async (req: Request, res: Response) => {
  try {
    Logger.info("GET /api/tokens/trending");

    const result = await aggregationService.getTokensPaginated(
      undefined,
      { metric: "volume", order: "desc", time_period: "24h" },
      { limit: 30 }
    );

    res.json(result);
  } catch (error) {
    Logger.error("GET /api/tokens/trending error", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/tokens/gainers
 * Get biggest price gainers
 */
router.get("/gainers", async (req: Request, res: Response) => {
  try {
    const timePeriod = (req.query.time_period as TimePeriod) || "24h";

    Logger.info("GET /api/tokens/gainers", { time_period: timePeriod });

    const result = await aggregationService.getTokensPaginated(
      { time_period: timePeriod, min_price_change: 0 },
      { metric: "price_change", order: "desc", time_period: timePeriod },
      { limit: 30 }
    );

    res.json(result);
  } catch (error) {
    Logger.error("GET /api/tokens/gainers error", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/tokens/losers
 * Get biggest price losers
 */
router.get("/losers", async (req: Request, res: Response) => {
  try {
    const timePeriod = (req.query.time_period as TimePeriod) || "24h";

    Logger.info("GET /api/tokens/losers", { time_period: timePeriod });

    const result = await aggregationService.getTokensPaginated(
      { time_period: timePeriod },
      { metric: "price_change", order: "asc", time_period: timePeriod },
      { limit: 30 }
    );

    res.json(result);
  } catch (error) {
    Logger.error("GET /api/tokens/losers error", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now(),
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const cacheHealthy = await cacheService.isHealthy();
    const cacheStats = await cacheService.getStats();

    res.json({
      status: "ok",
      timestamp: Date.now(),
      cache: {
        healthy: cacheHealthy,
        ...cacheStats,
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: "Service unavailable",
      timestamp: Date.now(),
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear cache (for testing/admin)
 */
router.post("/cache/clear", async (req: Request, res: Response) => {
  try {
    Logger.info("POST /api/cache/clear");

    await cacheService.invalidateTokenCache();

    res.json({
      success: true,
      message: "Cache cleared",
      timestamp: Date.now(),
    });
  } catch (error) {
    Logger.error("POST /api/cache/clear error", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear cache",
      timestamp: Date.now(),
    });
  }
});

export default router;
