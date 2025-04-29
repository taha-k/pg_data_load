const express = require('express');
const { v4: uuidv4 } = require('uuid');
const promClient = require('prom-client');
const knex = require('knex');
const knexfile = require('../knexfile');
const fs = require('fs');
const metricsMiddleware = require('./middleware/metrics');

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
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of PostgreSQL queries in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const insertCounter = new promClient.Counter({
  name: 'db_inserts_total',
  help: 'Total number of insert operations',
  registers: [register]
});

const readCounter = new promClient.Counter({
  name: 'db_reads_total',
  help: 'Total number of read operations',
  registers: [register]
});

const jsonData = JSON.parse(fs.readFileSync('./src/20mb.json', 'utf8'));

// Function to generate random data
function generateRandomData() {
  const dataTypes = ['sensor', 'system', 'application'];
  const eventTypes = ['info', 'warning', 'error', 'debug'];
  
  return {
    type: dataTypes[Math.floor(Math.random() * dataTypes.length)],
    event: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    metrics: {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 16384, // MB
      disk_io: Math.random() * 1000,
      network_latency: Math.random() * 100
    },
    tags: [
      `region-${Math.floor(Math.random() * 5)}`,
      `datacenter-${Math.floor(Math.random() * 3)}`,
      `server-${Math.floor(Math.random() * 10)}`
    ],
    jsonData: jsonData,
    status: Math.random() > 0.9 ? 'error' : 'ok' // 10% chance of error
  };
}

// Function to insert random data
async function insertData() {
  const end = dbQueryDuration.startTimer({ operation: 'insert' });
  try {
    const payload = generateRandomData();
    const [result] = await db('data_entries')
      .insert({
        payload
      })
      .returning(['id', 'payload', 'created_at', 'updated_at']);
    
    insertCounter.inc();
    console.log('Inserted entry:', {
      id: result.id,
      payload: result.payload,
      created_at: result.created_at,
      updated_at: result.updated_at
    });
  } catch (err) {
    console.error('Error inserting data:', err);
  }
  end();
}

// Function to read latest data
async function readData() {
  const end = dbQueryDuration.startTimer({ operation: 'select' });
  try {
    const results = await db('data_entries')
      .select('id', db.raw("payload - 'jsonData' as payload"), 'created_at', 'updated_at')
      .orderBy('created_at', 'desc')
      .limit(5);
    
    readCounter.inc();
    console.log('Latest entries:', results.map(r => ({
      id: r.id,
      type: r.payload.type,
      event: r.payload.event,
      status: r.payload.status,
      created_at: r.created_at
    })));
    return results;
  } catch (err) {
    console.error('Error reading data:', err);
    return [];
  } finally {
    end();
  }
}

// API endpoint to get latest data
app.get('/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    res.status(500).send(err);
  }
});

// Start the application
async function startApp() {
  try {
    // Run migrations
    await db.migrate.latest();
    console.log('Migrations completed successfully');

    // Start the data operations
    setInterval(insertData, 10000);  // Insert every 10 seconds
    setInterval(readData, 15000);    // Read every 15 seconds

    // Start the server
    app.listen(port, () => {
      console.log(`App listening at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Error starting application:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Cleaning up...');
  await db.destroy();
  process.exit(0);
});

startApp();
