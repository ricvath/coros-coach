# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
coros-connect/
├── src/                    # TypeScript source code
│   ├── index.ts            # Public API exports
│   ├── CorosApi.ts         # Main SDK class
│   ├── config.ts           # Configuration constants
│   ├── types/              # Type definitions and interfaces
│   │   ├── index.ts        # Response/request types, enums
│   │   └── activity.ts     # Activity data structure types
│   └── utils/              # Utility functions
│       ├── index.ts        # File system operations
│       ├── compress.ts     # ZIP and hashing utilities
│       └── s3.ts           # AWS S3 operations
├── example/                # Example usage
│   └── index.ts            # Complete workflow example
├── dist/                   # Build output (generated)
├── node_modules/           # Dependencies (ignored)
├── .github/                # GitHub configuration
│   └── workflows/          # CI/CD workflows
├── .planning/              # GSD planning documents
│   └── codebase/           # Codebase analysis (this directory)
├── .vscode/                # VS Code settings
├── package.json            # Package metadata and dependencies
├── package-lock.json       # Dependency lock file
├── pnpm-lock.yaml          # PNPM dependency lock
├── tsconfig.json           # TypeScript compiler options
├── tsup.config.ts          # Build tool configuration
├── biome.json              # Code formatter/linter config
├── .npmrc                  # NPM configuration
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
├── CHANGELOG.md            # Version history
└── LICENSE.md              # MIT license
```

## Directory Purposes

**src/**
- Purpose: Main source code directory
- Contains: TypeScript implementation files with strict typing
- Key files: `CorosApi.ts` (main class), `index.ts` (exports)

**src/types/**
- Purpose: Centralized type definitions
- Contains: API request/response interfaces, enums, data structures
- Key files: `index.ts` (core types), `activity.ts` (nested activity structures)

**src/utils/**
- Purpose: Reusable utility functions
- Contains: File system helpers, compression, cloud storage operations
- Key files: `index.ts` (fs), `compress.ts` (zip/hash), `s3.ts` (AWS)

**example/**
- Purpose: Reference implementation
- Contains: Complete example showing authentication, data retrieval, file operations
- Key files: `index.ts` (runnable example)

**dist/**
- Purpose: Compiled JavaScript output
- Contains: CommonJS, ES modules, and TypeScript declarations
- Generated: Yes (by `npm run build`)
- Committed: No (ignored in .gitignore)

**.github/workflows/**
- Purpose: CI/CD automation
- Contains: GitHub Actions workflow definitions
- Committed: Yes (version controlled)

**.planning/codebase/**
- Purpose: GSD-generated codebase analysis documents
- Contains: Architecture, structure, conventions, testing, concerns analysis
- Generated: Yes (by GSD tools)
- Committed: Yes (version controlled reference)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Package entry point - re-exports public API (CorosApi class, utilities, types)
- `example/index.ts`: Example showing complete SDK workflow
- `package.json` "main": Points to `dist/index.js` (compiled entry)

**Configuration:**
- `src/config.ts`: API endpoints, STS regional configs, salt value
- `tsconfig.json`: TypeScript compiler settings (target ES5, strict mode)
- `tsup.config.ts`: Build output format (ESM + CJS), output structure
- `package.json`: Dependencies, build scripts, publish config
- `biome.json`: Code formatting and linting rules

**Core Logic:**
- `src/CorosApi.ts`: Main class with all API methods (authentication, activities, upload/download)
- `src/utils/compress.ts`: ZIP file creation and MD5 hashing
- `src/utils/s3.ts`: AWS S3 upload/download with temporary credentials
- `src/utils/index.ts`: File system operations (isFile, isDirectory, createDirectory)

**Type Definitions:**
- `src/types/index.ts`: Login, activity list, bucket, upload responses; enums (FileType)
- `src/types/activity.ts`: ActivityData and 14+ nested interfaces for detailed activity information

## Naming Conventions

**Files:**
- Source files: PascalCase for classes (`CorosApi.ts`), camelCase for utilities (`compress.ts`, `s3.ts`)
- Index files: Always `index.ts` for directory exports
- Example files: `index.ts` in example directory
- Config files: lowercase with .ts extension (e.g., `config.ts`, `tsup.config.ts`)

**Directories:**
- Feature directories: lowercase plural (`utils`, `types`)
- Example/demo: lowercase (`example`)
- Generated output: `dist`
- Config: hidden dotfiles (`.github`, `.vscode`, `.planning`)

**Exports:**
- Default exports: Main class (`CorosApi`)
- Named exports: Utilities, types, configurations (barrel export pattern in `index.ts`)
- Type aliases: PascalCase with Response suffix (e.g., `LoginResponse`, `ActivityResponse`)

**Variables & Constants:**
- Class members: Private underscore prefix (`_credentials`, `_accessToken`)
- Constants: UPPERCASE_SNAKE_CASE (`TOKEN_FILE`, `API_URL`)
- Enums: PascalCase (FileType) with lowercase property keys

## Where to Add New Code

**New API Method:**
- Primary code: `src/CorosApi.ts` (add method to class)
- Type: Add request/response interface to `src/types/index.ts`
- Example: Update `example/index.ts` if it's a commonly-used method

**New Utility Function:**
- File I/O related: `src/utils/index.ts`
- Compression/hashing: `src/utils/compress.ts`
- Cloud storage: `src/utils/s3.ts` or new file if different service
- Export: Add to `src/index.ts` for public API

**New Configuration Setting:**
- Constants: `src/config.ts`
- Type: Add to `STSConfig` or related interface in `src/types/index.ts`
- Access: Via `CorosApi.config()` method

**New Activity Type/Field:**
- Definition: `src/types/activity.ts` (ActivityData or nested interfaces)
- Usage: Automatically available in `getActivityDetails()` response via ActivityData type

**New Regional Support:**
- Configuration: Add entry to `STSConfigs` in `src/config.ts`
- Export: Exported from `src/index.ts` for consumer access
- Example: `STSConfigs.EU` pattern

## Special Directories

**.git/**
- Purpose: Version control history
- Generated: No
- Committed: N/A (git system directory)

**node_modules/**
- Purpose: Installed dependencies
- Generated: Yes (by npm/pnpm)
- Committed: No (listed in .gitignore)

**dist/**
- Purpose: Compiled output (CommonJS, ESM, declarations)
- Generated: Yes (by tsup during `npm run build`)
- Committed: No (built on demand)
- Output formats:
  - `dist/index.mjs` (ES modules)
  - `dist/index.cjs` (CommonJS)
  - `dist/index.d.ts` / `dist/index.d.cts` (TypeScript declarations)
  - `dist/*.mjs`, `dist/*.cjs` for internal modules (via `./dist/*` export)

**.planning/codebase/**
- Purpose: GSD analysis and planning documents
- Generated: Yes (by /gsd:map-codebase and similar commands)
- Committed: Yes (reference documents for future work)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md (as generated)
