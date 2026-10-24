// Changes of the demon list made by players (records, ratings, avatars) and admins (levels, reviews,
// verification). Throws ActionError with a message that is safe to show
import {
    and,
    asc,
    count,
    eq,
    gt,
    gte,
    inArray,
    isNotNull,
    isNull,
    lt,
    lte,
    ne,
    sql,
} from 'drizzle-orm'
import { db } from '#lib/server/db/index.ts'
import {
    difficulty,
    level,
    levelSubmission,
    listChange,
    rating,
    record,
    skillset,
    skillsetVote,
    user,
} from '#lib/server/db/schema.ts'
import { MediaKind, deleteMedia, saveImage } from '#lib/server/media.ts'
import { ActionError } from '#lib/server/forms.ts'
import {
    futureListOrder,
    getBestProgress,
    hasCompleted,
    hasPendingRecord,
} from '#lib/server/list.ts'
import { GameDifficulty, ListChangeKind, RecordStatus } from '#lib/list.ts'
import { shuffleDifficulties } from '#lib/difficulty-shuffle.ts'
import type { IconKit } from '#lib/icons.ts'

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

// Replaces the skillsets the player chose for the level, none takes their vote back
export function voteSkillsets(playerId: string, levelId: number, skillsetIds: number[]) {
    const target = findLevel(levelId)

    if (target.position === null || !hasCompleted(target.id, playerId)) {
        throw new ActionError('Only players who beat this level can vote for its skillsets')
    }

    const chosen = [...new Set(skillsetIds)]
    const existing =
        chosen.length === 0
            ? []
            : db
                  .select({ id: skillset.id })
                  .from(skillset)
                  .where(inArray(skillset.id, chosen))
                  .all()

    if (existing.length !== chosen.length) {
        throw new ActionError('Some of these skillsets were deleted, reload the page')
    }

    db.transaction((tx) => {
        tx.delete(skillsetVote)
            .where(and(eq(skillsetVote.levelId, target.id), eq(skillsetVote.playerId, playerId)))
            .run()

        if (chosen.length > 0) {
            tx.insert(skillsetVote)
                .values(chosen.map((skillsetId) => ({ levelId: target.id, playerId, skillsetId })))
                .run()
        }
    })
}

export function setSkillsetSettings(
    userId: string,
    showSkillsetTag: boolean,
    showSkillsets: boolean,
) {
    db.update(user).set({ showSkillsetTag, showSkillsets }).where(eq(user.id, userId)).run()
}

// The icon kit is kept when the avatar changes, so the garage remembers it
function setAvatarKey(userId: string, key: string | null, iconKit?: IconKit) {
    const previous = db.select({ avatar: user.avatar }).from(user).where(eq(user.id, userId)).get()

    db.update(user)
        .set(
            iconKit === undefined
                ? { avatar: key }
                : { avatar: key, iconKit: JSON.stringify(iconKit) },
        )
        .where(eq(user.id, userId))
        .run()

    return previous === undefined ? null : previous.avatar
}

export async function setAvatar(userId: string, image: Uint8Array) {
    const key = await saveImage(MediaKind.Avatar, image)
    const previous = setAvatarKey(userId, key)

    if (previous !== null) {
        await deleteMedia(previous)
    }
}

// The icon built in the garage becomes the avatar, `image` is its render (renderKitIcon)
export async function setIconKit(userId: string, iconKit: IconKit, image: Uint8Array) {
    const key = await saveImage(MediaKind.Avatar, image)
    const previous = setAvatarKey(userId, key, iconKit)

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
        // Coming back to the Future List later puts the level at its end, not at its old place
        tx.update(level)
            .set({ position: to, futurePosition: null, placedAt: new Date() })
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

type ListedLevel = {
    id: number
    listDifficultyId: number | null
}

// Takes our difficulties along with a move (#lib/difficulty-shuffle.ts). `levels` are in the order
// of the list, `index` is the new place of the level starting from 0
function shuffleListDifficulties(
    tx: Transaction,
    levels: ListedLevel[],
    levelId: number,
    index: number,
) {
    const changes = shuffleDifficulties(
        levels.map((row) => ({
            id: row.id,
            difficulty: row.listDifficultyId === null ? null : { id: row.listDifficultyId },
        })),
        levels.findIndex((row) => row.id === levelId),
        index,
    )

    for (const change of changes) {
        tx.update(level)
            .set({ listDifficultyId: change.to.id })
            .where(eq(level.id, change.id))
            .run()
    }
}

// Moves a level of the Main List, `withDifficulties` takes our difficulties along
export function moveLevel(levelId: number, position: number, withDifficulties: boolean) {
    const target = findLevel(levelId)

    if (target.position === null) {
        throw new ActionError('This level is on the Future List now')
    }

    db.transaction((tx) => {
        if (withDifficulties) {
            const levels = tx
                .select({ id: level.id, listDifficultyId: level.listDifficultyId })
                .from(level)
                .where(isNotNull(level.position))
                .orderBy(asc(level.position))
                .all()

            shuffleListDifficulties(tx, levels, levelId, position - 1)
        }

        placeLevel(tx, target, position)
    })
}

// Moves a level of the Future List to the place (1 is the hardest). Renumbers the whole list, so
// gaps and levels without a place are fixed on the way
export function moveFutureLevel(levelId: number, place: number, withDifficulties: boolean) {
    const target = findLevel(levelId)

    if (target.position !== null) {
        throw new ActionError('This level is on the Main List now')
    }

    db.transaction((tx) => {
        const levels = tx
            .select({ id: level.id, listDifficultyId: level.listDifficultyId })
            .from(level)
            .where(isNull(level.position))
            .orderBy(...futureListOrder)
            .all()
        const ids = levels.map((row) => row.id)

        if (withDifficulties) {
            shuffleListDifficulties(tx, levels, levelId, place - 1)
        }

        const reordered = ids.filter((id) => id !== levelId)
        reordered.splice(clamp(place, 1, ids.length) - 1, 0, levelId)

        reordered.forEach((id, index) => {
            tx.update(level)
                .set({ futurePosition: index + 1 })
                .where(eq(level.id, id))
                .run()
        })
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

// Null is N/A
function checkListDifficulty(difficultyId: number | null) {
    if (difficultyId === null) {
        return
    }

    const chosen = db
        .select({ id: difficulty.id })
        .from(difficulty)
        .where(eq(difficulty.id, difficultyId))
        .get()

    if (chosen === undefined) {
        throw new ActionError("This LemonList difficulty doesn't exist anymore")
    }
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

    checkListDifficulty(input.listDifficultyId)

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

// Level submissions: players send levels they beat that aren't on the list, the admins place them

// Pending submissions a player can have at once
const PENDING_SUBMISSIONS_MAX = 5

export type SubmissionInput = {
    gdId: number
    name: string
    creator: string
    gameDifficulty: GameDifficulty
    // Our difficulty the player suggests, null is N/A
    listDifficultyId: number | null
    videoUrl: string
    rawFootageUrl: string | null
    notes: string | null
}

export async function submitLevel(
    playerId: string,
    input: SubmissionInput,
    preview: Uint8Array | null,
) {
    const listed = db
        .select({ name: level.name })
        .from(level)
        .where(eq(level.gdId, input.gdId))
        .get()

    if (listed !== undefined) {
        throw new ActionError(
            `${listed.name} is on the list already, submit a record for it on your dashboard`,
        )
    }

    const pending = db
        .select({ gdId: levelSubmission.gdId })
        .from(levelSubmission)
        .where(
            and(
                eq(levelSubmission.playerId, playerId),
                eq(levelSubmission.status, RecordStatus.Pending),
            ),
        )
        .all()

    if (pending.some((row) => row.gdId === input.gdId)) {
        throw new ActionError('You already sent this level, it is waiting for a review')
    }

    if (pending.length >= PENDING_SUBMISSIONS_MAX) {
        throw new ActionError(
            `You can have up to ${PENDING_SUBMISSIONS_MAX} levels waiting for a review, wait for the admins to check them`,
        )
    }

    checkListDifficulty(input.listDifficultyId)

    await withPreview(preview, (key) =>
        db
            .insert(levelSubmission)
            .values({ ...input, playerId, preview: key })
            .run(),
    )
}

function findPendingSubmission(submissionId: number, playerId: string | null = null) {
    const row = db
        .select({
            id: levelSubmission.id,
            playerId: levelSubmission.playerId,
            gdId: levelSubmission.gdId,
            preview: levelSubmission.preview,
        })
        .from(levelSubmission)
        .where(
            and(
                eq(levelSubmission.id, submissionId),
                eq(levelSubmission.status, RecordStatus.Pending),
                playerId === null ? undefined : eq(levelSubmission.playerId, playerId),
            ),
        )
        .get()

    if (row === undefined) {
        throw new ActionError('This submission was reviewed or withdrawn already')
    }

    return row
}

// Players can take back their submissions until an admin reviews them
export async function withdrawLevelSubmission(playerId: string, submissionId: number) {
    const submission = findPendingSubmission(submissionId, playerId)

    db.delete(levelSubmission).where(eq(levelSubmission.id, submission.id)).run()

    if (submission.preview !== null) {
        await deleteMedia(submission.preview)
    }
}

export async function rejectLevelSubmission(submissionId: number) {
    const submission = findPendingSubmission(submissionId)

    db.update(levelSubmission)
        .set({ status: RecordStatus.Rejected, preview: null })
        .where(eq(levelSubmission.id, submission.id))
        .run()

    if (submission.preview !== null) {
        await deleteMedia(submission.preview)
    }
}

// Makes the level from the form of the admins (it can differ from the submission). The completion
// of the player becomes a record, approved right away if their account is verified. Pending
// submissions of the same level by other players become records waiting for a review. The preview
// of the player stays unless the admins upload another one or remove it. Returns the level id
export async function acceptLevelSubmission(
    submissionId: number,
    input: LevelInput,
    preview: Uint8Array | null,
    removePreview: boolean,
) {
    const submission = findPendingSubmission(submissionId)
    const columns = levelColumns(input, null)
    const submissions = db
        .select({
            id: levelSubmission.id,
            playerId: levelSubmission.playerId,
            preview: levelSubmission.preview,
            videoUrl: levelSubmission.videoUrl,
            rawFootageUrl: levelSubmission.rawFootageUrl,
            notes: levelSubmission.notes,
            accountVerified: user.accountVerified,
        })
        .from(levelSubmission)
        .innerJoin(user, eq(user.id, levelSubmission.playerId))
        .where(
            and(
                eq(levelSubmission.gdId, submission.gdId),
                eq(levelSubmission.status, RecordStatus.Pending),
            ),
        )
        .all()
    const replacesPreview = preview !== null || removePreview

    const levelId = await withPreview(preview, (key) =>
        db.transaction((tx) => {
            const created = tx
                .insert(level)
                .values({ ...columns, preview: replacesPreview ? key : submission.preview })
                .returning({ id: level.id, name: level.name, position: level.position })
                .get()

            placeLevel(tx, created, input.position)

            for (const row of submissions) {
                const reviewed = row.id === submission.id

                // The verifier beat it already, the verification counts like a completion
                if (row.playerId !== columns.verifierId) {
                    tx.insert(record)
                        .values({
                            levelId: created.id,
                            playerId: row.playerId,
                            progress: 100,
                            videoUrl: row.videoUrl,
                            rawFootageUrl: row.rawFootageUrl,
                            notes: row.notes,
                            status:
                                reviewed && row.accountVerified
                                    ? RecordStatus.Approved
                                    : RecordStatus.Pending,
                        })
                        .run()
                }

                tx.update(levelSubmission)
                    .set({ status: RecordStatus.Approved, levelId: created.id, preview: null })
                    .where(eq(levelSubmission.id, row.id))
                    .run()
            }

            return created.id
        }),
    )

    // The preview of the accepted submission went to the level, unless it was replaced
    for (const row of submissions) {
        if (row.preview !== null && (row.id !== submission.id || replacesPreview)) {
            await deleteMedia(row.preview)
        }
    }

    return levelId
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

// Skillsets

function findSkillset(id: number) {
    const row = db
        .select({ id: skillset.id, icon: skillset.icon, position: skillset.position })
        .from(skillset)
        .where(eq(skillset.id, id))
        .get()

    if (row === undefined) {
        throw new ActionError("This skillset doesn't exist anymore")
    }

    return row
}

function skillsetsCount(tx: Transaction) {
    return tx.select({ count: count() }).from(skillset).get()?.count ?? 0
}

// Names are unique no matter the case, like the ones of the difficulties
function checkSkillsetName(name: string, skillsetId: number | null) {
    const same = db
        .select({ name: skillset.name })
        .from(skillset)
        .where(
            and(
                sql`lower(${skillset.name}) = lower(${name})`,
                skillsetId === null ? undefined : ne(skillset.id, skillsetId),
            ),
        )
        .get()

    if (same !== undefined) {
        throw new ActionError("There's already a skillset called " + same.name)
    }
}

export type SkillsetInput = {
    name: string
    description: string | null
}

// Skillsets are equal, the position only keeps them in the order they were added
export async function createSkillset(input: SkillsetInput, icon: Uint8Array) {
    checkSkillsetName(input.name, null)

    const key = await saveImage(MediaKind.SkillsetIcon, icon)

    try {
        db.transaction((tx) => {
            tx.insert(skillset)
                .values({ ...input, icon: key, position: skillsetsCount(tx) + 1 })
                .run()
        })
    } catch (error) {
        await deleteMedia(key)
        throw error
    }
}

// Null icon keeps the current one
export async function updateSkillset(
    skillsetId: number,
    input: SkillsetInput,
    icon: Uint8Array | null,
) {
    const current = findSkillset(skillsetId)

    checkSkillsetName(input.name, skillsetId)

    const key = icon === null ? null : await saveImage(MediaKind.SkillsetIcon, icon)

    try {
        db.update(skillset)
            .set(key === null ? input : { ...input, icon: key })
            .where(eq(skillset.id, skillsetId))
            .run()
    } catch (error) {
        if (key !== null) {
            await deleteMedia(key)
        }

        throw error
    }

    if (key !== null) {
        await deleteMedia(current.icon)
    }
}

// Its votes go with it
export async function deleteSkillset(skillsetId: number) {
    const current = findSkillset(skillsetId)

    db.transaction((tx) => {
        tx.delete(skillset).where(eq(skillset.id, skillsetId)).run()
        tx.update(skillset)
            .set({ position: sql`${skillset.position} - 1` })
            .where(gt(skillset.position, current.position))
            .run()
    })

    await deleteMedia(current.icon)
}
