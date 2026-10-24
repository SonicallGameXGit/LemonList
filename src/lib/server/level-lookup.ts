// Lookups of the level form (#lib/level-lookup.ts) from the level ID: the Geometry Dash servers,
// the Geometry Dash Demon Ladder (gdladder.com) and the in-game thumbnails (levelthumbs.prevter.me).
// Players who don't know the ID search the level by its name first
import { eq, inArray, sql } from 'drizzle-orm'
import * as v from 'valibot'
import { db } from '#lib/server/db/index.ts'
import { difficulty, level } from '#lib/server/db/schema.ts'
import { ActionError } from '#lib/server/forms.ts'
import {
    checkLookupCooldown,
    fetchGameLevel,
    searchGameLevels,
    type GameLevel,
} from '#lib/server/gd-servers.ts'
import { MediaKind, imageRules } from '#lib/server/media.ts'
import { dibDifficultyForTier } from '#lib/dib.ts'
import type { LevelLookup, LevelSearchResult } from '#lib/level-lookup.ts'

const LADDER_URL = 'https://gdladder.com/api/levels/'
const THUMBNAIL_URL = 'https://levelthumbs.prevter.me/thumbnail/'

const TIMEOUT = 10_000

// Levels of the last search of every player. Picking one of them looks it up right away, without
// the cooldown: the servers already sent it, only the ladder and the thumbnails are asked
const lastSearches = new Map<string, Map<number, GameLevel>>()

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
    // Every searched level can be picked once without waiting
    const searched = lastSearches.get(playerId)?.get(gdId)

    if (searched === undefined) {
        checkLookupCooldown(playerId)
    } else {
        lastSearches.get(playerId)?.delete(gdId)
    }

    const [gameResult, tierResult, thumbnailResult] = await Promise.allSettled([
        searched === undefined ? fetchGameLevel(gdId) : Promise.resolve(searched),
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

// The first online levels with this name, to pick the one to look up
export async function searchLevels(playerId: string, query: string): Promise<LevelSearchResult[]> {
    checkLookupCooldown(playerId)

    const found = await searchGameLevels(query)
    const onList =
        found.length === 0
            ? []
            : db
                  .select({ id: level.id, name: level.name, gdId: level.gdId })
                  .from(level)
                  .where(
                      inArray(
                          level.gdId,
                          found.map((game) => game.gdId),
                      ),
                  )
                  .all()

    lastSearches.set(
        playerId,
        new Map(
            found.map((game) => [
                game.gdId,
                { name: game.name, creator: game.creator, gameDifficulty: game.gameDifficulty },
            ]),
        ),
    )

    return found.map((game) => {
        const existing = onList.find((listed) => listed.gdId === game.gdId)

        return {
            ...game,
            existing: existing === undefined ? null : { id: existing.id, name: existing.name },
        }
    })
}
