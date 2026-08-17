import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const packRoot = resolve(repoRoot, '.tmp');
const tempRoot = mkdtempSync(resolve(tmpdir(), 'warp-drive-supabase-smoke-'));
const consumerDir = resolve(tempRoot, 'consumer');
const rootPackage = JSON.parse(
  readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
);
const testAppPackage = JSON.parse(
  readFileSync(resolve(repoRoot, 'test-app/package.json'), 'utf8'),
);

mkdirSync(consumerDir, { recursive: true });
mkdirSync(packRoot, { recursive: true });

execFileSync('pnpm', ['pack', '--pack-destination', '.tmp'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

const tarballName = `${rootPackage.name}-${rootPackage.version}.tgz`;
const tarballPath = resolve(packRoot, tarballName);
if (!existsSync(tarballPath)) {
  throw new Error(`Expected pnpm pack to create ${tarballName} in .tmp.`);
}

writeFileSync(
  resolve(consumerDir, 'package.json'),
  JSON.stringify(
    {
      name: 'warp-drive-supabase-smoke-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@warp-drive/core': testAppPackage.devDependencies['@warp-drive/core'],
        '@warp-drive/utilities':
          testAppPackage.devDependencies['@warp-drive/utilities'],
        'warp-drive-supabase': `file:${tarballPath}`,
      },
      devDependencies: {
        typescript: rootPackage.devDependencies.typescript,
      },
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(consumerDir, 'index.ts'),
  [
    "import { setBuildURLConfig } from '@warp-drive/utilities';",
    "import { Type } from '@warp-drive/core/types/symbols';",
    "import { query, findRecord, createRecord, updateRecord, SupabaseTable, SupabaseJsonApiHandler, SupabaseUpdatesHandler, createSupabaseAuthHandler } from 'warp-drive-supabase';",
    "import type { FindRecordCallbackFor, QueryCallbackFor, SupabaseTableDefinition } from 'warp-drive-supabase';",
    '',
    "setBuildURLConfig({ host: 'https://example.supabase.co', namespace: 'rest/v1' });",
    '',
    "interface Database { public: { Tables: { posts: { Row: { id: string; created_at: string; user_id: string }; Insert: {}; Update: {}; Relationships: [{ foreignKeyName: 'posts_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'users'; referencedColumns: ['id'] }] }; users: { Row: { id: string; name: string }; Insert: {}; Update: {}; Relationships: [] } } } }",
    "interface Post { [Type]: 'post'; readonly [SupabaseTable]?: SupabaseTableDefinition<Database, 'public', 'posts'>; id: string; createdAt: string }",
    'const configure: QueryCallbackFor<Post> = (q) => {',
    "  q.select(['id', 'created_at']);",
    "  const users = q.embed('users').selectAll();",
    "  q.where((filter) => filter.gte('created_at', '2026-01-01'));",
    "  q.where((filter) => filter.eq(users, 'name', 'Ada'));",
    '  q.where((filter) => filter.exists(users));',
    "  q.orderBy('created_at', { direction: 'desc' });",
    "  q.page({ size: 20, count: 'exact' });",
    '};',
    "const queryRequest = query<Post>('post', configure);",
    'const configureRecord: FindRecordCallbackFor<Post> = (q) => {',
    "  q.select(['id', 'created_at']);",
    "  q.embedAll(['users']);",
    '};',
    "const recordRequest = findRecord<Post>('post', '1', configureRecord);",
    "const authHandler = createSupabaseAuthHandler({ apiKey: 'anon-key' });",
    'declare const post: unknown;',
    'declare const draft: unknown;',
    'const createRequest = createRecord(draft);',
    'const updateRequest = updateRecord(post);',
    '',
    'void queryRequest;',
    'void recordRequest;',
    'void authHandler;',
    'void createRequest;',
    'void updateRequest;',
    'void SupabaseJsonApiHandler;',
    'void SupabaseUpdatesHandler;',
    'void SupabaseTable;',
  ].join('\n'),
);

writeFileSync(
  resolve(consumerDir, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        noEmit: true,
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
      },
      include: ['index.ts'],
    },
    null,
    2,
  ),
);

execFileSync('pnpm', ['install'], {
  cwd: consumerDir,
  env: {
    ...process.env,
    CI: 'true',
  },
  stdio: 'inherit',
});

execFileSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], {
  cwd: consumerDir,
  stdio: 'inherit',
});
