import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema.ts'
import { DATABASE_URL } from '$app/env/private'

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

const client = new Database(DATABASE_URL)

// Cascades rely on foreign keys, WAL lets pages read while something is being written
client.pragma('foreign_keys = ON')
client.pragma('journal_mode = WAL')

export const db = drizzle(client, { schema })
