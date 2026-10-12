// Fills the level form from the level ID: the name, creator and rating from the Geometry Dash
// servers, our difficulty from the Demon Ladder tier (Demons In Between) and the in-game thumbnail.
// The server does the requests (src/routes/api/levels/lookup), this checks what it answered
import { resolve } from '$app/paths'
import * as v from 'valibot'
import { GameDifficulty } from '#lib/list.ts'

const lookupSchema = v.object({
    gdId: v.number(),
    // Null if the game servers don't have the level (or didn't answer)
    game: v.nullable(
        v.object({
            name: v.string(),
            // Empty if the creator has no account anymore
            creator: v.string(),
            gameDifficulty: v.enum(GameDifficulty),
        }),
    ),
    // Geometry Dash Demon Ladder tier, null if the level isn't on the ladder
    tier: v.nullable(v.number()),
    // Demons In Between difficulty of the tier
    dibDifficulty: v.nullable(v.string()),
    // Our difficulty with the same name, null if the meter doesn't have it
    listDifficultyId: v.nullable(v.number()),
    // The in-game thumbnail, null if nobody made one
    thumbnailUrl: v.nullable(v.string()),
    // The level with this ID if it's on the list already
    existing: v.nullable(v.object({ id: v.number(), name: v.string() })),
    // Services that didn't answer
    problems: v.array(v.string()),
})

export type LevelLookup = v.InferOutput<typeof lookupSchema>

const responseSchema = v.union([
    v.object({ lookup: lookupSchema }),
    v.object({ error: v.string() }),
])

// The error to show or what was found
export async function lookupLevel(
    gdId: number,
): Promise<{ lookup: LevelLookup; error: null } | { lookup: null; error: string }> {
    try {
        const response = await fetch(resolve('/api/levels/lookup') + '?id=' + gdId)
        const result = v.safeParse(responseSchema, await response.json())

        if (!result.success) {
            return { lookup: null, error: "Couldn't look up the level" }
        }

        if ('error' in result.output) {
            return { lookup: null, error: result.output.error }
        }

        return { lookup: result.output.lookup, error: null }
    } catch {
        return { lookup: null, error: "Couldn't reach the server" }
    }
}
