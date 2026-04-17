import { withDefaults } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

export interface User {
  readonly $type: 'user';
  [Type]: 'user';
  readonly id: string | null;
  readonly firstName: string;
  readonly lastName: string;
}

export const UserSchema = withDefaults({
  type: 'user',
  fields: [
    { kind: 'field', name: 'firstName', sourceKey: 'first_name' },
    { kind: 'field', name: 'lastName', sourceKey: 'last_name' },
  ],
});
