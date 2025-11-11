# 🪙 Real-time Meme Coin Data Aggregation Service

## Overview
This project implements a **high-performance, real-time data aggregation service** for meme coins on the **Solana network**. The service fulfills the requirements of fetching, merging, filtering, and sorting token data from multiple DEX APIs (**DexScreener**, **GeckoTerminal**) and provides **live updates via WebSockets**.  

The core architectural innovation is a **Proactive Caching Strategy** designed to maximize efficiency, ensure data consistency, and strictly adhere to external API rate limits and internal TTL requirements.

---

## 🚀 Live Demo
| Component | Status | URL |
|------------|---------|-----|
| **Public API URL** | Deployed | http://ec2-65-0-107-101.ap-south-1.compute.amazonaws.com/ |
| **YouTube Demo** | Video Link | [INSERT YOUTUBE VIDEO LINK HERE] |
| **Postman/Insomnia Collection** | Link | [INSERT POSTMAN/INSOMNIA COLLECTION LINK HERE] |

---

## 🏗️ Architecture and Design Decisions
The entire system is designed around a **single source of truth** for external data, eliminating race conditions and minimizing API calls.

### 1. Proactive Caching Strategy (The 3s/30s Split)
The system uses **Redis** for caching and operates with two distinct timers to meet the conflicting goals of real-time speed and compliance.

| Parameter | Value | Role in System |
|------------|--------|----------------|
| **Cache TTL** | 30 seconds | **Compliance/Safety Net:** This value remains 30 seconds as required by the task's default configuration. This is the absolute maximum time stale data is allowed to exist in the cache. |
| **WebSocket Interval** | 3 seconds | **Speed/Freshness:** This dictates how often the system actively fetches new data. This is set fast (3s) for near real-time updates. |

#### Flow Logic
- **The Proactive Boss (`websocket.service.ts`)** fires every 3 seconds. It calls the external APIs (`getAllTokens()`), gets fresh data, and overwrites the master cache key (`master_token_list`) while simultaneously resetting the 30-second TTL.  
- **The Lazy Worker (`aggregation.service.ts` / REST API)** only attempts to read from the cache (`cacheService.get`) when a user requests data.

**Result:**  
The REST API is extremely fast (cache hit), and the data served is always less than 3 seconds old.  
The system makes API calls every 3 seconds, resulting in a low rate limit footprint (20 calls/min).

---

### 2. Data Aggregation & Merging
Data fetched from the two sources is intelligently merged based on the **token address**.

- **Metric:** Volume-Weighted Average Price (**VWAP**) is used to merge price points. Prices are weighted by the reported volume from each source to ensure the final price reflects the most liquid/active market data.  
- **Static Data:** Token Name and Ticker are taken from the first available source.  
- **Volatile Data:** Volume, Liquidity, and Market Cap are summed across all sources to provide the most comprehensive metric of total market activity.

---

### 3. Real-Time Data Handling (WebSockets)
The `websocket.service.ts` is the **central component** of the architecture:
- Acts as the **single data fetcher** (see Proactive Caching).  
- Compares newly fetched data against the previously stored state (`this.previousTokens`).  
- Broadcasts updates to all connected clients only when a **significant change** is detected (e.g., price change ≥ 1% or volume spike ≥ 50%).

---

## ⚙️ Technical Stack
- **Language:** TypeScript  
- **Framework:** Node.js / Express  
- **APIs:** DexScreener, GeckoTerminal  
- **Caching:** Redis (`cache-manager`)  
- **Real-time:** Socket.IO  

---

## 🧩 Installation, Configuration, and Setup

### Prerequisites
- Node.js (v18+)  
- Redis server instance (local or remote)

### Steps
Clone the repository, install dependencies, configure environment variables, and run the service:

```bash
# Clone the repository
git clone [YOUR_REPO_URL]
cd [YOUR_REPO_NAME]

# Install dependencies
npm install

# Create and configure environment file
cat <<EOF > .env
# Server Configuration
PORT=3000
CORS_ORIGIN=*

# Caching (Compliance)
REDIS_URL=redis://localhost:6379 
CACHE_TTL_SECONDS=30 

# WebSocket (Speed)
WEBSOCKET_UPDATE_INTERVAL=3000 
EOF

# Start the service
npm run start
The server will start on http://localhost:3000
 and WebSocket updates will begin immediately.
