/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('data_entries', function(table) {
        table.jsonb('small_payload').nullable(); // Add the new JSONB column
      });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('data_entries', function(table) {
    table.dropColumn('small_payload'); // Remove the new JSONB column
  });
};
