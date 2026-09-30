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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./server.js"), exports);
__exportStar(require("./middleware/auth.js"), exports);
__exportStar(require("./middleware/idempotency.js"), exports);
const server_js_1 = require("./server.js");
const database_1 = require("@pack-manager/database");
const seed_js_1 = require("./seed.js");
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
if (process.env.NODE_ENV !== 'test') {
    const repos = new database_1.InMemoryRepositories();
    const storage = new database_1.InMemoryObjectStorage();
    (0, seed_js_1.seedDemoData)(repos, storage).then(() => {
        const server = (0, server_js_1.buildServer)({ repos, storage });
        server.listen({ port: PORT, host: HOST }, (err, address) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log(`Pack Manager API server listening at ${address}`);
            console.log(`OpenAPI documentation available at ${address}/documentation`);
        });
    }).catch((err) => {
        console.error('Failed to seed demo data', err);
    });
}
//# sourceMappingURL=index.js.map