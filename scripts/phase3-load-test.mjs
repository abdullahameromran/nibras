import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
    }),
);

const baseUrl = process.env.LOAD_TEST_BASE_URL || env.VITE_SUPABASE_URL;
const anonKey = process.env.LOAD_TEST_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const tokens = JSON.parse(process.env.LOAD_TEST_TOKENS_JSON || "[]");
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 20);
const requestsPerSession = Number(process.env.LOAD_TEST_REQUESTS || 25);

if (!baseUrl || !anonKey || !Array.isArray(tokens) || tokens.length < 2) {
  console.error("Set LOAD_TEST_TOKENS_JSON to JWTs from at least two school sessions.");
  process.exit(2);
}

const paths = [
  "/rest/v1/classes?select=id,name,school_id&limit=50",
  "/rest/v1/lessons?select=id,class_id,subject_id,lesson_date&deleted_at=is.null&limit=50",
  "/rest/v1/attendance_records?select=id,student_id,status,recorded_at&limit=100",
  "/rest/v1/final_grades?select=id,student_id,status,grade_value&deleted_at=is.null&limit=100",
  "/rest/v1/messages?select=id,sender_id,created_at&deleted_at=is.null&limit=50",
];

const jobs = [];
for (let i = 0; i < requestsPerSession; i += 1) {
  for (const token of tokens) jobs.push({ token, path: paths[i % paths.length] });
}

const latencies = [];
let failed = 0;
let cursor = 0;
async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${job.path}`, { headers: { apikey: anonKey, Authorization: `Bearer ${job.token}` } });
      if (!response.ok) failed += 1;
      await response.arrayBuffer();
    } catch {
      failed += 1;
    }
    latencies.push(performance.now() - started);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
latencies.sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0;
const result = { requests: jobs.length, failed, p50_ms: Math.round(percentile(0.5)), p95_ms: Math.round(percentile(0.95)), p99_ms: Math.round(percentile(0.99)) };
console.log(JSON.stringify(result, null, 2));
if (failed > 0 || percentile(0.95) > Number(process.env.LOAD_TEST_P95_LIMIT_MS || 1500)) process.exit(1);
