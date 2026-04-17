import { withDefaults } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

import type { Post } from './post';
import type { User } from './user';

export interface Comment {
  readonly $type: 'comment';
  [Type]: 'comment';
  readonly id: string | null;
  readonly body: string;
  readonly createdAt: string;
  readonly author: User | null;
  readonly post: Post | null;
}

export const CommentSchema = withDefaults({
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
