---
phase: 01-data-foundation
plan: 01
subsystem: database, infra
tags: [sqlite, better-sqlite3, dotenv, mcp, companies-house, epc]

# Dependency graph
requires: []
provides:
  - SQLite database schema (landlords + properties tables)
  - Shared db.js connection module (WAL mode, foreign keys)
  - Shared config.js (postcodes, API URLs, SIC codes)
  - Database init script (scripts/init-db.js)
  - .env.example documenting required API keys
  - MCP server configuration (Apify, Companies House)
affects: [01-02-PLAN, 01-03-PLAN, all-phase-1-scripts]

# Tech tracking
tech-stack:
  added: [better-sqlite3, dotenv]
  patterns: [shared-db-module, wal-mode, commonjs-require, tdd-node-test]

key-files:
  created:
    - scripts/lib/db.js
    - scripts/lib/config.js
    - scripts/init-db.js
    - scripts/tests/test-db.js
    - .env.example
  modified:
    - .gitignore
    - package.json

key-decisions:
  - "SK1-SK8 postcodes for Stockport coverage (not SK9-SK16 which are outside target area)"
  - "Temporary test database in os.tmpdir() to avoid polluting production data"
  - "Companies House MCP via claude mcp add (not project dependency)"

patterns-established:
  - "Shared db module: all scripts require('./lib/db') for database access"
  - "Config module: postcodes, API URLs, SIC codes centralised in config.js"
  - "TDD with node:test: tests in scripts/tests/, run with node --test"
  - "CommonJS only: require() not import, no TypeScript"

requirements-completed: [INFRA-01, INFRA-02]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 01 Plan 01: Project Scaffold and Database Schema Summary

**SQLite database with landlords/properties tables, shared db/config modules, 8 passing tests, and MCP servers (Apify + Companies House) configured**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T12:27:45Z
- **Completed:** 2026-03-28T12:31:05Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- SQLite database schema with landlords and properties tables, CHECK constraints, UNIQUE constraints, foreign keys, and 5 indexes
- Shared db.js module with WAL journal mode and foreign keys enabled, config.js with target postcodes and API URLs
- 8 passing unit tests covering schema creation, constraints, indexes, and module exports
- MCP servers configured: Apify (already connected), Companies House (added via claude mcp add), Playwright (skill installed)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Database tests** - `7757504` (test)
2. **Task 1 (GREEN): Implementation** - `3e51d05` (feat)
3. **Task 2: MCP configuration** - no project files changed (config stored in ~/.claude.json)

## Files Created/Modified
- `scripts/lib/db.js` - Shared database connection with WAL mode and foreign keys
- `scripts/lib/config.js` - Postcodes (SK1-SK8, M14, M19-M22), API URLs, SIC codes
- `scripts/init-db.js` - Database schema creation (landlords, properties, indexes)
- `scripts/tests/test-db.js` - 8 unit tests for schema validation
- `.env.example` - Template for EPC_EMAIL, EPC_API_KEY, COMPANIES_HOUSE_API_KEY
- `.gitignore` - Added data/ and .env entries
- `package.json` - Added better-sqlite3 and dotenv dependencies

## Decisions Made
- SK1-SK8 for Stockport coverage (SK9+ is outside target area in Cheshire/Derbyshire)
- Tests use temporary database in os.tmpdir() to avoid polluting production data
- Companies House MCP added via `claude mcp add` rather than project dependency (npx handles it)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** The following environment variables must be set in `.env`:
- `EPC_EMAIL` - Email used to register at https://epc.opendatacommunities.org/
- `EPC_API_KEY` - API key from EPC Register account
- `COMPANIES_HOUSE_API_KEY` - API key from https://developer.company-information.service.gov.uk/

## Next Phase Readiness
- Database schema ready for EPC scraper (Plan 01-02) and Companies House scraper (Plan 01-03)
- Shared db.js and config.js importable by all subsequent scripts
- MCP servers available for Claude Code orchestration

---
*Phase: 01-data-foundation*
*Completed: 2026-03-28*
