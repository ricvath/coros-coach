# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- TypeScript 5.7.2 - All source code

## Runtime

**Environment:**
- Node.js (target ES2022, platform node)

**Package Manager:**
- npm (with support for pnpm via pnpm-lock.yaml)
- Lockfile: Present (package-lock.json and pnpm-lock.yaml)

## Frameworks

**Core:**
- No web framework (library is for Node.js HTTP API client)

**Build/Dev:**
- tsup 8.4.0 - Builds CommonJS and ESM formats with dual package exports
- TypeScript 5.7.2 - Language and compilation
- tsx 4.19.3 - TypeScript execution for examples
- Biome 1.9.4 - Code formatting and linting

## Key Dependencies

**Critical:**
- ky 1.7.2 - Lightweight HTTP client (Fetch API wrapper) for Coros API calls
- axios 1.7.9 - HTTP client for multipart form data in activity uploads (FormData handling)
- @aws-sdk/client-s3 3.750.0 - AWS S3 client for activity file uploads
- jszip 3.10.1 - ZIP file creation for activity file compression
- dayjs 1.11.13 - Date formatting (YYYYMMDD format for Coros API date parameters)
- app-root-path 3.1.0 - Locates project root for loading `coros.config.json` credentials

**Infrastructure:**
- @types/node 22.10.0 - Node.js type definitions for file system and crypto operations
- @smithy/types - Type definitions for AWS SDK (included as transitive dependency)

## Configuration

**Environment:**
- Configuration can be provided via:
  - `coros.config.json` file in project root (email/password credentials)
  - Constructor parameters (CorosApi class)
  - `.config()` method on CorosApi instance
  - Environment-specific STS configs (EN/CN/EU regions with different S3 providers)

**Build:**
- `tsup.config.ts` - Outputs:
  - CommonJS: `dist/index.cjs` with `dist/index.d.cts` types
  - ESM: `dist/index.mjs` with `dist/index.d.ts` types
- `tsconfig.json` - Strict mode enabled, ES5 target for compatibility, source maps included
- `biome.json` - Code style:
  - 120 character line width
  - 2-space indentation (space)
  - Single quotes in JavaScript
  - Import organization enabled

## Platform Requirements

**Development:**
- Node.js runtime (any modern version)
- npm or pnpm for dependency management

**Production:**
- Node.js (ES2022 target, no browser support)
- AWS S3 access (for activity uploads) or Aliyun OSS (CN region)
- Network access to Coros API endpoints (`teamapi.coros.com`, `faq.coros.com`)

## API Endpoints

**Coros API:**
- Base: `https://teamapi.coros.com` (configurable via config method)
- FAQ/STS API: `https://faq.coros.com` (configurable)

**S3/Object Storage:**
- AWS S3 (EN/EU regions)
- Aliyun OSS (CN region - not implemented)

---

*Stack analysis: 2026-02-08*
