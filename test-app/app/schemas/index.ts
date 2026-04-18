import { CommentSchema } from './comment';
import { PostSchema } from './post';
import { UserSchema } from './user';

export type { Comment } from './comment';
export { CommentSchema } from './comment';
export type { EditablePost, Post } from './post';
export { PostSchema } from './post';
export type { User } from './user';
export { UserSchema } from './user';

export const RESOURCE_SCHEMAS = [UserSchema, CommentSchema, PostSchema];
