import { cacheService } from "./services/cache.service";
import { Logger } from "./utils/logger";

async function testCache() {
  Logger.info("🧪 Testing Cache Service...");

  // Test 1: Set and Get
  Logger.info("\n--- Test 1: Set and Get ---");
  await cacheService.set("test:key", { name: "BONK", price: 0.00001 });
  const data = await cacheService.get("test:key");
  console.log("Retrieved:", data);

  // Test 2: Check TTL
  Logger.info("\n--- Test 2: Check TTL ---");
  const ttl = await cacheService.getTTL("test:key");
  console.log(`TTL remaining: ${ttl}s`);

  // Test 3: Health Check
  Logger.info("\n--- Test 3: Health Check ---");
  const healthy = await cacheService.isHealthy();
  console.log("Redis healthy:", healthy);

  // Test 4: Stats
  Logger.info("\n--- Test 4: Get Stats ---");
  const stats = await cacheService.getStats();
  console.log("Stats:", stats);

  // Test 5: Delete
  Logger.info("\n--- Test 5: Delete ---");
  await cacheService.delete("test:key");
  const deleted = await cacheService.get("test:key");
  console.log("After delete:", deleted); // Should be null

  Logger.info("\n✅ All tests passed!");
  await cacheService.disconnect();
}

testCache().catch(console.error);
