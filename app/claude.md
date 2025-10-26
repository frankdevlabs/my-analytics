# Project Context

## Tech Stack
- Next.js 16 (App Router): https://nextjs.org/blog/next-16
- TypeScript (strict mode)
- PostgreSQL + Prisma ORM
- Redis (caching)
- NextAuth.js (authentication)
- Tailwind CSS + shadcn/ui

## Project Structure
- `src/app/` - Next.js App Router pages and layouts
  - `api/` - API routes
    - `auth/` - NextAuth.js authentication endpoints
    - `track/` - Analytics tracking endpoints
  - `login/` - Login page
- `src/components/` - React components
  - `ui/` - shadcn base components
  - `auth/` - Authentication components
  - `charts/` - Analytics chart components
  - `theme/` - Theme provider and components
  - `__tests__/` - Component tests
- `src/hooks/` - Custom React hooks
- `src/config/` - Configuration files
- `src/lib/` - Client-side utilities
- `src/__tests__/` - Test files
- `lib/` - Server-side business logic and utilities
  - `auth/` - Authentication logic
  - `db/` - Database access layer (DAL)
  - `validation/` - Zod schemas and validators
  - `privacy/` - Privacy and data anonymization
  - `geoip/` - Geolocation services
  - `user-agent/` - User agent parsing
  - `jobs/` - Background job processing
  - `config/` - Server configuration
- `prisma/` - Database schema and migrations
- `public/` - Static files (tracker.js)
- `scripts/` - Build and utility scripts
- `types/` - TypeScript type definitions
- `docs/` - Project documentation

## Next.js 16 Specific Guidance

### Critical Breaking Changes
1. **Use `proxy.ts` instead of `middleware.ts`**
   - Middleware has been renamed to proxy.ts
   - Export function must be named `proxy` instead of `middleware`
   - Runs on Node.js runtime with clearer network boundary semantics
   - Example: `export async function proxy(request: NextRequest) { ... }`

2. **Async Request APIs (REQUIRED)**
   - Route params: `const { id } = await params` (NOT synchronous)
   - Search params: `const searchParams = await params` (NOT synchronous)
   - Cookies: `const cookieStore = await cookies()`
   - Headers: `const headersList = await headers()`
   - Draft mode: `const draft = await draftMode()`

3. **Turbopack is Default**
   - Development and production builds use Turbopack by default
   - Opt-out with `next build --webpack` if needed
   - Expect 2-5x faster production builds

### New Caching Model
- Use `"use cache"` directive for opt-in caching (replaces automatic caching)
- `revalidateTag(tag, cacheLife)` now requires cacheLife profile parameter
- `updateTag(tag)` for read-your-writes semantics in Server Actions
- `refresh()` refreshes only uncached data

### React 19 Features Available
- View Transitions for animated element updates
- `useEffectEvent()` for non-reactive logic extraction
- Activity component for background rendering

## Development Standards

### Code Style
1. Use TypeScript strict mode
2. Prefer Server Components by default
3. Add 'use client' only when needed
4. Keep components under 200 lines
5. Extract complex logic to custom hooks

### Security Rules (NON-NEGOTIABLE)
1. All database access MUST go through DAL functions
2. All user inputs MUST be validated with Zod
3. Never commit secrets - use .env with .gitignore
4. Never include sensitive data in logs
5. Implement rate limiting on auth endpoints

### Testing Requirements
1. 80% minimum code coverage
2. Unit tests for all business logic
3. Integration tests for API routes
4. E2E tests for critical user flows

### Git Workflow
- Branch naming: `feature/`, `bugfix/`, `refactor/`
- Commit messages: Conventional Commits format
- All PRs require passing tests + human review

## Instructions for Claude
1. Prefer small, focused diffs (under 200 lines)
2. Explain complex logic with comments
3. Ask when requirements are unclear
4. Update tests whenever you change code
5. Never modify files outside the current feature scope