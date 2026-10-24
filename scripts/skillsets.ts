// Adds the skillsets of the Demon Ladder: pnpm skillsets
// Skips the ones that exist already (by name), new ones go after the existing skillsets. After that
// admins manage them on the website (Admin > Skillsets)
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../src/lib/server/db/schema.ts'
import { addDefaultSkillsets } from './gdladder.ts'

const databaseUrl = process.env.DATABASE_URL
const mediaDir =
    process.env.MEDIA_DIR === undefined || process.env.MEDIA_DIR === ''
        ? 'media'
        : process.env.MEDIA_DIR

if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL is not set')
}

const db = drizzle(new Database(databaseUrl), { schema })
const added = await addDefaultSkillsets(db, mediaDir)

if (added.length === 0) {
    console.info('Every Demon Ladder skillset is there already')
} else {
    console.info(`Added ${added.length} skillsets: ${added.join(', ')}`)
}
