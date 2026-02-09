# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- PascalCase for class files: `CorosApi.ts` (main class exported as default)
- camelCase for utility/helper files: `compress.ts`, `s3.ts`, `index.ts`
- camelCase for directories: `src/utils/`, `src/types/`
- Lowercase with hyphens for config: `tsconfig.json`, `biome.json`

**Functions:**
- camelCase for function names: `downloadFile()`, `isDirectory()`, `calculateMd5()`, `getFileExtension()`
- camelCase for async functions: `login()`, `getAccount()`, `getActivitiesList()`, `uploadActivityFile()`
- Descriptive names with full words - no abbreviations except established ones (e.g., `md5`, `s3`)

**Variables:**
- camelCase for all variables: `filePath`, `accessToken`, `fileExtension`, `userId`
- Private class fields prefixed with underscore: `_credentials`, `_accessToken`, `_apiUrl`, `_salt`, `_sign`, `_appId`
- CONSTANT_CASE for module-level constants: `TOKEN_FILE = 'token.txt'`, `API_URL`, `FAQ_API_URL`, `salt`
- Descriptive names for search parameters: `searchParams`, `formData`

**Types:**
- PascalCase for interfaces: `CorosCredentials`, `ActivityResponse`, `LoginResponse`, `BucketDataResponse`
- PascalCase for enums: `FileType`
- camelCase for enum keys: `fit = '4'`, `tcx = '3'`
- Type aliases use `type` keyword: `type FileTypeKey = keyof typeof FileType`
- Request/response types use `Response` suffix: `LoginResponse`, `ActivityResponse`, `ActivityUploadResponse`

## Code Style

**Formatting:**
- Tool: Biome 1.9.4
- Indentation: 2 spaces
- Line width: 120 characters
- Quote style: Single quotes for JavaScript/TypeScript
- Semicolons: Required (enforced by Biome)

**Linting:**
- Tool: Biome with recommended rules enabled
- Style rules: Mostly recommended, `useImportType` rule disabled to allow `import` instead of `import type` where appropriate
- Biome ignore comments: Used sparingly with explanation comments
  - Example: `// biome-ignore lint/suspicious/noExplicitAny: <explanation>` in `src/utils/index.ts` line 28

## Import Organization

**Order:**
1. External dependencies (third-party packages): `import ky from 'ky'`, `import axios from 'axios'`, `import dayjs from 'dayjs'`
2. Node built-in modules: `import path from 'node:path'`, `import { readFileSync } from 'node:fs'`, `import { createHash } from 'node:crypto'`
3. Internal types: `import { ActivitiesResponse, ... } from './types'`
4. Internal utilities: `import { isDirectory, ... } from './utils'`
5. Internal modules: `import { API_URL, ... } from './config'`

**Path Aliases:**
- Not configured - uses relative paths throughout
- Relative imports use: `from './types'`, `from './utils'`, `from './config'`

**Example from `src/CorosApi.ts`:**
```typescript
import appRoot from 'app-root-path';
import ky from 'ky';
import dayjs from 'dayjs';
import axios from 'axios';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  ActivitiesResponse,
  ActivityDownloadResponse,
  ...
} from './types';
import { isDirectory, ... } from './utils';
import { calculateMd5, zip } from './utils/compress';
import { uploadToS3 } from './utils/s3';
import { API_URL, FAQ_API_URL, salt, STSConfigs } from './config';
```

Biome's `organizeImports` is enabled to enforce consistent ordering.

## Error Handling

**Patterns:**
- Validation occurs at method entry - guard clauses for missing/invalid state
- Throws standard `Error` with descriptive messages
- Method name prefixed in error message for context: `loadTokenByFile: Directory not found: ${directoryPath}`
- Pre-condition checks before async operations

**Examples:**
```typescript
// Parameter validation
if (!credentials) {
  throw new Error('Missing credentials');
}

// State validation
if (!this._accessToken) {
  throw new Error('Not logged in');
}

// File validation
if (!isDirectory(directoryPath)) {
  throw new Error(`loadTokenByFile: Directory not found: ${directoryPath}`);
}

// Format validation
if (fileExtension !== 'fit' && fileExtension !== 'tcx') {
  throw new Error('Only .fit or .tcx files supported');
}

// Response validation
if (response.result === '0000') {
  // success
} else {
  throw new Error(response.message);
}

// Silent error catching for optional config
try {
  config = appRoot.require('/coros.config.json');
} catch (e) {
  // Do nothing
}
```

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- Used only in example code in `example/index.ts`
- No logging in library code itself
- Console methods: `console.log()` for application-level logs

**Example from `example/index.ts`:**
```typescript
console.log('loading token from file');
console.log('exporting token to file');
```

## Comments

**When to Comment:**
- Comments used for API explanation and non-obvious behavior
- Describes the "why" not the "what" in complex scenarios
- URL examples provided for clarification

**Comment Patterns:**
```typescript
// api explanation
// this method fetches more data than activity but there is no other know option

// example explanation
// example of file url https://s3.coros.com/fit/XXX/YYY.fit

// coros uses the md5 of the activity file to identify the zip file

// hardcoded value explanation
// this value is hardcoded on the webapp file stsUpload.js

// known limitation
// use axios because it does not work with other packages

// field format explanation
// YYYYMMDD as a number
// if there is an error on the upload, this property exists
```

**JSDoc/TSDoc:**
- Not used in this codebase
- Type annotations are inline in code

## Function Design

**Size:** Functions are focused and single-purpose, range from 5-40 lines excluding empty lines

**Parameters:**
- Single parameter often passed as object for clarity: `{ filePath, fileUrl }`
- Default parameters used for optional values: `config: { ... } = {}`
- Optional method parameters marked with `?`: `email?: string, password?: string`
- Destructuring for named parameters preferred over positional

**Return Values:**
- Async methods return Promise-wrapped types: `Promise<ActivitiesResponse['data']>`
- Void return used for side-effects: `exportTokenToFile()` returns undefined
- Direct promise return without wrapping: `deleteActivity()` returns `ky.get(...).json()`
- Type extraction from response types: `return response.data`

**Example from `src/CorosApi.ts`:**
```typescript
public async getActivitiesList({
  page = 1,
  size = 20,
  from,
  to,
}: {
  page?: number;
  size?: number;
  from?: Date;
  to?: Date;
}): Promise<ActivitiesResponse['data']> {
  if (!this._accessToken) {
    throw new Error('Not logged in');
  }
  // implementation
  return response.data;
}
```

## Module Design

**Exports:**
- Default export for main class: `export default class CorosApi { ... }`
- Named exports for utilities: `export async function downloadFile(...) { ... }`
- Named exports for constants: `export const STSConfigs = ...`
- Named exports for types: `export interface CorosCredentials { ... }`
- Re-exports in barrel files (index.ts) for public API

**Barrel Files:**
- `src/index.ts` - Main entry point, re-exports public API
- `src/types/index.ts` - Centralized type definitions
- `src/utils/index.ts` - Utility function exports

**Example from `src/index.ts`:**
```typescript
export { default as CorosApi } from './CorosApi';
export { createDirectory, downloadFile, isDirectory, isFile } from './utils';
export * from './types';
export { ActivityData } from './types/activity';
export { STSConfigs } from './config';
```

---

*Convention analysis: 2026-02-08*
