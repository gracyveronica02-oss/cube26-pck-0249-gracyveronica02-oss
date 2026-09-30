"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = __importDefault(require("pg"));
const schema = __importStar(require("./schema.js"));
class DatabaseManager {
    config;
    pool = null;
    db = null;
    constructor(config) {
        this.config = config;
        if (config?.connectionString) {
            this.pool = new pg_1.default.Pool({
                connectionString: config.connectionString,
                max: config.maxConnections ?? 20,
            });
            this.db = (0, node_postgres_1.drizzle)(this.pool, { schema });
        }
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
    /**
     * Runs an operation with PostgreSQL Row-Level Security set to the specific tenant.
     * Enforces Engineering Rule 1: Tenancy isolation before any feature.
     */
    async withTenant(orgId, operation) {
        if (!this.pool) {
            throw new Error('Database pool not initialized. Provide connectionString.');
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Set the session variable used by RLS policies
            await client.query(`SET LOCAL app.current_org_id = $1`, [orgId]);
            const tenantDb = (0, node_postgres_1.drizzle)(client, { schema });
            const result = await operation(tenantDb, client);
            await client.query('COMMIT');
            return result;
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=db.js.map