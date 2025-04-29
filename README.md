# PostgreSQL Data Load Application

This application demonstrates a Node.js service that performs regular data operations on PostgreSQL, with full monitoring capabilities using Prometheus and Grafana.

## Components

- Node.js application that inserts and reads data at regular intervals
- PostgreSQL database with pg_stat_statements and pgbench extensions
- Prometheus for metrics collection
- Grafana for metrics visualization
- PostgreSQL exporter for detailed database metrics

## Setup

1. Clone this repository
2. Make sure Docker and Docker Compose are installed
3. Run the following command:
```bash
docker-compose up -d
```

## Access Points

- Node.js Application: http://localhost:3000
- Node.js Metrics: http://localhost:3000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- PostgreSQL: localhost:5432

## Open psql in terminal after the container is running

```bash
docker-compose exec -it postgres psql -U postgres -d testdb
```

## Monitoring

The setup includes comprehensive monitoring:

1. Application Metrics:
   - Query duration
   - Insert/Read operations count
   - Node.js process metrics

2. PostgreSQL Metrics:
   - Connection stats
   - Query stats
   - Table stats
   - Buffer/cache hits
   - Transaction rates

Access Grafana at http://localhost:3001 to view the dashboards.

## Storage

PostgreSQL is configured with a 10GB storage limit, ensuring efficient resource usage while providing ample space for data operations.

## Notes

- The application performs insert operations every 10 seconds
- Read operations occur every 15 seconds
- All metrics are collected at 15-second intervals
- PostgreSQL data is persisted using Docker volumes

## Initialize grafana dashboard

