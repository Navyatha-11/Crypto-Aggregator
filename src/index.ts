import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import { config } from "./config/env";
import { Logger } from "./utils/logger";
import { cacheService } from "./services/cache.service";
import { WebSocketService } from "./services/websocket.service";
import tokensRouter from "./routes/tokens.route";

/**
 * Main Application Entry Point
 */
class Application {
  private app: Express;
  private server: http.Server;
  private websocketService: WebSocketService;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.websocketService = new WebSocketService(this.server);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: "*", // In production, specify your frontend domain
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      Logger.debug(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.body,
      });
      next();
    });

    Logger.info("Middleware configured");
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.use("/api/tokens", tokensRouter);

    // Root endpoint
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        name: "Crypto Aggregator API",
        version: "1.0.0",
        status: "running",
        endpoints: {
          tokens: "/api/tokens",
          trending: "/api/tokens/trending",
          gainers: "/api/tokens/gainers",
          losers: "/api/tokens/losers",
          health: "/api/tokens/health",
        },
        websocket: {
          enabled: true,
          clients: this.websocketService.getConnectedClientsCount(),
        },
        timestamp: Date.now(),
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: "Endpoint not found",
        path: req.path,
        timestamp: Date.now(),
      });
    });

    Logger.info("Routes configured");
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.app.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        Logger.error("Unhandled error", err);

        res.status(500).json({
          success: false,
          error: config.server.isDevelopment
            ? err.message
            : "Internal server error",
          timestamp: Date.now(),
        });
      }
    );
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Check cache health
      const cacheHealthy = await cacheService.isHealthy();
      if (!cacheHealthy) {
        Logger.warn("⚠️  Cache not healthy, but continuing...");
      }

      // Start HTTP server
      this.server.listen(config.server.port, () => {
        Logger.info("=".repeat(50));
        Logger.info(`🚀 Server started successfully!`);
        Logger.info(`📡 HTTP Server: http://localhost:${config.server.port}`);
        Logger.info(
          `🔌 WebSocket Server: ws://localhost:${config.server.port}`
        );
        Logger.info(`🌍 Environment: ${config.server.nodeEnv}`);
        Logger.info(`💾 Cache TTL: ${config.cache.ttl}s`);
        Logger.info(
          `📄 Pagination: ${config.pagination.defaultLimit} per page`
        );
        Logger.info("=".repeat(50));
      });

      // Start WebSocket periodic updates
      this.websocketService.startPeriodicUpdates();

      // Graceful shutdown handlers
      this.setupShutdownHandlers();
    } catch (error) {
      Logger.error("Failed to start server", error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      Logger.info(`\n${signal} received, shutting down gracefully...`);

      // Stop accepting new connections
      this.server.close(() => {
        Logger.info("HTTP server closed");
      });

      // Close WebSocket connections
      this.websocketService.close();

      // Close cache connection
      await cacheService.disconnect();

      Logger.info("Shutdown complete");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      Logger.error("Uncaught Exception", error);
      shutdown("UNCAUGHT_EXCEPTION");
    });

    process.on("unhandledRejection", (reason, promise) => {
      Logger.error("Unhandled Rejection", { reason, promise });
    });
  }
}

// Start the application
const app = new Application();
app.start();
