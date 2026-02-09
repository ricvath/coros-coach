# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Coros Training Hub API:**
- Authentication endpoint - `/account/login`
  - SDK/Client: `ky` (HTTP client)
  - Auth: Credentials in request body (email, password as MD5 hash)
- Account query - `/account/query`
  - SDK/Client: `ky`
  - Auth: `accessToken` header
- Activity queries - `/activity/query`, `/activity/detail/query`, `/activity/detail/download`
  - SDK/Client: `ky`
  - Auth: `accessToken` header
- Activity management - `/activity/delete`, `/activity/fit/import`, `/activity/fit/deleteSportImport`, `/activity/fit/getImportSportList`
  - SDK/Client: `ky` for GET/POST, `axios` for multipart FormData upload
  - Auth: `accessToken` header (or `AccessToken` for uploads)

**Coros FAQ/STS API:**
- STS credentials endpoint - `/openapi/oss/sts`
  - SDK/Client: `ky`
  - Auth: Request parameters (app_id, sign - hardcoded values)
  - Returns: Base64-encoded S3/OSS credentials with salted encoding

## Data Storage

**Object Storage:**
- **AWS S3** (EN/EU regions)
  - Bucket: `coros-s3` (EN), `eu-coros` (EU)
  - Client: `@aws-sdk/client-s3`
  - Region: Determined by STS response
  - Operations: Upload activity files (PutObjectCommand), download activity files (GetObjectCommand)
  - Credentials: Temporary STS credentials from Coros FAQ API

- **Aliyun OSS** (CN region)
  - Bucket: `coros-oss`
  - Status: Not implemented
  - Expected client: Aliyun SDK

**File Storage:**
- Local filesystem for:
  - Token persistence (`token.txt`)
  - Activity file uploads/downloads
  - Configuration (`coros.config.json`)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- Coros (custom)
  - Implementation: Email/password login with MD5 password hashing
  - Token: `accessToken` returned from login response
  - Token storage: File-based (optional `token.txt`) or in-memory
  - Limitations:
    - Token expiration not provided by API
    - Token invalidated when user logs in via web/mobile
    - Token can expire at any time

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- Application level only (no external logging service)

## CI/CD & Deployment

**Hosting:**
- Not applicable (library package, published to npm via GitHub Packages)

**Publishing:**
- Registry: GitHub Packages (`@jmn8718:registry=https://npm.pkg.github.com`)
- Published as: `coros-connect` package

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None (all configuration via API credentials or config file)

**Secrets location:**
- `coros.config.json` file (contains email/password) - Git ignored
- Token file location configurable by user - Git ignored pattern `*.txt`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Data Flow

**Login Flow:**
1. User calls `login(email, password)` on CorosApi
2. POST to `/account/login` with MD5-hashed password
3. Returns `accessToken` stored in-memory or exported to file

**Activity Retrieval:**
1. User calls `getActivitiesList()` or `getActivityDetails()`
2. GET to `/activity/query` or POST to `/activity/detail/query`
3. Header: `accessToken`
4. Returns activity metadata and detailed information

**Activity Upload:**
1. User calls `uploadActivityFile(filePath, userId)`
2. Internal call to `getBucketData()` via `/openapi/oss/sts`
3. Receive temporary AWS S3 credentials
4. File is compressed with jszip (preserves original filename structure)
5. POST to `/activity/fit/import` via axios with FormData (includes file metadata)
6. File simultaneously uploaded to S3 via `PutObjectCommand`

**Activity Download:**
1. User calls `getActivityDownloadFile()`
2. POST to `/activity/detail/download`
3. Returns presigned S3 URL
4. User can download via `downloadFile()` utility (streaming via createWriteStream)

## Regional Configuration

**S3 Configuration (STS):**
```typescript
STSConfigs = {
  EN: { env: 'en.prod', bucket: 'coros-s3', service: 'aws' },
  CN: { env: 'cn.prod', bucket: 'coros-oss', service: 'aliyun' },
  EU: { env: 'eu.prod', bucket: 'eu-coros', service: 'aws' }
}
```

Selectable via `coros.config({ stsConfig: STSConfigs.EU })`

## API Integration Details

**Request Authentication:**
- All Coros API requests use standard HTTP header `accessToken`
- Upload endpoint uses `AccessToken` (uppercase A)
- STS endpoint uses query parameters for app authentication

**Response Format:**
- All responses follow standard structure:
  ```
  {
    result: '0000' (success) | string (error code),
    message: string,
    data: { ... },
    apiCode?: string,
    tlogId?: string (error responses)
  }
  ```

**Error Handling:**
- Login errors return `result: '1030'` with `LoginErrorResponse` type
- Success errors are distinguished by `result: '0000'`
- HTTP errors from ky/axios are thrown directly

**File Formats Supported:**
- Upload: `.fit`, `.tcx`
- Download: `fit`, `tcx`, `gpx`, `kml`, `csv`

---

*Integration audit: 2026-02-08*
