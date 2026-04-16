import { LinkTo } from '@ember/routing';

import { pageTitle } from 'ember-page-title';

<template>
  {{pageTitle "Warp Drive Supabase Consumer App"}}
  <main class="shell">
    <header class="shell-header">
      <div>
        <h1 class="shell-title">Warp Drive Supabase Consumer App</h1>
        <p class="shell-subtitle">
          A conventional Ember app that exercises Polaris-mode Warp Drive and
          warp-drive-supabase end to end.
        </p>
      </div>

      <nav class="shell-nav" aria-label="Application routes">
        <LinkTo @route="index" data-test-nav-home>Posts</LinkTo>
        <LinkTo @route="posts.new" data-test-nav-new-post>New Post</LinkTo>
        <LinkTo @route="failure" data-test-nav-failure>Failure</LinkTo>
      </nav>
    </header>

    {{outlet}}
  </main>
</template>
