module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'postgres',
      database: 'testdb',
      user: 'postgres',
      password: 'postgres'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    }
  }
};
