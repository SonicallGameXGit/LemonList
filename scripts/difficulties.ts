// Adds the Demons In Between difficulties to our own meter: pnpm difficulties
// Skips the ones that exist already (by name), new ones go after the existing difficulties. After
// that admins manage the meter on the website (Admin > Difficulties)
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../src/lib/server/db/schema.ts'
import { addDibDifficulties } from './dib.ts'

const databaseUrl = process.env.DATABASE_URL
const mediaDir =
    process.env.MEDIA_DIR === undefined || process.env.MEDIA_DIR === ''
        ? 'media'
        : process.env.MEDIA_DIR

if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL is not set')
}

const db = drizzle(new Database(databaseUrl), { schema })
const added = await addDibDifficulties(db, mediaDir)

if (added.length === 0) {
    console.info('Every Demons In Between difficulty is there already')
} else {
    console.info(`Added ${added.length} difficulties: ${added.join(', ')}`)
}
