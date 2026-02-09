# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**
- Not detected - No test framework is configured or in use

**Assertion Library:**
- Not applicable

**Run Commands:**
- No test scripts defined in `package.json`
- Package.json scripts: `build`, `example`, `format:check`, `format:fix`, `prepare`

**Status:** This is a library package with zero test infrastructure. No test files exist in the codebase.

## Test File Organization

**Location:**
- Not applicable - No test files present

**Naming:**
- No test file naming convention established

**Structure:**
- No test directory structure

## Test Structure

**Suite Organization:**
- Not applicable

**Patterns:**
- Not applicable

## Mocking

**Framework:**
- Not applicable

**Patterns:**
- Not applicable

**What to Mock:**
- Not applicable

**What NOT to Mock:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- Not applicable

**Location:**
- Not applicable

## Coverage

**Requirements:** Not enforced - No coverage tools configured

**View Coverage:**
- Not applicable

## Test Types

**Unit Tests:**
- Not present in codebase

**Integration Tests:**
- Not present in codebase

**E2E Tests:**
- Not present in codebase

## Common Patterns

**Async Testing:**
- Not applicable

**Error Testing:**
- Not applicable

## Testing Recommendations for Future Implementation

If tests are added to this project, consider the following patterns based on codebase structure:

**Unit Testing Areas:**
- `src/utils/compress.ts` - `calculateMd5()`, `zip()` functions for file operations
- `src/utils/index.ts` - File system utilities: `isFile()`, `isDirectory()`, `getFileExtension()`, `getFileName()`
- `src/utils/s3.ts` - S3 operations: `uploadToS3()`, `downloadFromS3()` (will need mocking)

**Integration Testing Areas:**
- `src/CorosApi.ts` - Main API client with all public methods (will need HTTP mocking)
- Authentication flow: `login()`, `loadTokenByFile()`, `exportTokenToFile()`
- Activity operations: `getActivitiesList()`, `getActivityDetails()`, `getActivityDownloadFile()`
- File operations: `uploadActivityFile()`, `deleteActivity()`

**Async Patterns Observed:**
- All API methods are async and return Promises
- File I/O uses both callback-based (`createWriteStream`) and promise-based approaches
- Most errors are thrown directly (no custom error types)

**Example API Methods to Test:**
```typescript
// From src/CorosApi.ts - async methods that would need HTTP mocking
public async login(email?: string, password?: string)
public async getAccount()
public async getActivitiesList({ page, size, from, to }: {...})
public async getActivityDetails(activityId: string)
public async uploadActivityFile(filePath: string, userId: string)

// Private method
private async getBucketData()
```

**Utilities to Test:**
```typescript
// From src/utils/index.ts
export async function downloadFile({ filePath, fileUrl }: {...})
export const isFile = (path: string) => ...
export const isDirectory = (directoryPath: string) => ...
export const createDirectory = (directoryPath: string) => ...
export const writeToFile = (filePath: string, data: any) => ...
export function getFileExtension(filePath: string)
export function getFileName(filePath: string)

// From src/utils/compress.ts
export const zip = (filePath: string, filename: string): Promise<Buffer> => ...
export function calculateMd5(filePath: string)

// From src/utils/s3.ts
export const uploadToS3 = async (filename: string, data: Buffer, params: BucketDataResponse)
export const downloadFromS3 = async (params: BucketDataResponse, Key: string, filePath: string)
```

**Mocking Strategy When Tests Are Added:**
- HTTP client (ky/axios): Mock HTTP responses for API calls
- File system: Use temp directories or mock fs module
- S3 operations: Mock AWS SDK S3Client
- Config loading: Mock app-root-path module

**Current Error Handling to Test:**
- Validation errors when credentials missing
- File not found errors
- Directory validation
- Extension validation (only .fit and .tcx allowed for upload)
- Login error responses from API
- File download errors
- Response status code validation (result === '0000')

---

*Testing analysis: 2026-02-08*
