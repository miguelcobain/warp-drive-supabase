import { on } from '@ember/modifier';
import { action } from '@ember/object';

import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import type { PostResource } from 'test-app/utils/resource-schemas';

export interface PostFormValues {
  title: string;
  body: string;
  createdAt: string;
}

interface Signature {
  Args: {
    errorMessage?: string | null;
    heading: string;
    post?: PostResource | null;
    submitLabel: string;
    onSubmit: (
      values: PostFormValues,
      post?: PostResource | null,
    ) => Promise<void> | void;
  };
}

export default class PostForm extends Component<Signature> {
  @tracked private titleDraft: string | null = null;
  @tracked private bodyDraft: string | null = null;
  @tracked private createdAtDraft: string | null = null;

  get title(): string {
    return this.titleDraft ?? this.args.post?.title ?? '';
  }

  get body(): string {
    return this.bodyDraft ?? this.args.post?.body ?? '';
  }

  get createdAt(): string {
    return (
      this.createdAtDraft ?? this.args.post?.createdAt ?? '2026-04-15T15:00:00Z'
    );
  }

  @action updateTitle(event: Event): void {
    this.titleDraft = (event.target as HTMLInputElement).value;
  }

  @action updateBody(event: Event): void {
    this.bodyDraft = (event.target as HTMLTextAreaElement).value;
  }

  @action updateCreatedAt(event: Event): void {
    this.createdAtDraft = (event.target as HTMLInputElement).value;
  }

  @action async submit(event: Event): Promise<void> {
    event.preventDefault();

    await this.args.onSubmit(
      {
        body: this.body,
        createdAt: this.createdAt,
        title: this.title,
      },
      this.args.post,
    );
  }

  <template>
    <section class="card" data-test-post-form-card>
      <h2 data-test-post-form-heading>{{@heading}}</h2>

      {{#if @errorMessage}}
        <p class="form-error" data-test-post-form-error>{{@errorMessage}}</p>
      {{/if}}

      <form class="post-form" data-test-post-form {{on "submit" this.submit}}>
        <label class="post-form-field">
          <span>Title</span>
          <input
            class="post-form-input"
            data-test-post-title-input
            name="title"
            type="text"
            value={{this.title}}
            {{on "input" this.updateTitle}}
          />
        </label>

        <label class="post-form-field">
          <span>Body</span>
          <textarea
            class="post-form-input post-form-textarea"
            data-test-post-body-input
            name="body"
            rows="5"
            {{on "input" this.updateBody}}
          >{{this.body}}</textarea>
        </label>

        <label class="post-form-field">
          <span>Created At</span>
          <input
            class="post-form-input"
            data-test-post-created-at-input
            name="created-at"
            type="text"
            value={{this.createdAt}}
            {{on "input" this.updateCreatedAt}}
          />
        </label>

        <button class="post-form-submit" data-test-post-submit type="submit">
          {{@submitLabel}}
        </button>
      </form>
    </section>
  </template>
}
