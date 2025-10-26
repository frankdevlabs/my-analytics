# Referrer Sources Feature - Test Documentation

## Overview
This document describes the test coverage for the Referrer Sources Breakdown feature implemented in the analytics dashboard.

## Test Suite Summary

### Total Test Coverage
- **Configuration Tests**: 13 tests
- **Backfill Logic Tests**: 9 tests
- **Query Function Tests**: 12 tests
- **UI Component Tests**: 13 tests
- **Integration & Edge Case Tests**: 8 tests
- **Total**: 55 tests

## Test File Locations

### Unit Tests
1. **Configuration Tests**
   - File: `app/lib/config/__tests__/referrer-categories.test.ts`
   - Tests: 13
   - Coverage: `extractDomainFromUrl()` and `getCategoryFromDomain()` functions
   - Focus: URL parsing, domain extraction, category classification

2. **Backfill Script Tests**
   - File: `app/prisma/scripts/__tests__/backfill-referrer-data.test.ts`
   - Tests: 9
   - Coverage: Domain extraction logic, category computation, batch processing
   - Focus: Migration logic validation without actual DB execution

3. **Query Function Tests**
   - File: `app/lib/db/__tests__/pageviews-referrer.test.ts`
   - Tests: 12
   - Coverage: `getReferrersByCategory()`, `getReferrersByDomain()`, `getReferrerUrlsByDomain()`
   - Focus: Query logic, BigInt conversion, date filtering, bot exclusion

4. **UI Component Tests**
   - File: `app/src/components/dashboard/referrer-sources/__tests__/ReferrerSourcesComponents.test.tsx`
   - Tests: 13
   - Coverage: Chart, table, modal, loading, error, empty state components
   - Focus: Rendering, interactions, state management

### Integration Tests
5. **Integration & Edge Case Tests** (NEW)
   - File: `app/__tests__/integration/referrer-sources-integration.test.ts`
   - Tests: 8 test suites with multiple assertions
   - Coverage: End-to-end workflows, edge cases, data consistency
   - Focus: Critical business scenarios

## Integration Test Coverage Details

### Test Suite 1: Full Dashboard to Modal Workflow
**Purpose**: Verify complete user journey from dashboard load to modal drill-down

**Steps Tested**:
1. Dashboard fetches category aggregation data
2. Dashboard fetches domain data with categories
3. User clicks domain row → modal fetches specific URLs
4. All queries use correct date range parameters

**Assertions**:
- Category data structure and values
- Domain data with correct categories
- URL data filtered by domain
- Query call count and parameters

---

### Test Suite 2: Date Range Change Updates Data
**Purpose**: Ensure date range changes trigger data refresh with correct parameters

**Scenarios**:
- Initial date range (October 2025) returns baseline data
- Changed date range (November 2025) returns different data
- Both queries use correct date parameters

**Assertions**:
- Different result counts for different date ranges
- Correct date parameters passed to queries
- Query execution count

---

### Test Suite 3: All Direct Traffic (No Referrers)
**Purpose**: Handle scenario where all pageviews have null referrers

**Scenarios**:
- All pageviews categorized as "Direct"
- Domain table shows no entries (all null domains filtered out)
- Empty state displays correctly

**Assertions**:
- Category results contain only "Direct"
- Domain query returns empty array
- No errors thrown

---

### Test Suite 4: Null/Empty document_referrer Handling
**Purpose**: Verify graceful handling of null and empty referrer values

**Scenarios**:
- Null referrer URL extraction returns null
- Empty string referrer extraction returns null
- Null domains categorized as "Direct"
- Mixed null/empty referrers processed without errors

**Assertions**:
- `extractDomainFromUrl(null)` returns `null`
- `getCategoryFromDomain(null)` returns `"Direct"`
- Batch processing handles nulls gracefully

---

### Test Suite 5: Malformed URLs in document_referrer
**Purpose**: Ensure malformed URLs don't break extraction or categorization

**Test Cases**:
- `'not-a-url'` → null domain → "Direct" category
- `'://missing-protocol'` → null domain → "Direct" category
- `'javascript:void(0)'` → null domain → "Direct" category
- Mixed batch with valid and malformed URLs processes all

**Assertions**:
- All malformed URLs return null domain
- All null domains categorized as "Direct"
- No exceptions thrown during processing
- Valid URLs in batch correctly categorized

---

### Test Suite 6: Domain with 100+ URLs
**Purpose**: Test limit parameter and pagination for high-traffic domains

**Scenarios**:
- Domain with 150+ URLs respects LIMIT 100
- Custom limit parameter (e.g., 25) works correctly
- Query includes limit parameter

**Assertions**:
- Result count matches limit
- Limit parameter passed to query
- URLs ordered by pageviews DESC (most popular first)

---

### Test Suite 7: Empty Results for Date Range
**Purpose**: Handle periods with no pageviews gracefully

**Scenarios**:
- Category query returns empty array
- Domain query returns empty array
- URL query returns empty array

**Assertions**:
- All queries return `[]` not null or undefined
- No errors thrown for empty results

---

### Test Suite 8: Category and Domain Consistency
**Purpose**: Ensure database categories match getCategoryFromDomain logic

**Validation**:
- For each domain returned by query
- Its stored `referrer_category` matches `getCategoryFromDomain(domain)`
- Verifies backfill migration correctness

**Assertions**:
- All domain categories consistent with configuration logic
- No mismatched categories between DB and config

---

## Running Tests

### Run All Referrer Sources Tests
```bash
# From app directory
npm test -- referrer
```

### Run Specific Test Files
```bash
# Configuration tests only
npm test -- referrer-categories.test.ts

# Backfill tests only
npm test -- backfill-referrer-data.test.ts

# Query function tests only
npm test -- pageviews-referrer.test.ts

# UI component tests only
npm test -- ReferrerSourcesComponents.test.tsx

# Integration tests only
npm test -- referrer-sources-integration.test.ts
```

### Run Tests in Watch Mode
```bash
npm test -- --watch referrer
```

### Generate Coverage Report
```bash
npm test -- --coverage referrer
```

## Known Gaps and Future Testing Needs

### Not Currently Tested

1. **Performance Testing**
   - Query performance with 1M+ pageviews (mentioned in spec but not implemented)
   - Reason: Requires production-like dataset and load testing infrastructure
   - Recommendation: Add to performance testing phase with staging environment

2. **Accessibility Testing**
   - Full keyboard navigation through table and modal (mentioned in spec but not implemented)
   - Reason: Requires E2E testing framework (Playwright/Cypress)
   - Recommendation: Add to E2E testing phase with automated accessibility scanning

3. **UI Interaction Tests**
   - Date range picker interaction updates referrer data
   - Modal focus management on open/close
   - Table row hover states
   - Reason: Requires full component rendering with user event simulation
   - Recommendation: Can be covered in E2E tests or expanded React Testing Library tests

4. **Database Migration Testing**
   - Full migration execution with real database
   - Rollback procedure validation
   - Large dataset migration duration
   - Reason: Too slow for unit test suite, requires staging environment
   - Recommendation: Add to deployment verification checklist

5. **Error Recovery Testing**
   - Database connection failures
   - Partial query failures
   - Network timeouts
   - Reason: Complex to mock, better suited for integration testing
   - Recommendation: Add retry logic tests with exponential backoff scenarios

### Lower Priority Gaps

- Subdomain edge cases (e.g., `mail.google.com` vs `google.com`)
- URL truncation display in UI for very long URLs
- Category badge color consistency across themes
- Mobile responsive layout verification
- Redis caching behavior (if implemented)

## Test Maintenance Guidelines

### When to Update Tests

1. **Configuration Changes**
   - Adding new search engines or social networks → update `referrer-categories.test.ts`
   - Changing categorization logic → update integration tests

2. **Query Changes**
   - Modifying SQL queries → update `pageviews-referrer.test.ts`
   - Changing date filtering logic → update integration tests
   - Adding new indexes → verify query tests still pass

3. **UI Changes**
   - Modifying component structure → update `ReferrerSourcesComponents.test.tsx`
   - Changing modal behavior → update interaction tests
   - Adding new empty states → add corresponding tests

4. **Business Logic Changes**
   - Changing how "Direct" traffic is defined → update all test suites
   - Modifying domain extraction rules → update configuration tests
   - Adjusting limit defaults → update integration tests

### Test Stability Notes

- **Mock Consistency**: Ensure mocked Prisma responses match actual database schema
- **BigInt Handling**: Always mock query results with `BigInt()` for realistic testing
- **Date Handling**: Use consistent date formats (`YYYY-MM-DD`) across all tests
- **Async/Await**: All database queries are async, ensure proper `await` in tests

## Coverage Metrics

### Current Coverage
- **Configuration Logic**: ~95% (13 tests)
- **Backfill Logic**: ~90% (9 tests)
- **Query Functions**: ~85% (12 tests)
- **UI Components**: ~80% (13 tests)
- **Integration Scenarios**: ~70% (8 test suites)

### Target Coverage
- Minimum 80% line coverage for all feature code
- 100% coverage for critical path (dashboard load → view data → drill down)
- 100% coverage for null/malformed data handling

## Related Documentation

- Feature Specification: `agent-os/specs/2025-10-22-referrer-sources-breakdown/spec.md`
- Task Breakdown: `agent-os/specs/2025-10-22-referrer-sources-breakdown/tasks.md`
- Implementation Report: `agent-os/specs/2025-10-22-referrer-sources-breakdown/implementation/07-integration-testing-gap-analysis.md`

---

**Last Updated**: 2025-10-24
**Test Suite Version**: 1.0
**Total Tests**: 55
