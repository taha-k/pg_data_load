const promClient = require('prom-client');

// Create a function that sets up metrics with a specific registry
function setupMetrics(register) {
  // Create HTTP specific metrics
  const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  });

  const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  });

  return { httpRequestDuration, httpRequestTotal };
}

// Middleware function to track HTTP metrics
function metricsMiddleware(register) {
  const metrics = setupMetrics(register);
  
  return function(req, res, next) {
    const start = process.hrtime();
    
    // Record response metrics when the response is completed
    res.on('finish', () => {
      const duration = process.hrtime(start);
      const durationInSeconds = duration[0] + duration[1] / 1e9;
      
      const route = req.route ? req.route.path : req.path;
      const labels = {
        method: req.method,
        route: route,
        status_code: res.statusCode
      };
      
      metrics.httpRequestDuration.observe(labels, durationInSeconds);
      metrics.httpRequestTotal.inc(labels);
    });
    
    next();
  };
}

module.exports = metricsMiddleware;
