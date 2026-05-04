# Deprecated Migration Mirror

This directory is a historical mirror and is no longer used by runtime migration tooling.

Source of truth for schema migrations:

- `backend/src/main/resources/db/migration`

Reason:

- Keeping duplicate migration chains in two places causes version drift and operator confusion.

Action:

- Do not add new SQL migration files here.
- Add all new migrations only under backend Flyway path.
