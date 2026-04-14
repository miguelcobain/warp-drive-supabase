import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const tempRoot = resolve(repoRoot, '.tmp');
const consumerDir = resolve(tempRoot, 'smoke-consumer');

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(consumerDir, { recursive: true });

execFileSync('pnpm', ['pack', '--pack-destination', '.tmp'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

const tarballName = readdirSync(tempRoot).find((entry) => entry.endsWith('.tgz'));
if (!tarballName) {
  throw new Error('Expected pnpm pack to create a tarball in .tmp.');
}

writeFileSync(
  resolve(consumerDir, 'package.json'),
  JSON.stringify(
    {
      name: 'warp-drive-supabase-smoke-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@warp-drive/core': 'link:../../node_modules/@warp-drive/core',
        'warp-drive-supabase': `file:../${tarballName}`,
      },
    },
    null,
    2
  )
);

writeFileSync(
  resolve(consumerDir, 'index.ts'),
  [
    "import { query, findRecord, createRecord, updateRecord, SupabaseJsonApiHandler, SupabaseUpdatesHandler, createSupabaseAuthHandler } from 'warp-drive-supabase';",
    '',
    "const queryRequest = query('post');",
    "const recordRequest = findRecord('user', '1');",
    "const authHandler = createSupabaseAuthHandler({ apiKey: 'anon-key' });",
    'declare const post: unknown;',
    'declare const draft: unknown;',
    "const createRequest = createRecord(draft);",
    "const updateRequest = updateRecord(post);",
    '',
    'void queryRequest;',
    'void recordRequest;',
    'void authHandler;',
    'void createRequest;',
    'void updateRequest;',
    'void SupabaseJsonApiHandler;',
    'void SupabaseUpdatesHandler;',
  ].join('\n')
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
    2
  )
);

execFileSync('pnpm', ['install'], {
  cwd: consumerDir,
  stdio: 'inherit',
});

execFileSync('node', [resolve(repoRoot, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], {
  cwd: consumerDir,
  stdio: 'inherit',
});
