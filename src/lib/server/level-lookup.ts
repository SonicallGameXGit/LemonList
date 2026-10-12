// Lookups of the level form (#lib/level-lookup.ts) from the level ID: the Geometry Dash servers,
// the Geometry Dash Demon Ladder (gdladder.com) and the in-game thumbnails (levelthumbs.prevter.me)
import { eq, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { db } from '#lib/server/db/index.ts'
import { difficulty, level } from '#lib/server/db/schema.ts'
import { ActionError } from '#lib/server/forms.ts'
import { checkLookupCooldown, fetchGameLevel } from '#lib/server/gd-servers.ts'
import { MediaKind, imageRules } from '#lib/server/media.ts'
import { dibDifficultyForTier } from '#lib/dib.ts'
import type { LevelLookup } from '#lib/level-lookup.ts'

const LADDER_URL = 'https://gdladder.com/api/levels/'
const THUMBNAIL_URL = 'https://levelthumbs.prevter.me/thumbnail/'

const TIMEOUT = 10_000

// Levels that aren't on the ladder give an empty object
const ladderSchema = v.object({
    Rating: v.nullish(v.number(), null),
    // Tier the ladder gives while there are only a few ratings
    DefaultRating: v.nullish(v.number(), null),
})

// Tier of the level on the ladder, null if it isn't there. Throws if the ladder doesn't answer
async function fetchLadderTier(gdId: number) {
    const response = await fetch(LADDER_URL + gdId, { signal: AbortSignal.timeout(TIMEOUT) })

    if (response.status === 404) {
        return null
    }

    if (!response.ok) {
        throw new Error('The ladder answered ' + response.status)
    }

    const result = v.safeParse(ladderSchema, await response.json())

    if (!result.success) {
        return null
    }

    return result.output.Rating ?? result.output.DefaultRating
}

export function levelThumbnailSource(gdId: number) {
    return THUMBNAIL_URL + gdId
}

// Throws if the thumbnails site doesn't answer
async function hasThumbnail(gdId: number) {
    const response = await fetch(levelThumbnailSource(gdId), {
        method: 'HEAD',
        signal: AbortSignal.timeout(TIMEOUT),
    })

    if (response.status === 404) {
        return false
    }

    if (!response.ok) {
        throw new Error('The thumbnails site answered ' + response.status)
    }

    return true
}

// The in-game thumbnail of the level, to save it as the preview
export async function fetchLevelThumbnail(gdId: number) {
    let response: Response

    try {
        response = await fetch(levelThumbnailSource(gdId), { signal: AbortSignal.timeout(TIMEOUT) })
    } catch {
        throw new ActionError(
            "Couldn't download the in-game thumbnail, try again or upload a preview",
        )
    }

    if (response.status === 404) {
        throw new ActionError('This level has no in-game thumbnail, upload a preview instead')
    }

    if (!response.ok) {
        throw new ActionError(
            "Couldn't download the in-game thumbnail, try again or upload a preview",
        )
    }

    // saveImage checks the size again, this only avoids downloading huge files
    const size = Number(response.headers.get('content-length'))

    if (Number.isFinite(size) && size > imageRules[MediaKind.Preview].maxBytes) {
        throw new ActionError('The in-game thumbnail is too big, upload a preview instead')
    }

    return new Uint8Array(await response.arrayBuffer())
}

function valueOf<T>(result: PromiseSettledResult<T>, problem: string, problems: string[]) {
    if (result.status === 'rejected') {
        problems.push(problem)
        return null
    }

    return result.value
}

export async function lookUpLevel(playerId: string, gdId: number): Promise<LevelLookup> {
    checkLookupCooldown(playerId)

    const [gameResult, tierResult, thumbnailResult] = await Promise.allSettled([
        fetchGameLevel(gdId),
        fetchLadderTier(gdId),
        hasThumbnail(gdId),
    ])
    const problems: string[] = []
    const game = valueOf(gameResult, 'The Geometry Dash servers', problems)
    const tier = valueOf(tierResult, 'The Demon Ladder', problems)
    const thumbnail = valueOf(thumbnailResult, 'The thumbnails site', problems)

    const dibDifficulty = tier === null ? null : dibDifficultyForTier(gdId, tier)
    const listDifficulty =
        dibDifficulty === null
            ? undefined
            : db
                  .select({ id: difficulty.id })
                  .from(difficulty)
                  .where(sql`lower(${difficulty.name}) = lower(${dibDifficulty})`)
                  .get()
    const existing = db
        .select({ id: level.id, name: level.name })
        .from(level)
        .where(eq(level.gdId, gdId))
        .get()

    return {
        gdId,
        game,
        tier,
        dibDifficulty,
        listDifficultyId: listDifficulty === undefined ? null : listDifficulty.id,
        thumbnailUrl: thumbnail === true ? levelThumbnailSource(gdId) : null,
        existing: existing ?? null,
        problems,
    }
}
