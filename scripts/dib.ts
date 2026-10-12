// Adds the Demons In Between difficulties (src/lib/dib.ts) to our own meter. Faces are in
// scripts/dib, extracted from the mod resources
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { count, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../src/lib/server/db/schema.ts'
import { MediaKind, writeImage } from '../src/lib/server/media-store.ts'
import { dibDifficulties } from '../src/lib/dib.ts'

const { difficulty } = schema

function facePath(name: string) {
    return path.join(import.meta.dirname, 'dib', name.toLowerCase().replaceAll(' ', '-') + '.png')
}

// Adds the ones that don't exist yet (by name, ignoring the case) after the existing difficulties.
// Returns the names that were added
export async function addDibDifficulties(
    db: BetterSQLite3Database<typeof schema>,
    mediaDir: string,
) {
    const existing = new Set(
        db
            .select({ name: sql<string>`lower(${difficulty.name})` })
            .from(difficulty)
            .all()
            .map((row) => row.name),
    )
    const missing = dibDifficulties.filter((name) => !existing.has(name.toLowerCase()))
    const faces = await Promise.all(
        missing.map(async (name) =>
            writeImage(mediaDir, MediaKind.DifficultyFace, await readFile(facePath(name))),
        ),
    )

    db.transaction((tx) => {
        const last = tx.select({ count: count() }).from(difficulty).get()?.count ?? 0

        missing.forEach((name, index) => {
            const face = faces[index]

            if (face === undefined) {
                throw new Error('Missing face of ' + name)
            }

            tx.insert(difficulty)
                .values({ name, face, position: last + index + 1 })
                .run()
        })
    })

    return missing
}
