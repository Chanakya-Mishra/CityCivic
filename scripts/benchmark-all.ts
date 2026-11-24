/**
 * Comprehensive Latency Benchmark Suite for CityCivic
 * Measures Cold Latency, Warm Latency, Min, Max, and P95 response times
 * across all API routes, data endpoints, and frontend SSR pages.
 */

interface BenchmarkResult {
  endpoint: string;
  type: "API" | "PAGE";
  coldMs: number;
  warmAvgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  cacheHitExpected: boolean;
  status: number;
}

const BASE_URL = process.env.BENCHMARK_URL || "http://localhost:3000";

async function measureRequest(url: string): Promise<{ durationMs: number; status: number }> {
  const start = performance.now();
  const res = await fetch(url, { cache: "no-store" });
  await res.text();
  const end = performance.now();
  return { durationMs: Math.round(end - start), status: res.status };
}

async function benchmarkEndpoint(endpoint: string, type: "API" | "PAGE", cacheHit: boolean): Promise<BenchmarkResult> {
  const url = `${BASE_URL}${endpoint}`;
  
  // 1. Cold call
  const cold = await measureRequest(url);

  // 2. Warm calls (5 runs)
  const warmSamples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await measureRequest(url);
    warmSamples.push(r.durationMs);
  }

  warmSamples.sort((a, b) => a - b);
  const minMs = warmSamples[0];
  const maxMs = warmSamples[warmSamples.length - 1];
  const warmAvgMs = Math.round(warmSamples.reduce((a, b) => a + b, 0) / warmSamples.length);
  const p95Index = Math.min(warmSamples.length - 1, Math.floor(warmSamples.length * 0.95));
  const p95Ms = warmSamples[p95Index];

  return {
    endpoint,
    type,
    coldMs: cold.durationMs,
    warmAvgMs,
    minMs,
    maxMs,
    p95Ms,
    cacheHitExpected: cacheHit,
    status: cold.status,
  };
}

async function runFullScan() {
  console.log(`\n======================================================`);
  console.log(`🚀 CITYCIVIC FULL-SITE PERFORMANCE & LATENCY BENCHMARK`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  const endpoints: Array<{ path: string; type: "API" | "PAGE"; cache: boolean }> = [
    // Core Reference APIs
    { path: "/api/categories", type: "API", cache: true },
    { path: "/api/wards", type: "API", cache: true },
    
    // High-Traffic Map & GIS Feed
    { path: "/api/public/map", type: "API", cache: true },
    { path: "/api/public/map?status=OPEN", type: "API", cache: true },
    { path: "/api/issues", type: "API", cache: true },
    
    // Executive Analytics & Public Audit
    { path: "/api/admin/analytics", type: "API", cache: true },
    { path: "/api/public/audit-ledger", type: "API", cache: true },
    { path: "/api/leaderboard", type: "API", cache: true },
    { path: "/api/contractors", type: "API", cache: true },

    // Frontend HTML Pages (SSR / Static Delivery)
    { path: "/", type: "PAGE", cache: true },
    { path: "/report", type: "PAGE", cache: true },
    { path: "/leaderboard", type: "PAGE", cache: true },
    { path: "/officer", type: "PAGE", cache: true },
    { path: "/admin", type: "PAGE", cache: true },
  ];

  const results: BenchmarkResult[] = [];

  for (const item of endpoints) {
    process.stdout.write(`Benchmarking ${item.path}... `);
    try {
      const res = await benchmarkEndpoint(item.path, item.type, item.cache);
      results.push(res);
      console.log(`[Status: ${res.status}] Cold: ${res.coldMs}ms | Warm: ${res.warmAvgMs}ms (P95: ${res.p95Ms}ms)`);
    } catch (err: any) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 SUMMARY OF LATENCY BENCHMARK RESULTS`);
  console.log(`------------------------------------------------------`);
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      Type: r.type,
      "Cold (ms)": r.coldMs,
      "Warm Avg (ms)": r.warmAvgMs,
      "Min (ms)": r.minMs,
      "Max (ms)": r.maxMs,
      "P95 (ms)": r.p95Ms,
      Status: r.status,
    }))
  );

  return results;
}

runFullScan().catch(console.error);
