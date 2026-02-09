# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Hardcoded API Credentials and Constants:**
- Issue: API key, app ID, and signing key are hardcoded as public class properties in the main API client
- Files: `src/CorosApi.ts` (lines 48-49)
  ```typescript
  private _sign = 'E34EF0E34A498A54A9C3EAEFC12B7CAF';
  private _appId = '1660188068672619112';
  ```
- Impact: These constants are exposed in the distributed package and appear to be derived from reverse engineering. If COROS changes these values, all users must update the package. No dynamic discovery or fallback mechanism exists.
- Fix approach: Move to configuration file or environment-based lookup. Consider implementing a version check mechanism to notify users of required updates when API changes occur.

**Date Parameter Bug in getActivitiesList:**
- Issue: The `to` parameter uses `from` variable instead of `to` when building search params
- Files: `src/CorosApi.ts` (line 176)
  ```typescript
  if (to) {
    searchParams.append('endDay', dayjs(from).format('YYYYMMDD')); // Should use 'to'
  }
  ```
- Impact: Date range filtering for activities is broken. Users cannot filter by end date; the end date will always match the start date if provided.
- Fix approach: Change `dayjs(from)` to `dayjs(to)` on line 176.

**Mixed HTTP Client Usage:**
- Issue: Codebase uses both `ky` and `axios` for HTTP requests
- Files: `src/CorosApi.ts` (lines 4, 117, 319)
- Impact: Increased bundle size, inconsistent error handling and timeout behavior, harder to maintain. Axios is used specifically for file upload (line 319) with a comment "use axios because it does not work with other packages" but no explanation of the actual issue.
- Fix approach: Investigate why axios is required for multipart form data uploads with ky. If ky cannot be replaced, document the specific limitation clearly. Consider creating a unified HTTP client abstraction.

**No Error Handling for Async File Operations:**
- Issue: Download and pipe operations lack error handling
- Files: `src/utils/index.ts` (lines 13-18), `src/utils/s3.ts` (line 38)
  - downloadFile: Response check is basic, stream pipe has no error handler
  - downloadFromS3: Pipe operation has no error handling; stream errors will be silent
- Impact: Failed downloads may not be detected. Users won't know if file write failed or stream was interrupted.
- Fix approach: Add error handlers to Readable streams and pipe operations. Return promises that reject on stream errors.

**No Token Expiration Handling:**
- Issue: Access tokens are stored but have unknown expiration; API provides no way to check token validity
- Files: `src/CorosApi.ts` (lines 42, 107-134)
- Impact: Stored tokens become invalid without user knowledge. Users manually checking status codes is not a sustainable approach (as noted in README line 84).
- Fix approach: Implement automatic token refresh on 401 responses, or provide a token validation method. Document token lifetime and rotation strategy.

**Unneeded Direct File System Access:**
- Issue: Directory and file creation logic in API class using absolute paths
- Files: `src/CorosApi.ts` (lines 86-105)
- Impact: Inflexible for testing; harder to use in restricted environments (cloud functions, sandboxed containers). Token file handling assumes writable filesystem at arbitrary paths.
- Fix approach: Provide token storage abstraction/interface allowing custom implementations (e.g., memory, database, env vars).

**Biome Ignore Without Explanation:**
- Issue: Explicit biome-ignore comment with empty explanation
- Files: `src/utils/index.ts` (line 28)
  ```typescript
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ```
- Impact: The `any` type usage is unreviewed. Future maintainers cannot understand why the linting rule was suppressed.
- Fix approach: Add actual explanation of why `any` is necessary for the `writeToFile` function's `data` parameter, or properly type it.

## Known Bugs

**Date Range Filter Broken:**
- Symptoms: Passing both `from` and `to` dates to `getActivitiesList()` results in activities filtered only by start date; end date is ignored
- Files: `src/CorosApi.ts` (line 176)
- Trigger: Call `coros.getActivitiesList({ from: new Date('2024-01-01'), to: new Date('2024-01-31') })`
- Workaround: Only use `from` parameter; post-filter results in application code if end date filtering needed

**Non-Public API Dependency:**
- Symptoms: Library functionality may break without warning if COROS updates internal API
- Files: All methods in `src/CorosApi.ts`
- Trigger: COROS updates their API endpoints or authentication mechanism
- Workaround: Repository maintainer must release updated package with new constants/endpoints

## Security Considerations

**Hardcoded Reverse-Engineered API Constants:**
- Risk: Package distribution includes hardcoded signing keys and app IDs obtained through reverse engineering. COROS could:
  - Rotate these values breaking all clients
  - Detect and block requests from this library
  - Issue cease-and-desist to repository
- Files: `src/config.ts` (lines 22, 24, 26), `src/CorosApi.ts` (lines 48-49)
- Current mitigation: Version control and npm releases allow rapid updates
- Recommendations:
  - Add version checking/deprecation warnings in the library
  - Consider implementing an update notification system
  - Document that this is an unofficial/unsupported interface

**Credentials Storage:**
- Risk: Token file stored in plaintext on filesystem
- Files: `src/CorosApi.ts` (lines 86-91, 93-105)
- Current mitigation: Responsibility placed on user to secure token directory
- Recommendations:
  - Document secure storage practices
  - Consider encryption option for saved tokens
  - Add warnings when exporting tokens about security implications

**Session Invalidation Cross-Client:**
- Risk: Logging in via web dashboard invalidates all library tokens; logging in via library logs out web session
- Files: README documentation (line 84), `src/CorosApi.ts` (line 107)
- Current mitigation: None - documented as limitation
- Recommendations:
  - Implement session detection and automatic re-authentication
  - Consider supporting multiple concurrent sessions if API allows

**No HTTPS Enforcement or Certificate Pinning:**
- Risk: Using standard HTTPS without additional verification
- Files: `src/config.ts` (lines 24, 26)
- Current mitigation: Standard TLS/HTTPS
- Recommendations: Document that users should validate HTTPS certificates in production environments

## Performance Bottlenecks

**Full File Read for MD5 Calculation:**
- Problem: Computing MD5 requires reading entire file into memory
- Files: `src/utils/compress.ts` (lines 17-20), `src/CorosApi.ts` (line 298)
- Cause: `readFileSync` loads complete file before hashing
- Improvement path: Use streaming hash computation for large files to reduce memory footprint
- Impact: Large activity files (50MB+) could cause memory spikes

**No Connection Pooling or Request Batching:**
- Problem: Each API call creates independent HTTP connections
- Files: `src/CorosApi.ts` (multiple ky.get/post calls)
- Cause: `ky` client created fresh for each request via `prefixUrl`
- Improvement path: Create reusable ky instance with authentication headers and connection reuse
- Impact: Slower performance when downloading multiple activities sequentially

**Zip Compression in Memory:**
- Problem: JSZip generates entire ZIP file in memory before S3 upload
- Files: `src/utils/compress.ts` (lines 5-15), `src/CorosApi.ts` (line 299)
- Cause: Using `generateAsync({ type: 'blob' })` then converting to buffer
- Improvement path: Stream ZIP creation directly to S3 using multipart uploads
- Impact: Memory usage proportional to file size during upload

**No Caching of Bucket Credentials:**
- Problem: `getBucketData()` makes API call every time a file is uploaded
- Files: `src/CorosApi.ts` (lines 234-249, 291)
- Cause: No credential caching or expiration tracking
- Improvement path: Cache credentials with TTL based on `TokenExpireTime` response field
- Impact: Unnecessary API calls and slower uploads when handling multiple files

## Fragile Areas

**HTTP Error Handling Minimal:**
- Files: `src/CorosApi.ts` (lines 117-133)
- Why fragile: Method throws on `result !== '0000'` but doesn't distinguish between error types (auth, validation, server, etc.)
- Safe modification: Check specific result codes before throwing; provide structured error objects indicating error category
- Test coverage: No tests for error responses

**S3 Pipe Without Completion Guarantee:**
- Files: `src/utils/s3.ts` (line 38)
- Why fragile: `pipe()` doesn't return a promise; caller has no way to know when file write completes
- Safe modification: Wrap in explicit promise and handle stream close/error events
- Test coverage: No tests for download failures or partial file scenarios

**Type Definition Drift from API:**
- Files: `src/types/activity.ts` (entire file)
- Why fragile: 378 lines of manually defined response types with many `unknown[]` fields and optional fields scattered throughout
- Safe modification: Add runtime validation when parsing API responses; update types only after confirming API structure changes
- Test coverage: No validation tests

**Credential Update Without Re-authentication:**
- Files: `src/CorosApi.ts` (lines 82-84)
- Why fragile: `updateCredentials()` changes email/password but doesn't update access token or validate new credentials
- Safe modification: Either remove this method or make it trigger re-login
- Test coverage: No tests

**Empty Catch Block:**
- Files: `src/CorosApi.ts` (lines 32-36)
  ```typescript
  try {
    config = appRoot.require('/coros.config.json');
  } catch (e) {
    // Do nothing
  }
  ```
- Why fragile: Silent failure masks configuration problems; makes debugging difficult
- Safe modification: Log warning if config file exists but fails to parse; only suppress file-not-found errors
- Test coverage: No tests

## Scaling Limits

**Pagination Not Validated:**
- Current capacity: `getActivitiesList` accepts `page` and `size` parameters with no bounds checking
- Limit: Unknown - API may reject `size > 100` or `page > max_pages`
- Scaling path: Add input validation for page/size ranges; implement cursor-based pagination if supported by API

**No Concurrent Request Limiting:**
- Current capacity: No rate limiting or concurrency control in library
- Limit: COROS API will return 429 (too many requests) - mentioned in README line 54
- Scaling path: Implement request queue with configurable concurrency and exponential backoff

**Memory for Large Activity Lists:**
- Current capacity: Entire activity list response stored in memory
- Limit: Unknown - response size depends on `size` parameter
- Scaling path: Implement async generators or stream-based response handling

## Dependencies at Risk

**Axios 1.7.9 - Pinned and Outdated:**
- Risk: Latest is 1.7.9 (no 2.x yet); pinned version may have unpatched vulnerabilities
- Impact: File upload functionality uses this specific version with no flexibility
- Migration plan: Monitor axios releases; upgrade when 2.x stabilizes or security patches released

**JSZip 3.10.1 - Low Activity:**
- Risk: Library has infrequent updates; DOM/browser APIs may change breaking Node.js builds
- Impact: Activity file compression depends on this
- Migration plan: Consider node-zip or native zlib-based alternative if JSZip becomes unmaintained

**AWS SDK v3 (@aws-sdk/client-s3 3.750.0):**
- Risk: Version is older (current is 3.600+); may have fixed CVEs
- Impact: S3 uploads security and functionality
- Migration plan: Update to latest stable 3.x version; test against mocked S3 endpoints

**app-root-path 3.1.0:**
- Risk: Depends on multiple fs resolution mechanisms; may break on non-standard Node.js installations
- Impact: Configuration file loading
- Migration plan: Replace with `import.meta.url` + `fileURLToPath()` for ES modules (already using `type: "module"`)

## Missing Critical Features

**No Connection Timeout Configuration:**
- Problem: Default timeouts may be too long or too short for different network conditions
- Blocks: Users cannot tune performance in poor network conditions
- Current: Only axios upload has explicit 60s timeout (line 327)

**No Retry Mechanism:**
- Problem: Transient network failures cause immediate failure
- Blocks: Using library in unreliable network conditions
- Current: No automatic retries; users must implement wrapping

**No Activity Data Validation:**
- Problem: Response types are incomplete and not validated
- Blocks: Silent type errors when API adds/removes fields
- Current: `unknown[]` fields indicate incomplete type coverage

**No Structured Logging:**
- Problem: Only console output available; no log levels or custom handlers
- Blocks: Integration with structured logging systems (ELK, DataDog, etc.)
- Current: `example/index.ts` uses bare console.log

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: All core functionality - login, API calls, file operations, compression, S3 upload
- Files: Entire `src/` directory
- Risk: Regressions in date filtering, error handling, and API response parsing go undetected
- Priority: High

**No Integration Tests:**
- What's not tested: Full upload/download workflows, token management, credential handling
- Files: `src/CorosApi.ts` core methods
- Risk: Breaking changes to multi-step workflows (e.g., authenticate → compress → upload) only discovered in production
- Priority: High

**No Mock/Stub for API:**
- What's not tested: Behavior with COROS API errors, timeouts, invalid responses
- Files: `src/CorosApi.ts` (lines 117-350)
- Risk: Incorrect error handling discovered too late
- Priority: High

**No Type Validation Tests:**
- What's not tested: API response parsing against actual response shapes
- Files: `src/types/` definitions
- Risk: Type errors from API changes go undetected until user encounters them
- Priority: Medium

---

*Concerns audit: 2026-02-08*
