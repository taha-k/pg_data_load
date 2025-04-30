const express = require("express");
const { v4: uuidv4 } = require("uuid");
const promClient = require("prom-client");
const knex = require("knex");
const knexfile = require("../knexfile");
const fs = require("fs");
const metricsMiddleware = require("./middleware/metrics");

// Initialize Knex
const db = knex(knexfile.development);

// Create Express app
const app = express();
const port = 3000;

// Create a new Registry for Prometheus metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Apply metrics middleware
app.use(metricsMiddleware(register));

// Custom metrics
// Operation Status Counters
const operationStatus = new promClient.Counter({
  name: "db_operation_status_total",
  help: "Status of database operations",
  labelNames: ["operation", "status"],
  registers: [register],
});

const dbUpdateDuration = new promClient.Histogram({
  name: "db_update_duration_seconds",
  help: "Duration of PostgreSQL update operations in seconds",
  labelNames: ["operation"],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const updateCounter = new promClient.Counter({
  name: "db_updates_total",
  help: "Total number of update operations",
  registers: [register],
});

const dbQueryDuration = new promClient.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of PostgreSQL queries in seconds",
  labelNames: ["operation"],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const insertCounter = new promClient.Counter({
  name: "db_inserts_total",
  help: "Total number of insert operations",
  registers: [register],
});

const readCounter = new promClient.Counter({
  name: "db_reads_total",
  help: "Total number of read operations",
  registers: [register],
});

const jsonData = JSON.parse(fs.readFileSync("./src/fixtures/1MB.json", "utf8"));
const smallJsonData = JSON.parse(
  fs.readFileSync("./src/fixtures/64KB.json", "utf8")
);

// Function to generate random data
function generateRandomData(small = false) {
  const dataTypes = ["sensor", "system", "application"];
  const eventTypes = ["info", "warning", "error", "debug"];

  return {
    type: dataTypes[Math.floor(Math.random() * dataTypes.length)],
    event: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    metrics: {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 16384, // MB
      disk_io: Math.random() * 1000,
      network_latency: Math.random() * 100,
    },
    tags: [
      `region-${Math.floor(Math.random() * 5)}`,
      `datacenter-${Math.floor(Math.random() * 3)}`,
      `server-${Math.floor(Math.random() * 10)}`,
    ],
    ...(small ? { jsonData: smallJsonData } : { jsonData: jsonData }), // Include large JSON data if not small
    status: Math.random() > 0.9 ? "error" : "ok", // 10% chance of error
  };
}

// Function to insert random data
async function insertData() {
  const end = dbQueryDuration.startTimer({ operation: "insert" });
  try {
    const payload = generateRandomData();
    const smallPayload = generateRandomData(true);
    const [result] = await db("data_entries")
      .insert({
        payload,
        small_payload: smallPayload,
      })
      .returning([
        "id",
        "payload",
        "small_payload",
        "created_at",
        "updated_at",
      ]);

    insertCounter.inc();
    operationStatus.labels("insert", "success").inc();
    console.log("Inserted entry:", {
      id: result.id,
      payload: result.payload,
      created_at: result.created_at,
      updated_at: result.updated_at,
    });
  } catch (err) {
    console.error("Error inserting data:", err);
    operationStatus.labels("insert", "error").inc();
  }
  end();
}

// Function to read latest data
async function readData() {
  const end = dbQueryDuration.startTimer({ operation: "select" });
  try {
    const results = await db("data_entries")
      .select("id", "small_payload", "created_at", "updated_at")
      .orderBy("created_at", "desc")
      .limit(5);

    readCounter.inc();
    operationStatus.labels("read", "success").inc();
    console.log(
      "Latest entries:",
      results.map((r) => ({
        id: r.id,
        event: r.small_payload.event,
        status: r.small_payload.status,
        created_at: r.created_at,
      }))
    );
    return results;
  } catch (err) {
    console.error("Error reading data:", err);
    operationStatus.labels("read", "error").inc();
    return [];
  } finally {
    end();
  }
}

// API endpoint to get latest data
app.get("/data", async (req, res) => {
  const data = await readData();
  res.json(data);
});

// Metrics endpoint for Prometheus
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    res.status(500).send(err);
  }
});

// Function to update random rows with new small_payload
async function updateRandomRows() {
  const end = dbUpdateDuration.startTimer({ operation: "update" });
  try {
    // Get 5 random rows
    const rows = await db("data_entries")
      .select("id")
      .orderBy(db.raw("RANDOM()"))
      .limit(5);

    for (const row of rows) {
      const smallPayload = generateRandomData(true);
      await db("data_entries").where("id", row.id).update({
        small_payload: smallPayload,
        updated_at: db.fn.now(),
      });
    }

    updateCounter.inc(rows.length);
    operationStatus.labels("update", "success").inc(rows.length);
    console.log(`Updated ${rows.length} rows with new small_payload data`);
  } catch (err) {
    console.error("Error updating random rows:", err);
    operationStatus.labels("update", "error").inc();
  }
  end();
}

// Start the application
async function startApp() {
  try {
    // Run migrations
    await db.migrate.latest();
    console.log("Migrations completed successfully");

    // Start the data operations
    setInterval(insertData, 10000); // Insert every 10 seconds
    setInterval(readData, 15000); // Read every 15 seconds
    setInterval(updateRandomRows, 5000); // Update every 5 seconds

    // Start the server
    app.listen(port, () => {
      console.log(`App listening at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Error starting application:", err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Cleaning up...");
  await db.destroy();
  process.exit(0);
});

startApp();
