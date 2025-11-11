import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { Logger } from "../utils/logger";
import { aggregationService } from "./aggregation.service";
import { config } from "../config/env";
import {
  Token,
  WebSocketMessage,
  TokenUpdateEvent,
} from "../types/token.types";
import { cacheService } from "./cache.service"; // <--- THE FIX: New Import

/**
 * WebSocket Service for real-time updates
 * This service is now the proactive "data pusher" and "cache filler."
 */
export class WebSocketService {
  private io: SocketIOServer;
  private updateInterval: NodeJS.Timeout | null = null;
  private previousTokens: Map<string, Token> = new Map();

  constructor(httpServer: HTTPServer) {
    // Initialize Socket.IO
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // In production, specify your frontend domain
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
    Logger.info("WebSocket service initialized");
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      Logger.info(`Client connected: ${socket.id}`);

      // Send initial data
      this.sendInitialData(socket.id);

      // Handle client disconnection
      socket.on("disconnect", () => {
        Logger.info(`Client disconnected: ${socket.id}`);
      });

      // Handle filter requests from client
      socket.on("filter", async (params) => {
        Logger.debug(`Filter request from ${socket.id}`, params);
        await this.handleFilterRequest(socket.id, params);
      });

      // Handle ping (for connection keep-alive)
      socket.on("ping", () => {
        socket.emit("pong");
      });
    });
  }

  /**
   * Send initial data to newly connected client
   * From PDF: Initial data load followed by WebSocket updates
   */
  private async sendInitialData(socketId: string): Promise<void> {
    try {
      // This is now guaranteed to pull fresh data from the cache
      const result = await aggregationService.getTokensPaginated(
        undefined,
        { metric: "volume", order: "desc", time_period: "24h" },
        { limit: 30 }
      );

      const message: WebSocketMessage = {
        type: "initial_data",
        data: result.data,
        timestamp: Date.now(),
      };

      this.io.to(socketId).emit("message", message);
      Logger.debug(
        `Initial data sent to ${socketId}: ${result.data.length} tokens`
      );

      // Store tokens for comparison
      result.data.forEach((token) => {
        this.previousTokens.set(token.token_address, token);
      });
    } catch (error) {
      Logger.error("Failed to send initial data", error as Error);
      this.sendError(socketId, "Failed to load initial data");
    }
  }

  /**
   * Handle filter request from client
   */
  private async handleFilterRequest(
    socketId: string,
    params: any
  ): Promise<void> {
    try {
      const result = await aggregationService.getTokensPaginated(
        params.filters,
        params.sort,
        params.pagination
      );

      const message: WebSocketMessage = {
        type: "filter_update",
        data: result.data,
        timestamp: Date.now(),
      };

      this.io.to(socketId).emit("message", message);
      Logger.debug(
        `Filter update sent to ${socketId}: ${result.data.length} tokens`
      );
    } catch (error) {
      Logger.error("Failed to handle filter request", error as Error);
      this.sendError(socketId, "Failed to apply filters");
    }
  }

  /**
   * Start periodic updates
   * From PDF: WebSocket update interval (30s default)
   */
  startPeriodicUpdates(): void {
    if (this.updateInterval) {
      Logger.warn("Periodic updates already running");
      return;
    }

    // <--- THE FIX: Sync with cache TTL ---
    const interval = config.cache.ttl * 1000; // Use cache TTL for interval

    Logger.info(`Starting periodic updates (every ${interval}ms)`);

    // Run once immediately to prime the cache
    this.checkAndBroadcastUpdates();

    // Then set the recurring interval
    this.updateInterval = setInterval(async () => {
      await this.checkAndBroadcastUpdates();
    }, interval);
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      Logger.info("Periodic updates stopped");
    }
  }

  /**
   * Check for price/volume changes and broadcast updates
   */
  private async checkAndBroadcastUpdates(): Promise<void> {
    try {
      Logger.debug("Checking for token updates...");

      // Fetch latest tokens (This is the one API call every 30s)
      const tokens = await aggregationService.getAllTokens();

      // <--- THE FIX: Save fresh data to the master cache ---
      void cacheService.set("master_token_list", tokens, config.cache.ttl);

      const updates: TokenUpdateEvent[] = [];

      // Compare with previous state
      for (const token of tokens) {
        const previous = this.previousTokens.get(token.token_address);

        if (!previous) {
          // New token appeared
          this.previousTokens.set(token.token_address, token);
          continue;
        }

        // Check for price change (>1%)
        const priceChangePercent =
          previous.price_sol === 0
            ? 0
            : Math.abs(
                ((token.price_sol - previous.price_sol) / previous.price_sol) *
                  100
              );

        if (priceChangePercent >= 1) {
          updates.push({
            token_address: token.token_address,
            old_price: previous.price_sol,
            new_price: token.price_sol,
            price_change_percent: priceChangePercent,
            timestamp: Date.now(),
          });
        }

        // Check for volume spike (>50% increase)
        const volumeIncrease =
          previous.volume_sol === 0
            ? 0
            : ((token.volume_sol - previous.volume_sol) / previous.volume_sol) *
              100;

        if (volumeIncrease >= 50) {
          updates.push({
            token_address: token.token_address,
            old_price: previous.price_sol,
            new_price: token.price_sol,
            price_change_percent: priceChangePercent,
            volume_spike: true,
            timestamp: Date.now(),
          });
        }

        // Update stored token
        this.previousTokens.set(token.token_address, token);
      }

      // Broadcast updates if any
      if (updates.length > 0) {
        Logger.info(`Broadcasting ${updates.length} token updates`);
        this.broadcastTokenUpdates(
          tokens.filter((t) =>
            updates.some((u) => u.token_address === t.token_address)
          )
        );
      } else {
        Logger.debug("No significant updates detected");
      }
    } catch (error) {
      Logger.error("Failed to check for updates", error as Error);
    }
  }

  /**
   * Broadcast token updates to all connected clients
   */
  private broadcastTokenUpdates(tokens: Token[]): void {
    const message: WebSocketMessage = {
      type: "token_update",
      data: tokens,
      timestamp: Date.now(),
    };

    this.io.emit("message", message);
    Logger.debug(`Broadcast sent to ${this.io.sockets.sockets.size} clients`);
  }

  /**
   * Send error message to specific client
   */
  private sendError(socketId: string, errorMessage: string): void {
    const message: WebSocketMessage = {
      type: "error",
      error: errorMessage,
      timestamp: Date.now(),
    };

    this.io.to(socketId).emit("message", message);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Close all connections
   */
  close(): void {
    this.stopPeriodicUpdates();
    this.io.close();
    Logger.info("WebSocket service closed");
  }
}
