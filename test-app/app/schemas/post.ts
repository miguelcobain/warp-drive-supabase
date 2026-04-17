import { withDefaults } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

import type { Comment } from './comment';
import type { User } from './user';

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

export const PostSchema = withDefaults({
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
