export interface Position {
  x: number
  y: number
}

export interface Field {
  id: string
  name: string
  type: string
  primaryKey?: boolean
  foreignKey?: boolean
  nullable?: boolean
}

export interface Model {
  id: string
  name: string
  position: Position
  fields: Field[]
  collapsed?: boolean
}

export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'

export interface Relationship {
  id: string
  fromModelId: string
  fromFieldId: string
  toModelId: string
  toFieldId: string
  type: RelationshipType
}

export interface Schema {
  models: Model[]
  relationships: Relationship[]
}

export const FIELD_TYPES = [
  'uuid',
  'string',
  'text',
  'integer',
  'bigint',
  'float',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'timestamp',
  'json',
  'blob',
] as const

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'one-to-one',
  'one-to-many',
  'many-to-one',
  'many-to-many',
]

export const DEFAULT_SCHEMA: Schema = {
  models: [
    {
      id: 'user',
      name: 'User',
      position: { x: 100, y: 100 },
      fields: [
        { id: 'user-id', name: 'id', type: 'uuid', primaryKey: true },
        { id: 'user-email', name: 'email', type: 'string' },
        { id: 'user-name', name: 'name', type: 'string', nullable: true },
        { id: 'user-created', name: 'createdAt', type: 'datetime' },
      ],
    },
    {
      id: 'post',
      name: 'Post',
      position: { x: 450, y: 100 },
      fields: [
        { id: 'post-id', name: 'id', type: 'uuid', primaryKey: true },
        { id: 'post-title', name: 'title', type: 'string' },
        { id: 'post-content', name: 'content', type: 'text', nullable: true },
        { id: 'post-userId', name: 'userId', type: 'uuid', foreignKey: true },
        { id: 'post-created', name: 'createdAt', type: 'datetime' },
      ],
    },
    {
      id: 'comment',
      name: 'Comment',
      position: { x: 800, y: 100 },
      fields: [
        { id: 'comment-id', name: 'id', type: 'uuid', primaryKey: true },
        { id: 'comment-content', name: 'content', type: 'text' },
        { id: 'comment-postId', name: 'postId', type: 'uuid', foreignKey: true },
        { id: 'comment-userId', name: 'userId', type: 'uuid', foreignKey: true },
        { id: 'comment-created', name: 'createdAt', type: 'datetime' },
      ],
    },
  ],
  relationships: [
    {
      id: 'rel-post-user',
      fromModelId: 'post',
      fromFieldId: 'post-userId',
      toModelId: 'user',
      toFieldId: 'user-id',
      type: 'many-to-one',
    },
    {
      id: 'rel-comment-post',
      fromModelId: 'comment',
      fromFieldId: 'comment-postId',
      toModelId: 'post',
      toFieldId: 'post-id',
      type: 'many-to-one',
    },
    {
      id: 'rel-comment-user',
      fromModelId: 'comment',
      fromFieldId: 'comment-userId',
      toModelId: 'user',
      toFieldId: 'user-id',
      type: 'many-to-one',
    },
  ],
}
