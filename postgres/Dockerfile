FROM postgres:15

# Install contrib modules for pg_stat_statements and pgbench
RUN apt-get update && apt-get install -y \
    postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration and initialization files
COPY postgresql.conf /etc/postgresql/postgresql.conf
COPY init.sql /docker-entrypoint-initdb.d/

# Create directory for stats temp files
RUN mkdir -p /var/lib/postgresql/data/pg_stat_tmp && \
    chown -R postgres:postgres /var/lib/postgresql/data/pg_stat_tmp && \
    chmod 777 /var/lib/postgresql/data/pg_stat_tmp

# Use custom postgresql.conf
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
