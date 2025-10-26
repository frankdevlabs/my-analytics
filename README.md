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

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 17.6
- **Cache/Session Store**: Redis 7.4
- **Authentication**: NextAuth.js v5
- **Charts**: Recharts
- **UI Components**: shadcn/ui + Radix UI

## Prerequisites

- Node.js 20+ (LTS recommended)
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

```bash
cd app
cp .env.example .env
```

Edit `app/.env` and configure:
- `DATABASE_URL`: Already set to `postgresql://postgres:password@localhost:5432/my_analytics`
- `REDIS_URL`: Already set to `redis://localhost:6379`
- `AUTH_SECRET`: Generate with `openssl rand -base64 32`
- `AUTH_URL`: Set to `http://localhost:3000` (or your port)
- `MAXMIND_LICENSE_KEY`: Get from https://www.maxmind.com/en/geolite2/signup
- `FIRST_USER_EMAIL`, `FIRST_USER_PASSWORD`, `FIRST_USER_NAME`: Your admin credentials

### 4. Install dependencies

```bash
cd app
npm install
```

### 5. Setup MaxMind GeoIP database

```bash
cd app
npx tsx scripts/setup-geoip.ts
```

This downloads the GeoLite2-Country database (~6MB) to `app/lib/geoip/`.

### 6. Run database migrations

```bash
cd app
npx prisma migrate deploy
```

This will automatically create the first user account using your environment variables.

### 7. Start the development server

```bash
cd app
npm run dev
```

The application will be available at http://localhost:3000 (or port specified in your .env).

### 8. Add tracking script to your website

Add this script tag to your website's HTML:

```html
<script src="https://your-domain.com/tracker.min.js" defer></script>
```

For local testing:
```html
<script src="http://localhost:3000/tracker.min.js" defer></script>
```

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
├── docker-compose.yml          # Infrastructure services (PostgreSQL, Redis)
├── .env.docker.example         # Docker configuration documentation
├── DEPLOYMENT.md               # Production deployment checklist
├── app/                        # Next.js application
│   ├── src/                    # Application source code
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── api/track/      # Analytics tracking endpoints
│   │   │   ├── dashboard/      # Analytics dashboard UI
│   │   │   └── (auth)/         # Authentication pages
│   │   ├── components/         # React components
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── charts/         # Recharts visualizations
│   │   │   └── theme/          # Theme provider
│   │   ├── config/             # Configuration files
│   │   └── lib/                # Utility functions
│   ├── lib/                    # Business logic (root level)
│   │   ├── privacy/            # Visitor tracking & hashing
│   │   ├── db/                 # Database query helpers
│   │   ├── jobs/               # Background jobs
│   │   ├── validation/         # Zod schemas
│   │   └── geoip/              # MaxMind GeoIP database
│   ├── prisma/                 # Database schema & migrations
│   ├── public/                 # Static assets
│   │   └── tracker.js          # Client-side tracking script
│   └── scripts/                # Utility scripts
│       ├── setup-geoip.ts      # GeoIP database downloader
│       ├── create-first-user.ts # User creation
│       ├── import-csv.ts       # CSV data importer
│       └── build-tracker.js    # Tracker script minifier
```

## Available Scripts

### Root Level
```bash
npm run import:csv          # Import CSV data (proxies to app)
```

### App Directory (`cd app`)
```bash
npm run dev                 # Start dev server (port 3000)
npm run build               # Build for production
npm run start               # Start production server
npm run lint                # Run ESLint
npm run test                # Run Jest tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
npm run create-user         # Create first user manually
npm run db:seed             # Seed database with test data
npm run import:csv          # Import pageviews from CSV
npm run migrate             # Run migrations (production)
npm run migrate:dev         # Run migrations (development)
```

## Docker Configuration

### Services

**PostgreSQL 17.6-alpine**
- Port: `5432`
- Database: `my_analytics`
- User: `postgres`
- Password: `password` (change in production!)
- Memory: 1GB limit, 512MB reserved
- Persistent volume: `my-analytics-postgres-data`

**Redis 7.4-alpine**
- Port: `6379`
- Max memory: 256MB
- Eviction policy: `allkeys-lru`
- Persistence: AOF (append-only file)
- Memory: 512MB limit, 128MB reserved
- Persistent volume: `my-analytics-redis-data`

### Resource Limits

The default configuration is suitable for development on modern laptops. Adjust in `docker-compose.yml` if needed:

```yaml
deploy:
  resources:
    limits:
      memory: 1G        # Maximum memory
    reservations:
      memory: 512M      # Guaranteed memory
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

See [DEPLOYMENT.md](./DEPLOYMENT.md) for a comprehensive production deployment checklist including:
- Database migration procedures
- Redis configuration
- Environment variable setup
- Health monitoring
- Performance tuning
- Rollback procedures

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

## License

[Your License Here]

## Contributing

[Your Contributing Guidelines Here]

## Support

[Your Support Information Here]
