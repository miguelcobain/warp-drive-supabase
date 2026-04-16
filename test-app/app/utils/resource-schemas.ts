import { withDefaults } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

export interface User {
  readonly $type: 'user';
  [Type]: 'user';
  readonly id: string | null;
  readonly firstName: string;
  readonly lastName: string;
}

export interface Comment {
  readonly $type: 'comment';
  [Type]: 'comment';
  readonly id: string | null;
  readonly body: string;
  readonly createdAt: string;
  readonly author: User | null;
  readonly post: Post | null;
}

export interface Post {
  readonly $type: 'post';
  [Type]: 'post';
  readonly id: string | null;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
  readonly author: User | null;
  readonly comments: Comment[];
}

export interface EditablePost {
  readonly $type: 'post';
  [Type]: 'post';
  readonly id: string | null;
  title: string;
  body: string;
  createdAt: string;
  author: User | null;
  comments: Comment[];
}

const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { kind: 'field', name: 'firstName', sourceKey: 'first_name' },
    { kind: 'field', name: 'lastName', sourceKey: 'last_name' },
  ],
});

const CommentSchema = withDefaults({
  type: 'comment',
  fields: [
    { kind: 'field', name: 'body' },
    { kind: 'field', name: 'createdAt', sourceKey: 'created_at' },
    {
      kind: 'resource',
      name: 'author',
      type: 'user',
      options: { async: false, inverse: null },
    } as never,
    {
      kind: 'resource',
      name: 'post',
      type: 'post',
      options: { async: false, inverse: null },
    } as never,
  ],
});

const PostSchema = withDefaults({
  type: 'post',
  fields: [
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'body' },
    { kind: 'field', name: 'createdAt', sourceKey: 'created_at' },
    {
      kind: 'resource',
      name: 'author',
      type: 'user',
      options: { async: false, inverse: null },
    } as never,
    {
      kind: 'collection',
      name: 'comments',
      type: 'comment',
      options: { async: false, inverse: null },
    } as never,
  ],
});

export const RESOURCE_SCHEMAS = [UserSchema, CommentSchema, PostSchema];
