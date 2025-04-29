#!/bin/sh

echo "Starting application initialization..."

# Wait for database connection
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Waiting for database to be ready..."
for i in $(seq 1 $MAX_RETRIES); do
    if node -e "
        const knex = require('knex')(require('../knexfile').development);
        knex.raw('SELECT 1').then(() => process.exit(0)).catch(() => process.exit(1));
    "; then
        echo "Database is ready!"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "Error: Could not connect to database after $MAX_RETRIES attempts"
        exit 1
    fi
    
    echo "Attempt $i/$MAX_RETRIES: Database not ready yet, waiting..."
    sleep $RETRY_INTERVAL
done

echo "Running database migrations..."
npx knex migrate:latest

if [ $? -ne 0 ]; then
    echo "Error: Migration failed"
    exit 1
fi

echo "Starting Node.js application..."
exec node src/app.js
