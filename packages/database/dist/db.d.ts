import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
export interface DatabaseConfig {
    connectionString?: string;
    maxConnections?: number;
}
export type DrizzleDb = NodePgDatabase<typeof schema>;
export declare class DatabaseManager {
    private config?;
    private pool;
    db: DrizzleDb | null;
    constructor(config?: DatabaseConfig | undefined);
    close(): Promise<void>;
    /**
     * Runs an operation with PostgreSQL Row-Level Security set to the specific tenant.
     * Enforces Engineering Rule 1: Tenancy isolation before any feature.
     */
    withTenant<T>(orgId: string, operation: (db: DrizzleDb, client: pg.PoolClient) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=db.d.ts.map