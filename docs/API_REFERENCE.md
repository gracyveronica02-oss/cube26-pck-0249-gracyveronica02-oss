# Pack Manager REST API Reference

The Pack Manager REST API provides endpoints for ingesting orders, uploading carton photographs, triggering automated verification, reviewing discrepancies, and integrating with Warehouse Management Systems (WMS/ERP).

- **Base URL**: `http://localhost:4000/api/v1`
- **Interactive Swagger UI**: `http://localhost:4000/documentation`
- **Auth Headers**:
  - `x-org-id`: Organization Identifier (e.g. `org_demo_alpha`)
  - `x-user-id`: User / Service Account Identifier (e.g. `operator_1`)
  - `x-user-role`: `ADMIN` | `SUPERVISOR` | `QC_OPERATOR` | `VIEWER`
  - `x-idempotency-key` (Optional): Unique string for duplicate suppression

See root `API_REFERENCE.md` for full parameter definitions.
