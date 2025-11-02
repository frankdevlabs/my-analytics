# Quick Start: Running Tests

## TL;DR

```bash
# Start PostgreSQL (one time)
docker-compose up -d postgres

# Run tests (works for everything!)
npm test
```

That's it! No special commands, no manual database setup.

## Test Commands

| Command | What It Does |
|---------|--------------|
| `npm test` | Runs ALL tests (unit + integration + E2E) with automatic database setup |
| `npm run test:e2e` | Runs only E2E tests |
| `npm run test:watch` | Watch mode for development |
| `npm run test:coverage` | Generate coverage report |

## What Happens Automatically

When you run `npm test`, Jest automatically:

1. ✅ Checks if PostgreSQL is running
2. ✅ Creates `my_analytics_test` database (if needed)
3. ✅ Runs all Prisma migrations
4. ✅ Runs all your tests
5. ✅ Cleans up connections

## For New Team Members

**One-time setup:**
```bash
# Clone repo
git clone <repo-url>
cd my-analytics/app

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d postgres

# Run tests (database auto-created)
npm test
```

## Troubleshooting

### "Failed to set up test database"
→ Make sure PostgreSQL is running: `docker ps`
→ Start it: `docker-compose up -d postgres`

### "Connection refused"
→ Check PostgreSQL port: `docker-compose logs postgres`
→ Ensure port 5432 is not in use by another process

### Tests are slow
→ E2E tests use a real database, so they're slower than unit tests
→ Use `npm run test:watch` during development to only run changed tests

## Manual Database Setup (Optional)

If you want to manually set up the test database:
```bash
npm run test:db-setup
```

But this is **not required** - `npm test` does it automatically!
