# My Analytics

A privacy-focused, self-hosted web analytics platform built with Next.js 15, PostgreSQL, and Redis.

## Features

- **Enhanced Analytics Tracking**: 36+ data points per pageview including device, browser, location, and engagement metrics
- **Session Tracking**: Comprehensive session management with Redis-backed visitor deduplication
- **Custom Events**: Track custom user interactions and behaviors with JSONB metadata
- **Bot Detection**: Automatic bot filtering using the `isbot` library
- **SPA Support**: Client-side navigation tracking for single-page applications
- **GeoIP Lookup**: Country-level geolocation using MaxMind GeoLite2
- **Privacy-First**: No cookies, no personal data storage, IP address hashing
- **Single-User Auth**: Secure NextAuth.js authentication with bcrypt

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19.1, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 17.6
- **Cache/Session Store**: Redis 7.4
- **Authentication**: NextAuth.js v5
- **Charts**: Recharts
- **UI Components**: shadcn/ui + Radix UI

## Prerequisites

- Node.js 20.10.0 or later (LTS recommended)
- Docker and Docker Compose (for infrastructure services)
- MaxMind GeoLite2 license key (free)

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd my-analytics
```

### 2. Start infrastructure services with Docker

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are healthy
docker-compose ps
```

The services will be available at:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### 3. Configure environment variables

First, configure Docker infrastructure services (PostgreSQL & Redis):

```bash
# From project root
cp .env.example .env
```

Edit `.env` to configure Docker services (or use defaults):
- PostgreSQL credentials and performance tuning
- Redis memory limits and persistence settings
- Port mappings and resource limits

**Note**: The `.env` file at the root configures Docker infrastructure. The Next.js application connects to these services using the connection strings in the Quick Start steps below.

### 4. Install dependencies

```bash
cd app
npm install
```

### 5. Configure application environment variables

The Next.js application requires its own environment variables for database connections, authentication, and features:

```bash
cd app
# Create your .env file with necessary variables
```

Required environment variables:
- `DATABASE_URL`: `postgresql://postgres:password@localhost:5432/my_analytics`
- `REDIS_URL`: `redis://localhost:6379`
- `AUTH_SECRET`: Generate with `openssl rand -base64 32`
- `AUTH_URL`: `http://localhost:3000` (or your deployment URL)
- `MAXMIND_LICENSE_KEY`: Get from https://www.maxmind.com/en/geolite2/signup
- `FIRST_USER_EMAIL`, `FIRST_USER_PASSWORD`, `FIRST_USER_NAME`: Your admin credentials

**Note**: Database credentials should match those in the root `.env` file used by Docker.

### 6. Setup MaxMind GeoIP database

```bash
cd app
npx tsx scripts/setup-geoip.ts
```

This downloads the GeoLite2-Country database (~6MB) to `app/lib/geoip/`.

### 7. Run database migrations

```bash
cd app
npx prisma migrate deploy
```

This will automatically create the first user account using your environment variables.

### 8. Start the development server

```bash
cd app
npm run dev
```

The application will be available at http://localhost:3000 (or port specified in your .env).

### 9. Add tracking script to your website

Add this script tag to your website's HTML:

```html
<script src="https://your-domain.com/fb-a7k2.js" defer></script>
```

For local testing (or use the unminified version during development):
```html
<!-- Production (minified) -->
<script src="http://localhost:3000/fb-a7k2.js" defer></script>

<!-- Development (unminified) -->
<script src="http://localhost:3000/tracker.js" defer></script>
```

**Note**: The tracker script is built automatically during `npm run build`. The minified version (`fb-a7k2.js`) is optimized for production use.

## Development Workflow

### Starting services

```bash
# Start infrastructure (from project root)
docker-compose up -d

# Start Next.js app (from app directory)
cd app && npm run dev
```

### Stopping services

```bash
# Stop Next.js app
# Press Ctrl+C in the terminal running npm run dev

# Stop infrastructure (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything INCLUDING DATA
docker-compose down -v
```

### Viewing logs

```bash
# View all infrastructure logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f redis

# View Next.js logs
# They appear in the terminal where you ran npm run dev
```

### Database operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d my_analytics

# Run Prisma Studio (GUI for database)
cd app && npx prisma studio

# Create a new migration
cd app && npx prisma migrate dev --name description_of_changes

# Generate Prisma Client (after schema changes)
cd app && npx prisma generate

# Seed database with test data
cd app && npm run db:seed
```

### Redis operations

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Common Redis commands
redis-cli PING
redis-cli INFO
redis-cli KEYS "visitor:hash:*"  # View visitor deduplication keys
redis-cli KEYS "session:*"        # View session tracking keys
redis-cli GET "session:{session_id}"  # View session metadata
```

## Project Structure

```
my-analytics/
├── .env.example                # Docker infrastructure configuration template
├── docker-compose.yml          # Infrastructure services (PostgreSQL, Redis)
├── LICENSE                     # MIT License
├── README.md                   # This file
├── lint.sh                     # Linting script
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD pipelines
│       ├── ci.yml              # Continuous Integration (lint, build)
│       └── deploy.yml          # Automated deployment workflow
├── deployment/                 # Production deployment resources
│   ├── README.md               # Complete deployment guide
│   ├── docs/                   # Deployment documentation
│   ├── nginx/                  # Nginx configuration templates
│   ├── scripts/                # Deployment automation scripts
│   └── systemd/                # Systemd service files
├── demo-site/                  # Demo Gatsby site for testing tracker
├── app/                        # Next.js application
│   ├── src/                    # Application source code
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── api/            # API routes (track, metrics, etc.)
│   │   │   ├── dashboard/      # Analytics dashboard UI
│   │   │   └── login/          # Authentication pages
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── charts/         # Recharts visualizations
│   │   │   ├── dashboard/      # Dashboard-specific components
│   │   │   ├── auth/           # Authentication components
│   │   │   └── theme/          # Theme provider
│   │   ├── config/             # Configuration files
│   │   ├── hooks/              # Custom React hooks
│   │   └── types/              # TypeScript type definitions
│   ├── lib/                    # Business logic (root level)
│   │   ├── privacy/            # Visitor tracking & hashing
│   │   ├── db/                 # Database query helpers
│   │   ├── jobs/               # Background jobs
│   │   ├── validation/         # Zod schemas
│   │   ├── geoip/              # MaxMind GeoIP database
│   │   ├── session/            # Session management
│   │   ├── user-agent/         # User agent parsing
│   │   ├── parsing/            # Data parsing utilities
│   │   └── auth/               # Authentication helpers
│   ├── prisma/                 # Database schema & migrations
│   │   ├── schema.prisma       # Prisma schema definition
│   │   ├── migrations/         # Database migrations
│   │   └── seed.ts             # Database seeding script
│   ├── public/                 # Static assets
│   │   ├── tracker.js          # Client-side tracking script (unminified)
│   │   └── fb-a7k2.js          # Minified tracker (built during build)
│   └── scripts/                # Utility scripts
│       ├── setup-geoip.ts      # GeoIP database downloader
│       ├── create-first-user.ts # User creation
│       ├── import-csv.ts       # CSV data importer
│       ├── minify-tracker.ts   # Tracker script minifier
│       ├── setup-production.ts # Production setup automation
│       ├── verify-production.ts # Production verification
│       └── backup-database.ts  # Database backup utility
```

## Available Scripts

All scripts are run from the `app` directory (`cd app`):

### Development
```bash
npm run dev                      # Start dev server (port 3000)
npm run lint                     # Run ESLint
```

### Building & Production
```bash
npm run build                    # Build for production (includes tracker minification)
npm run build:tracker            # Build minified tracker script only
npm run start                    # Start production server
```

### Testing
```bash
npm run test                     # Run Jest tests
npm run test:watch               # Run tests in watch mode
npm run test:coverage            # Generate coverage report
```

### Database Management
```bash
npx prisma migrate deploy        # Run migrations (production)
npx prisma migrate dev           # Run migrations (development)
npx prisma generate              # Generate Prisma Client
npx prisma studio                # Open Prisma Studio GUI
npm run db:seed                  # Seed database with test data
npm run db:reset                 # Reset database (WARNING: deletes all data)
```

### User Management
```bash
npm run create-user              # Create first user manually
```

### Data Operations
```bash
npm run import:csv               # Import pageviews from CSV
npm run backup:database          # Backup database
npm run delete:historical        # Preview historical data deletion
npm run delete:historical:execute # Delete historical data (execute)
npm run check:unique-visitors    # Check unique visitor counts
npm run backfill:analytics       # Preview analytics backfill
npm run backfill:analytics:execute # Execute analytics backfill
```

### Production Setup
```bash
npm run setup:production         # Automated production setup
npm run verify:production        # Verify production environment
```

## Docker Configuration

The infrastructure services (PostgreSQL and Redis) are managed via Docker Compose. Configuration is controlled by environment variables in the root `.env` file.

### Services

**PostgreSQL 17.6-alpine**
- Port: Configurable via `POSTGRES_PORT` (default: `5432`)
- Database: Configurable via `POSTGRES_DB` (default: `my_analytics`)
- User: Configurable via `POSTGRES_USER` (default: `postgres`)
- Password: Configurable via `POSTGRES_PASSWORD` (default: `password` - **change in production!**)
- Memory: Configurable via `POSTGRES_MEMORY_LIMIT` and `POSTGRES_MEMORY_RESERVATION`
- Persistent volume: `my-analytics-postgres-data`

**Redis 7.4-alpine**
- Port: Configurable via `REDIS_PORT` (default: `6379`)
- Max memory: Configurable via `REDIS_MAXMEMORY` (default: `256mb`)
- Eviction policy: Configurable via `REDIS_MAXMEMORY_POLICY` (default: `allkeys-lru`)
- Persistence: AOF (append-only file) - Configurable via `REDIS_APPENDONLY`
- Memory: Configurable via `REDIS_MEMORY_LIMIT` and `REDIS_MEMORY_RESERVATION`
- Persistent volume: `my-analytics-redis-data`

### Configuration

All Docker service settings are defined in the root `.env` file (copy from `.env.example`). The default configuration is suitable for development on modern laptops.

For production or resource-constrained environments, adjust the following in your `.env` file:

```bash
# PostgreSQL resource limits
POSTGRES_MEMORY_LIMIT=1G
POSTGRES_MEMORY_RESERVATION=512M
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB

# Redis resource limits
REDIS_MEMORY_LIMIT=512M
REDIS_MEMORY_RESERVATION=128M
REDIS_MAXMEMORY=256mb
```

## Testing

```bash
cd app

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts
```

## Production Deployment

### Quick Production Setup

For detailed production deployment instructions, see **[deployment/README.md](./deployment/README.md)**.

Quick start for production:

```bash
# 1. Verify production environment
cd app
npm run verify:production

# 2. Run automated production setup
npm run setup:production

# 3. Build the application
npm run build

# 4. Start the production server
npm start
```

The comprehensive [deployment/README.md](./deployment/README.md) guide includes:
- **Prerequisites**: System requirements, required services
- **Environment Setup**: PostgreSQL, Redis, Node.js configuration
- **Deployment Steps**: Step-by-step production deployment
- **Security Best Practices**: Cloudflare integration, mTLS, firewall, SSL/TLS
- **Troubleshooting**: Common issues and solutions
- **Monitoring & Maintenance**: Health checks, backups, log rotation
- **Performance Optimization**: Database tuning, caching strategies

Additional deployment documentation:
- [deployment/docs/PREREQUISITES.md](./deployment/docs/PREREQUISITES.md) - Detailed prerequisites
- [deployment/docs/CLOUDFLARE_SETUP.md](./deployment/docs/CLOUDFLARE_SETUP.md) - Cloudflare configuration
- [deployment/docs/TROUBLESHOOTING.md](./deployment/docs/TROUBLESHOOTING.md) - Troubleshooting guide

## Updating GeoIP Database

MaxMind updates GeoLite2 databases weekly (every Tuesday). For personal use, quarterly updates are sufficient:

```bash
cd app
npx tsx scripts/setup-geoip.ts
```

## Troubleshooting

### PostgreSQL connection refused
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify health status
docker-compose exec postgres pg_isready -U postgres -d my_analytics
```

### Redis connection refused
```bash
# Check if Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
# Should respond: PONG
```

### Port conflicts
If ports 5432 or 6379 are already in use:

1. Stop the conflicting service, OR
2. Edit `docker-compose.yml` to use different ports:
```yaml
ports:
  - "5433:5432"  # Map to port 5433 on host
```
3. Update `DATABASE_URL` in `app/.env` accordingly

### Database migrations fail
```bash
# Reset database (WARNING: deletes all data)
cd app
npx prisma migrate reset

# Or manually drop and recreate
docker-compose exec postgres psql -U postgres -c "DROP DATABASE my_analytics;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE my_analytics;"
npx prisma migrate deploy
```

## Security Considerations

### Development
- Default credentials are used (postgres/password)
- Services exposed on localhost only
- Suitable for local development

### Production
- Change all default passwords
- Use environment variables, never commit secrets
- Enable SSL/TLS for PostgreSQL
- Configure Redis authentication
- Use a proper secrets management solution
- Enable firewall rules
- Regular security updates

## Performance Optimization

### PostgreSQL
- Adjust `shared_buffers` based on available RAM (25% of RAM)
- Tune `effective_cache_size` (50-75% of RAM)
- Monitor slow queries with `pg_stat_statements`
- Create additional indexes for common queries

### Redis
- Monitor memory usage: `docker-compose exec redis redis-cli INFO memory`
- Adjust `maxmemory` based on session volume
- Use Redis persistence appropriate for your needs

### Next.js
- Build tracker script: `npm run build:tracker`
- Enable production build: `npm run build && npm start`
- Monitor API response times (target: P95 < 100ms)

## CI/CD

This project includes automated continuous integration and deployment workflows:

### Continuous Integration (CI)

The CI pipeline (`.github/workflows/ci.yml`) runs on every push and pull request:

- **Linting**: ESLint checks for code quality
- **Build Verification**: Ensures the application builds successfully
- **Tracker Build**: Verifies the tracking script builds correctly
- **Artifact Upload**: Saves build artifacts for inspection

Runs on: Node.js 20.10.0

### Continuous Deployment (CD)

The deployment workflow (`.github/workflows/deploy.yml`) automates production deployments:

- Automated deployment to production servers
- Health checks and verification
- Rollback capabilities

See [.github/workflows/](./.github/workflows/) for complete workflow configurations.

## License

MIT License - See [LICENSE](./LICENSE) file for details.

Copyright (c) 2025 frankdevlab

## Contributing

Contributions are welcome! This is a privacy-focused analytics platform, so please ensure any contributions maintain the privacy-first approach.

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm test && npm run lint`)
5. Commit your changes with descriptive messages
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow the existing code style (enforced by ESLint)
- Write tests for new features
- Update documentation as needed
- Maintain privacy-first principles (no cookies, no personal data storage)

## Support

For issues, questions, or contributions:

- **Issues**: Open an issue on GitHub
- **Documentation**: See [deployment/README.md](./deployment/README.md) for deployment help
- **Tracker Documentation**: See `app/public/tracker.js` for tracking script details
