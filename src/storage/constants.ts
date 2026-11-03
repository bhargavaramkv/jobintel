export const DB_NAME = 'jobintel'
/** IndexedDB structural version. Bump together with a new entry in migrations.ts. */
export const DB_VERSION = 4
/** Logical schema version of stored records, persisted in the `meta` store and in backups. */
export const SCHEMA_VERSION = 4

export const STORES = {
  profile: 'profile',
  meta: 'meta',
  jobActions: 'jobActions',
  contacts: 'contacts',
  outreach: 'outreach',
} as const
