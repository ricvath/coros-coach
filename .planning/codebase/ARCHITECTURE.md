# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Single-class SDK wrapper with utility functions

**Key Characteristics:**
- Encapsulation of COROS API in a single main class (`CorosApi`)
- HTTP client abstraction using `ky` for standard API calls and `axios` for multipart uploads
- Separation of concerns via utility modules for compression, S3 operations, and file system operations
- Client-side token management for session persistence
- Configuration-driven behavior for multi-region STS support

## Layers

**API Client Layer:**
- Purpose: Wraps HTTP communication with COROS service endpoints
- Location: `src/CorosApi.ts`
- Contains: API method implementations, credential management, authentication logic
- Depends on: `ky`, `axios`, Node.js `crypto` and `fs` modules, configuration
- Used by: Application code instantiating the SDK

**Configuration Layer:**
- Purpose: Provides constants and configuration values for API endpoints and STS buckets
- Location: `src/config.ts`
- Contains: API URLs, STS regional configurations, encryption salt value, app credentials
- Depends on: Types from `src/types`
- Used by: `CorosApi` class for endpoint and credential initialization

**Type Definitions Layer:**
- Purpose: Defines all request and response interfaces, enums, and data structures
- Location: `src/types/index.ts`, `src/types/activity.ts`
- Contains: Login responses, activity data, file types, bucket credentials structures
- Depends on: None
- Used by: API client, utility functions for type safety

**Utility Layer:**
- Purpose: Provides reusable file operations, compression, and cloud storage handling
- Location: `src/utils/` (index.ts, compress.ts, s3.ts)
- Contains:
  - `index.ts`: File existence checks, directory creation, file I/O operations
  - `compress.ts`: ZIP file creation and MD5 hashing using JSZip and Node crypto
  - `s3.ts`: S3 upload/download operations using AWS SDK
- Depends on: Node.js fs, path modules, AWS SDK, JSZip
- Used by: `CorosApi` for file operations and cloud transfers

**Public API Layer:**
- Purpose: Exports public interface for library consumers
- Location: `src/index.ts`
- Contains: Re-exports of main class, utilities, and types
- Depends on: All internal modules
- Used by: External consumers of the `coros-connect` package

## Data Flow

**Authentication Flow:**

1. Consumer instantiates `CorosApi` with credentials (from config file or constructor)
2. `login()` is called with email/password (optional if already set)
3. Password is MD5-hashed via Node.js `crypto`
4. `ky` HTTP client POST to `account/login` endpoint
5. Response contains `accessToken` stored in `_accessToken` private field
6. Token can be persisted via `exportTokenToFile()` or loaded via `loadTokenByFile()`

**Activity Download Flow:**

1. Consumer calls `getActivitiesList()` with pagination parameters
2. Request includes `accessToken` in headers
3. Response contains activity summaries with `labelId`
4. Consumer calls `getActivityDownloadFile()` with activity ID and file type
5. API returns `fileUrl` (pre-signed S3 URL)
6. Consumer uses `downloadFile()` utility to stream file from URL to disk

**Activity Upload Flow:**

1. Consumer calls `uploadActivityFile()` with file path and user ID
2. `getBucketData()` retrieves STS credentials (temporary S3 access) from FAQ API
3. File is read and MD5 hash calculated via `calculateMd5()`
4. File is zipped with `zip()` utility using JSZip
5. Zipped file uploaded to S3 using AWS SDK `PutObjectCommand`
6. Metadata is sent via `axios` multipart form to `activity/fit/import` endpoint

**State Management:**

- Instance-level state: `_credentials`, `_accessToken`, configuration values
- All API calls require authenticated session (validated by `_accessToken` presence)
- Token persistence is manual via file I/O utilities
- No global state; each `CorosApi` instance is independent

## Key Abstractions

**CorosApi Class:**
- Purpose: Facade for COROS API interactions
- Examples: `src/CorosApi.ts` (class definition)
- Pattern: Stateful class with private fields for credentials and access token, public methods for API operations
- Constructor accepts optional `CorosCredentials` object or loads from `coros.config.json` via `app-root-path`

**HTTP Clients:**
- Pattern: Multi-client approach
  - `ky` for simple GET/POST/PUT operations (standard REST calls)
  - `axios` for multipart form data (activity upload with file streams)
- Credentials passed differently: `ky` uses header objects, `axios` uses axios request config

**File Type Enum:**
- Purpose: Maps TypeScript type keys to numeric COROS API identifiers
- Location: `src/types/index.ts`
- Pattern: Enum with values like `fit = '4'`, `tcx = '3'` (numeric strings)
- Usage: `FileType[fileType]` pattern in API calls

**Activity Data Structure:**
- Purpose: Comprehensive typing for detailed activity response
- Location: `src/types/activity.ts`
- Pattern: Deeply nested interface hierarchy (Summary contains device details, frequency data, lap analysis, etc.)
- Scope: Single export `ActivityData` with 14+ nested interface definitions

## Entry Points

**Package Entry Point:**
- Location: `src/index.ts`
- Triggers: Imported by `import { CorosApi, ... } from 'coros-connect'`
- Responsibilities:
  - Re-exports `CorosApi` default export
  - Re-exports utility functions (`createDirectory`, `downloadFile`, `isDirectory`, `isFile`)
  - Re-exports all types and enums
  - Re-exports `ActivityData` type and `STSConfigs` config object

**Class Constructor:**
- Location: `src/CorosApi.ts` line 51-59
- Triggers: `new CorosApi(credentials?)` invocation
- Responsibilities:
  - Validates credentials provided or loaded from config file
  - Throws error if both are missing
  - Initializes private instance fields

**Build Entry Point:**
- Location: `tsup.config.ts`
- Output: Both CommonJS (`.cjs`) and ES Modules (`.mjs`) with TypeScript declarations
- Triggers: `npm run build` or prepublish hook

## Error Handling

**Strategy:** Synchronous throwing with async exception propagation

**Patterns:**
- Constructor validation: Throws synchronously if credentials missing
- Authentication validation: Throws if `_accessToken` undefined before API call
- HTTP errors: Propagated from `ky` and `axios` as-is (no custom handling)
- File operations: Throws from Node.js fs operations (directory not found, file not found)
- Response status checking: Checks `response.result === '0000'` for Coros-specific success, throws with `response.message` on failure
- File type validation: Throws if file extension is not `.fit` or `.tcx`

## Cross-Cutting Concerns

**Logging:** None - library relies on consumer to handle logging

**Validation:**
- Credentials presence check (constructor, login)
- Access token presence check (every authenticated API call)
- File path validation (isFile, isDirectory checks)
- File extension validation (uploadActivityFile restricts to .fit and .tcx)

**Authentication:**
- MD5 password hashing before transmission
- Access token in request headers for all authenticated endpoints
- Session token persistence via file system
- Token reuse across instances via `loadTokenByFile()`

**Configuration:**
- Pluggable via `config()` method after construction
- Supports regional STS configurations (EN, EU, CN)
- Configurable API URLs, app ID, sign value, salt for decryption
- Defaults to EN region with hardcoded app credentials
