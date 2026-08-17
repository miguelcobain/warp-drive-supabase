# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-08-17

### Added

- Added a synchronous fluent query builder with first-class selection, embeds, filters, ordering,
  related filtering and ordering, and pagination.
- Added `SupabaseTableDefinition` to associate a generated database, schema, and table context with
  a Warp Drive resource through `SupabaseTable`.
- Added typed direct and reverse relationship traversal, foreign-key hints, embed aliases, join
  modes, nested embeds, and relationship cardinality.
- Added `selectRaw()`, `filter.raw()`, and `orderByRaw()` escape hatches for trusted PostgREST syntax
  not represented by the fluent API.
- Added typed `embedAll()` relationship paths and callback-only `embed(table, callback)` overloads
  for concise complete relationship selections.
- Added EmbedRef-first overloads to every filter operator for related-table predicates, matching
  the related `orderBy()` API.
- Exported `QueryBuilder`, `FilterBuilder`, `EmbedBuilder`, `EmbedRef`, and their reusable callback
  and option types.

### Changed

- Changed collection queries to `query(type, configure?, requestOptions?)`; configure callbacks run
  synchronously exactly once while the request is built.
- Changed singular queries to `findRecord(type, id, configure?, requestOptions?)` and the equivalent
  identifier overload. Its fluent root builder exposes selection and embeds only.
- Query and singular-record typing now come exclusively from generated Supabase table definitions.
  Unassociated Warp Drive resources retain typed results while database fields and relationships
  accept strings.
- Root queries default to `*` until an explicit selection or embed is added.
- Moved page-number pagination into `q.page()`.

### Breaking

- Removed `fields`, `include`, object `filter`, structured `order` arrays, and object `page` options
  from `query()`. Use `select()`, `embed()`, `where()`, `orderBy()`, and `page()` in its callback.
- Existing `SupabaseTable` associations must use
  `SupabaseTableDefinition<Database, Schema, Table>` so relationship context is available.
- Removed Warp Drive schema-derived guesses for query fields and relationships.
- Moved per-request URL configuration to the third `query()` argument.
- Removed legacy `include` options from `findRecord()` and moved its per-request URL configuration
  to the final argument.
- Removed the separate `filter.related(embed)` scoping method; pass the embed reference directly to
  the filter operator instead.

`findRecord()` retains its singular response, record identity, cache operation, and result typing.

## [0.5.0] - 2026-08-17

### Added

- Added the `SupabaseTable` symbol for optionally associating a Warp Drive resource type with a
  generated Supabase table definition.
- Added progressive order typing. Associated resources use exact Supabase `Row` keys; other typed
  resources infer snake-cased scalar fields.
- Added a typed PostgREST filter object API with comparison, pattern, membership, null, full-text,
  collection, and range operators.
- Added `$and`, `$or`, and `$not` logical filter groups, field-level `not`, and `any`/`all` operator
  modifiers.
- Added typed dotted relationship filter paths derived from Warp Drive relationships.
- Added explicit `$raw` escape hatches for advanced order and filter expressions.
- Added runtime validation for malformed or empty filter expressions.
- Exported `Filter`, `FilterExpression`, `FilterField`, `RawFilter`, `OrderClause`, and `OrderField`
  types.

### Changed

- Order clauses are now structured objects with `field`, optional `direction`, and optional `nulls`
  properties.
- Filters are now structured objects instead of pre-serialized PostgREST query parameter strings.
- Associated Supabase `Row` fields replace fallback field guesses for typed filters and ordering.
- Order serialization preserves clause priority and deduplicates identical serialized clauses.

### Breaking

- Replaced string-array order clauses such as `['created_at.desc']` with structured clauses such as
  `[{ field: 'created_at', direction: 'desc' }]`.
- Replaced serialized filters such as `{ status: 'eq.published' }` with operator objects such as
  `{ status: { eq: 'published' } }`.
- Empty filters, predicates, logical groups, `in` lists, and `any`/`all` lists now throw at runtime.

## [0.4.0] - 2026-08-10

### Changed

- Changed pagination metadata to Warp Drive's conventional shape:
  `{ currentPage, totalPages, totalItems }`.
- Made paginated documents directly compatible with Warp Drive pagination consumers such as
  `<Paginate />` without a custom page-hints adapter.

### Breaking

- Replaced the previous `{ page: { total } }` pagination metadata shape.

## [0.3.1] - 2026-08-10

### Fixed

- Preserved caller-defined order-clause priority while still deduplicating identical clauses.
  Earlier serialization sorted clauses alphabetically, which could change multi-column ordering
  semantics.

## [0.3.0] - 2026-08-04

### Added

- Added page-number pagination through `page.size`, optional `page.number`, and optional
  `page.count` query options.
- Added `exact`, `planned`, and `estimated` PostgREST count modes.
- Added validation for page numbers, page sizes, count modes, and unsafe offsets.
- Added parsing of PostgREST `Content-Range` headers.
- Added pagination `self`, `first`, `prev`, `next`, and `last` links to transformed documents.
- Added Warp Drive reactive document navigation support for paginated query results.
- Exported `PageOptions` and `PostgrestCountMode` types.

### Changed

- Typed collection queries now return `ReactiveDataDocument<T[]>` request results.
- Paginated requests add the appropriate PostgREST `limit`, `offset`, and `Prefer: count=...`
  values.

## [0.2.0] - 2026-08-04

### Added

- Added support for Warp Drive's global URL configuration through `setBuildURLConfig()`.
- Added per-request `host`, `namespace`, and `resourcePath` overrides to all request builders.
- Exported the `QueryOptions` type.
- Added `@warp-drive/utilities` as a peer dependency.

### Changed

- Request builders now use Warp Drive's `buildBaseURL()` behavior instead of the package's local URL
  implementation.

## [0.1.2] - 2026-04-18

### Added

- Added the `deleteRecord()` request builder and delete coverage in the Ember consumer app.
- Added dedicated resource schema modules for the test application.

### Changed

- Simplified public resource types and removed `Resource` suffixes from example model names.
- Reorganized schema exports and expanded the README's setup and usage guidance.

### Removed

- Removed the strict schema export type from the public API.

## [0.1.1] - 2026-04-16

### Added

- Published the initial packaged release of the Warp Drive request builders and handlers for
  Supabase/PostgREST.
- Added `query()`, `findRecord()`, `createRecord()`, and `updateRecord()` builders.
- Added the `SupabaseJsonApiHandler` for transforming PostgREST responses into JSON:API documents.
- Added the `SupabaseUpdatesHandler` for serializing Warp Drive record mutations.
- Added schema-aware `sourceKey` handling with snake_case fallbacks.
- Added `createSupabaseAuthHandler()` for Supabase API key and authorization headers.
- Added typed includes, fields, ordering, and record/document return types.
- Added root and subpath package exports for builders, handlers, and authentication.
- Added a real Ember consumer application, unit and application tests, package smoke testing, and CI.

[0.6.0]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/miguelcobain/warp-drive-supabase/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/miguelcobain/warp-drive-supabase/releases/tag/v0.1.1
