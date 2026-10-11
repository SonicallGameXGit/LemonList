// Changes of the demon list made by players (records, ratings, avatars) and admins (levels, reviews,
// verification). Throws ActionError with a message that is safe to show
import { and, count, eq, gt, gte, isNotNull, lt, lte, ne, sql } from 'drizzle-orm'
import { db } from '#lib/server/db/index.ts'
import { difficulty, level, listChange, rating, record, user } from '#lib/server/db/schema.ts'
import { MediaKind, deleteMedia, saveImage } from '#lib/server/media.ts'
import { ActionError } from '#lib/server/forms.ts'
import { getBestProgress, hasCompleted, hasPendingRecord } from '#lib/server/list.ts'
import { GameDifficulty, ListChangeKind, RecordStatus } from '#lib/list.ts'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

function findLevel(id: number) {
    const row = db
        .select({
            id: level.id,
            name: level.name,
            position: level.position,
            preview: level.preview,
        })
        .from(level)
        .where(eq(level.id, id))
        .get()

    if (row === undefined) {
        throw new ActionError("This level doesn't exist anymore")
    }

    return row
}

// Players

export type RecordInput = {
    levelId: number
    progress: number
    videoUrl: string
    rawFootageUrl: string | null
    notes: string | null
}

export function submitRecord(playerId: string, input: RecordInput) {
    const target = findLevel(input.levelId)

    if (target.position === null) {
        throw new ActionError('Records open once the level is placed on the Main List')
    }

    if (hasPendingRecord(target.id, playerId)) {
        throw new ActionError(
            'You already have a record waiting for a review on this level, withdraw it first to send a new one',
        )
    }

    const best = getBestProgress(target.id, playerId)

    if (best === 100) {
        throw new ActionError('You have already beaten this level')
    }

    if (input.progress <= best) {
        throw new ActionError(`Your record on this level is already ${best}%, send a better one`)
    }

    db.insert(record)
        .values({
            levelId: target.id,
            playerId,
            progress: input.progress,
            videoUrl: input.videoUrl,
            rawFootageUrl: input.rawFootageUrl,
            notes: input.notes,
        })
        .run()
}

// Players can take back their records until an admin reviews them
export function withdrawRecord(playerId: string, recordId: number) {
    const result = db
        .delete(record)
        .where(
            and(
                eq(record.id, recordId),
                eq(record.playerId, playerId),
                eq(record.status, RecordStatus.Pending),
            ),
        )
        .run()

    if (result.changes === 0) {
        throw new ActionError('Only records waiting for a review can be withdrawn')
    }
}

export function rateLevel(playerId: string, levelId: number, score: number) {
    const target = findLevel(levelId)

    if (target.position === null || !hasCompleted(target.id, playerId)) {
        throw new ActionError('Only players who beat this level can rate it')
    }

    db.insert(rating)
        .values({ levelId: target.id, playerId, score })
        .onConflictDoUpdate({
            target: [rating.levelId, rating.playerId],
            set: { score, createdAt: new Date() },
        })
        .run()
}

function setAvatarKey(userId: string, key: string | null) {
    const previous = db.select({ avatar: user.avatar }).from(user).where(eq(user.id, userId)).get()

    db.update(user).set({ avatar: key }).where(eq(user.id, userId)).run()

    return previous === undefined ? null : previous.avatar
}

export async function setAvatar(userId: string, image: Uint8Array) {
    const key = await saveImage(MediaKind.Avatar, image)
    const previous = setAvatarKey(userId, key)

    if (previous !== null) {
        await deleteMedia(previous)
    }
}

// Players remove their own avatar, admins remove inappropriate ones
export async function removeAvatar(userId: string) {
    const previous = setAvatarKey(userId, null)

    if (previous !== null) {
        await deleteMedia(previous)
    }
}

// Admins: records and players

export async function reviewRecord(recordId: number, status: RecordStatus) {
    const row = db
        .select({ accountVerified: user.accountVerified })
        .from(record)
        .innerJoin(user, eq(user.id, record.playerId))
        .where(eq(record.id, recordId))
        .get()

    if (row === undefined) {
        throw new ActionError("This record doesn't exist anymore")
    }

    if (status === RecordStatus.Approved && !row.accountVerified) {
        throw new ActionError("Verify the player's account before approving their records")
    }

    db.update(record).set({ status }).where(eq(record.id, recordId)).run()
}

export function deleteRecord(recordId: number) {
    db.delete(record).where(eq(record.id, recordId)).run()
}

export function setAccountVerified(userId: string, verified: boolean) {
    const result = db
        .update(user)
        .set({ accountVerified: verified })
        .where(eq(user.id, userId))
        .run()

    if (result.changes === 0) {
        throw new ActionError("This player doesn't exist anymore")
    }
}

// Admins: levels

function mainListSize(tx: Transaction) {
    return (
        tx.select({ count: count() }).from(level).where(isNotNull(level.position)).get()?.count ?? 0
    )
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

// Puts the level at the position of the Main List (null takes it off the list), shifting the levels
// in between and writing the change into the history. Returns the final position
function placeLevel(
    tx: Transaction,
    current: { id: number; name: string; position: number | null },
    target: number | null,
) {
    const from = current.position
    const log = (kind: ListChangeKind, to: number | null) =>
        tx
            .insert(listChange)
            .values({ levelId: current.id, levelName: current.name, kind, from, to })
            .run()

    if (from === null && target === null) {
        return null
    }

    if (from === null && target !== null) {
        const to = clamp(target, 1, mainListSize(tx) + 1)

        tx.update(level)
            .set({ position: sql`${level.position} + 1` })
            .where(gte(level.position, to))
            .run()
        tx.update(level)
            .set({ position: to, placedAt: new Date() })
            .where(eq(level.id, current.id))
            .run()
        log(ListChangeKind.Placed, to)
        return to
    }

    if (from !== null && target === null) {
        tx.update(level)
            .set({ position: null, placedAt: null })
            .where(eq(level.id, current.id))
            .run()
        tx.update(level)
            .set({ position: sql`${level.position} - 1` })
            .where(gt(level.position, from))
            .run()
        log(ListChangeKind.Removed, null)
        return null
    }

    if (from === null || target === null) {
        return from
    }

    const to = clamp(target, 1, mainListSize(tx))

    if (to === from) {
        return from
    }

    if (to < from) {
        tx.update(level)
            .set({ position: sql`${level.position} + 1` })
            .where(and(gte(level.position, to), lt(level.position, from)))
            .run()
    } else {
        tx.update(level)
            .set({ position: sql`${level.position} - 1` })
            .where(and(gt(level.position, from), lte(level.position, to)))
            .run()
    }

    tx.update(level).set({ position: to }).where(eq(level.id, current.id)).run()
    log(to < from ? ListChangeKind.MovedUp : ListChangeKind.MovedDown, to)
    return to
}

export function moveLevel(levelId: number, position: number | null) {
    const target = findLevel(levelId)

    db.transaction((tx) => {
        placeLevel(tx, target, position)
    })
}

export type LevelInput = {
    gdId: number
    name: string
    creator: string
    // Username of the verifier, null if nobody is verifying it yet
    verifier: string | null
    verificationProgress: number
    videoUrl: string | null
    gameDifficulty: GameDifficulty
    // Null is N/A
    listDifficultyId: number | null
    // Null keeps the level on the Future List
    position: number | null
}

// Checks the input and returns the columns to store
function levelColumns(input: LevelInput, levelId: number | null) {
    const sameGdId = db
        .select({ name: level.name })
        .from(level)
        .where(
            and(eq(level.gdId, input.gdId), levelId === null ? undefined : ne(level.id, levelId)),
        )
        .get()

    if (sameGdId !== undefined) {
        throw new ActionError(`The level with this ID is already on the list: ${sameGdId.name}`)
    }

    let verifierId: string | null = null

    if (input.verifier !== null) {
        const verifier = db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.username, input.verifier.toLowerCase()))
            .get()

        if (verifier === undefined) {
            throw new ActionError(`There's no player called ${input.verifier}`)
        }

        verifierId = verifier.id
    }

    if (input.listDifficultyId !== null) {
        const chosen = db
            .select({ id: difficulty.id })
            .from(difficulty)
            .where(eq(difficulty.id, input.listDifficultyId))
            .get()

        if (chosen === undefined) {
            throw new ActionError("This LemonList difficulty doesn't exist anymore")
        }
    }

    if (input.position !== null && input.verificationProgress !== 100) {
        throw new ActionError(
            'Only verified levels can be placed on the Main List, set the verification progress to 100%',
        )
    }

    return {
        gdId: input.gdId,
        name: input.name,
        creator: input.creator,
        verifierId,
        verificationProgress: input.verificationProgress,
        videoUrl: input.videoUrl,
        gameDifficulty: input.gameDifficulty,
        listDifficultyId: input.listDifficultyId,
    }
}

// Saves the uploaded preview first, it's deleted again if the level can't be saved
async function withPreview<T>(preview: Uint8Array | null, save: (key: string | null) => T) {
    const key = preview === null ? null : await saveImage(MediaKind.Preview, preview)

    try {
        return save(key)
    } catch (error) {
        if (key !== null) {
            await deleteMedia(key)
        }

        throw error
    }
}

export async function createLevel(input: LevelInput, preview: Uint8Array | null) {
    const columns = levelColumns(input, null)

    return withPreview(preview, (key) =>
        db.transaction((tx) => {
            const created = tx
                .insert(level)
                .values({ ...columns, preview: key })
                .returning({ id: level.id, name: level.name, position: level.position })
                .get()

            placeLevel(tx, created, input.position)
            return created.id
        }),
    )
}

export async function updateLevel(
    levelId: number,
    input: LevelInput,
    preview: Uint8Array | null,
    removePreview: boolean,
) {
    const current = findLevel(levelId)
    const columns = levelColumns(input, levelId)
    const replacesPreview = preview !== null || removePreview

    await withPreview(preview, (key) =>
        db.transaction((tx) => {
            tx.update(level)
                .set(replacesPreview ? { ...columns, preview: key } : columns)
                .where(eq(level.id, levelId))
                .run()

            // The history keeps the new name from now on
            placeLevel(tx, { ...current, name: input.name }, input.position)
        }),
    )

    if (replacesPreview && current.preview !== null) {
        await deleteMedia(current.preview)
    }
}

export async function deleteLevel(levelId: number) {
    const current = findLevel(levelId)

    db.transaction((tx) => {
        // Writes the removal into the history, it keeps the name after the level is gone
        placeLevel(tx, current, null)
        tx.delete(level).where(eq(level.id, levelId)).run()
    })

    if (current.preview !== null) {
        await deleteMedia(current.preview)
    }
}

// Difficulties of our own meter

function findDifficulty(id: number) {
    const row = db
        .select({ id: difficulty.id, face: difficulty.face, position: difficulty.position })
        .from(difficulty)
        .where(eq(difficulty.id, id))
        .get()

    if (row === undefined) {
        throw new ActionError("This difficulty doesn't exist anymore")
    }

    return row
}

function difficultiesCount(tx: Transaction) {
    return tx.select({ count: count() }).from(difficulty).get()?.count ?? 0
}

// Names are unique no matter the case, "easy demon" would look like a copy of "Easy Demon"
function checkDifficultyName(name: string, difficultyId: number | null) {
    const same = db
        .select({ name: difficulty.name })
        .from(difficulty)
        .where(
            and(
                sql`lower(${difficulty.name}) = lower(${name})`,
                difficultyId === null ? undefined : ne(difficulty.id, difficultyId),
            ),
        )
        .get()

    if (same !== undefined) {
        throw new ActionError("There's already a difficulty called " + same.name)
    }
}

// Moves a difficulty to the position (clamped to the meter), the ones in between shift by one
function placeDifficulty(tx: Transaction, difficultyId: number, from: number, position: number) {
    const to = clamp(position, 1, difficultiesCount(tx))

    if (to < from) {
        tx.update(difficulty)
            .set({ position: sql`${difficulty.position} + 1` })
            .where(and(gte(difficulty.position, to), lt(difficulty.position, from)))
            .run()
    } else if (to > from) {
        tx.update(difficulty)
            .set({ position: sql`${difficulty.position} - 1` })
            .where(and(gt(difficulty.position, from), lte(difficulty.position, to)))
            .run()
    }

    tx.update(difficulty).set({ position: to }).where(eq(difficulty.id, difficultyId)).run()
}

// Null position puts it at the end, as the hardest
export async function createDifficulty(name: string, face: Uint8Array, position: number | null) {
    checkDifficultyName(name, null)

    const key = await saveImage(MediaKind.DifficultyFace, face)

    try {
        db.transaction((tx) => {
            const last = difficultiesCount(tx) + 1
            const created = tx
                .insert(difficulty)
                .values({ name, face: key, position: last })
                .returning({ id: difficulty.id })
                .get()

            placeDifficulty(tx, created.id, last, position ?? last)
        })
    } catch (error) {
        await deleteMedia(key)
        throw error
    }
}

// Null face keeps the current one
export async function updateDifficulty(
    difficultyId: number,
    name: string,
    face: Uint8Array | null,
) {
    const current = findDifficulty(difficultyId)

    checkDifficultyName(name, difficultyId)

    const key = face === null ? null : await saveImage(MediaKind.DifficultyFace, face)

    try {
        db.update(difficulty)
            .set(key === null ? { name } : { name, face: key })
            .where(eq(difficulty.id, difficultyId))
            .run()
    } catch (error) {
        if (key !== null) {
            await deleteMedia(key)
        }

        throw error
    }

    if (key !== null) {
        await deleteMedia(current.face)
    }
}

export function moveDifficulty(difficultyId: number, position: number) {
    const current = findDifficulty(difficultyId)

    db.transaction((tx) => {
        placeDifficulty(tx, current.id, current.position, position)
    })
}

// Levels with this difficulty become N/A
export async function deleteDifficulty(difficultyId: number) {
    const current = findDifficulty(difficultyId)

    db.transaction((tx) => {
        tx.delete(difficulty).where(eq(difficulty.id, difficultyId)).run()
        tx.update(difficulty)
            .set({ position: sql`${difficulty.position} - 1` })
            .where(gt(difficulty.position, current.position))
            .run()
    })

    await deleteMedia(current.face)
}
