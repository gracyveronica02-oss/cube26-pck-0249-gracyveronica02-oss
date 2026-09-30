import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export interface DatabaseConfig {
  connectionString?: string;
  maxConnections?: number;
}

export type DrizzleDb = NodePgDatabase<typeof schema>;

export class DatabaseManager {
  private pool: pg.Pool | null = null;
  public db: DrizzleDb | null = null;

  constructor(private config?: DatabaseConfig) {
    if (config?.connectionString) {
      this.pool = new pg.Pool({
        connectionString: config.connectionString,
        max: config.maxConnections ?? 20,
      });
      this.db = drizzle(this.pool, { schema });
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  /**
   * Runs an operation with PostgreSQL Row-Level Security set to the specific tenant.
   * Enforces Engineering Rule 1: Tenancy isolation before any feature.
   */
  public async withTenant<T>(
    orgId: string,
    operation: (db: DrizzleDb, client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Provide connectionString.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Set the session variable used by RLS policies
      await client.query(`SET LOCAL app.current_org_id = $1`, [orgId]);

      const tenantDb = drizzle(client, { schema });
      const result = await operation(tenantDb, client);

      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
