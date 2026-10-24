// Database queries of the demon list, returning the shapes from #lib/list.ts
import {
    aliasedTable,
    and,
    asc,
    avg,
    count,
    countDistinct,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    or,
    sql,
    type SQL,
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
import { avatarUrl, levelThumbnailUrl, mediaUrl } from '#lib/server/media.ts'
import { ADMIN_ROLE, isAdminRole } from '#lib/auth-rules.ts'
import {
    ENGAGEMENT_MAX,
    PlayerFilter,
    RecordStatus,
    SKILLSET_SCORE_MAX,
    type AdminDifficulty,
    type AdminPlayer,
    type AdminSkillset,
    type LeaderboardEntry,
    type Level,
    type LevelRecord,
    type LevelDraft,
    type LevelRef,
    type LevelSubmission,
    type ListChange,
    type PlayerSubmission,
    type ListDifficulty,
    type PlayerRef,
    type ReviewRecord,
    type ReviewSubmission,
    type Skillset,
    type SkillsetScore,
    type SkillsetTags,
    type LevelSkillsetScore,
} from '#lib/list.ts'

// List points of a level at the given position of the Main List
export function pointsFor(position: number) {
    return Math.round(250 * Math.pow(0.88, position - 1) * 100) / 100
}

// Order of the Future List: the places set by the admins, then the levels without one (they just
// joined it) with the closest to being verified first
export const futureListOrder = [
    sql`${level.futurePosition} is null`,
    asc(level.futurePosition),
    desc(level.verificationProgress),
    asc(level.createdAt),
]

function roundPoints(points: number) {
    return Math.round(points * 100) / 100
}

// Banned players and accounts without a username don't show up anywhere
function visiblePlayer(player: typeof user = user) {
    return and(isNotNull(player.username), or(isNull(player.banned), eq(player.banned, false)))
}

const verifier = aliasedTable(user, 'verifier')

const playerColumns = (player: typeof user) => ({
    username: player.username,
    displayUsername: player.displayUsername,
    avatar: player.avatar,
})

type PlayerRow = {
    username: string | null
    displayUsername: string | null
    avatar: string | null
}

// Null for accounts without a username, they can't have a profile
function toPlayerRef(row: PlayerRow): PlayerRef | null {
    if (row.username === null) {
        return null
    }

    return {
        username: row.username,
        displayUsername: row.displayUsername ?? row.username,
        avatarUrl: avatarUrl(row.avatar),
    }
}

function requirePlayerRef(row: PlayerRow) {
    const player = toPlayerRef(row)

    if (player === null) {
        throw new Error('Player without a username')
    }

    return player
}

const levelRefColumns = {
    id: level.id,
    name: level.name,
    position: level.position,
    preview: level.preview,
    videoUrl: level.videoUrl,
}

type LevelRefRow = {
    id: number
    name: string
    position: number | null
    preview: string | null
    videoUrl: string | null
}

function toLevelRef(row: LevelRefRow): LevelRef {
    return {
        id: row.id,
        name: row.name,
        position: row.position,
        thumbnailUrl: levelThumbnailUrl(row.preview, row.videoUrl),
    }
}

const difficultyColumns = {
    id: difficulty.id,
    name: difficulty.name,
    face: difficulty.face,
}

type DifficultyRow = {
    id: number
    name: string
    face: string
}

function toListDifficulty(row: DifficultyRow): ListDifficulty {
    return { id: row.id, name: row.name, faceUrl: mediaUrl(row.face) }
}

// Our own difficulty meter, from the easiest
export function getDifficulties() {
    return db
        .select(difficultyColumns)
        .from(difficulty)
        .orderBy(asc(difficulty.position), asc(difficulty.id))
        .all()
        .map(toListDifficulty)
}

export function getAdminDifficulties() {
    const levelsCount = count(level.id)

    return db
        .select({ ...difficultyColumns, position: difficulty.position, levelsCount })
        .from(difficulty)
        .leftJoin(level, eq(level.listDifficultyId, difficulty.id))
        .groupBy(difficulty.id)
        .orderBy(asc(difficulty.position), asc(difficulty.id))
        .all()
        .map((row): AdminDifficulty => ({
            ...toListDifficulty(row),
            position: row.position,
            levelsCount: row.levelsCount,
        }))
}

// Engagement and records of the levels, by level id
function levelStats(where?: SQL) {
    const ratings = db
        .select({ levelId: rating.levelId, engagement: avg(rating.score), count: count() })
        .from(rating)
        .innerJoin(level, eq(level.id, rating.levelId))
        .where(where)
        .groupBy(rating.levelId)
        .all()

    // Every player counts once, no matter how many records they have on the level
    const records = db
        .selectDistinct({ levelId: record.levelId, playerId: record.playerId })
        .from(record)
        .innerJoin(level, eq(level.id, record.levelId))
        .innerJoin(user, eq(user.id, record.playerId))
        .where(and(where, eq(record.status, RecordStatus.Approved), visiblePlayer()))
        .all()

    const stats = new Map<
        number,
        { engagement: number | null; ratingsCount: number; recordsCount: number }
    >()
    const statsOf = (levelId: number) => {
        const existing = stats.get(levelId)

        if (existing !== undefined) {
            return existing
        }

        const created = { engagement: null, ratingsCount: 0, recordsCount: 0 }
        stats.set(levelId, created)
        return created
    }

    for (const row of ratings) {
        const levelStats = statsOf(row.levelId)
        levelStats.engagement = row.engagement === null ? null : Number(row.engagement)
        levelStats.ratingsCount = row.count
    }

    for (const row of records) {
        statsOf(row.levelId).recordsCount++
    }

    return statsOf
}

function selectLevels(where: SQL | undefined) {
    const rows = db
        .select({
            ...levelRefColumns,
            gdId: level.gdId,
            creator: level.creator,
            verificationProgress: level.verificationProgress,
            gameDifficulty: level.gameDifficulty,
            listDifficulty: difficultyColumns,
            futurePosition: level.futurePosition,
            placedAt: level.placedAt,
            createdAt: level.createdAt,
            verifier: playerColumns(verifier),
        })
        .from(level)
        .leftJoin(verifier, and(eq(verifier.id, level.verifierId), visiblePlayer(verifier)))
        .leftJoin(difficulty, eq(difficulty.id, level.listDifficultyId))
        .where(where)
        .orderBy(asc(level.position), ...futureListOrder)
        .all()

    const statsOf = levelStats(where)
    const votes = skillsetVotes(where)
    const skillsets = votes.size === 0 ? [] : getSkillsets()

    return rows.map((row): Level => {
        const stats = statsOf(row.id)
        const levelVotes = votes.get(row.id)
        const main =
            levelVotes === undefined
                ? undefined
                : toSkillsetScores(skillsets, normalizeScores(levelVotes))[0]

        return {
            ...toLevelRef(row),
            gdId: row.gdId,
            creator: row.creator,
            verifier: row.verifier === null ? null : toPlayerRef(row.verifier),
            verificationProgress: row.verificationProgress,
            videoUrl: row.videoUrl,
            gameDifficulty: row.gameDifficulty,
            listDifficulty:
                row.listDifficulty === null ? null : toListDifficulty(row.listDifficulty),
            futurePosition: row.position === null ? row.futurePosition : null,
            engagement: stats.engagement,
            ratingsCount: stats.ratingsCount,
            skillset: main === undefined ? null : main.skillset,
            points: row.position === null ? 0 : pointsFor(row.position),
            recordsCount: stats.recordsCount,
            addedAt: row.placedAt ?? row.createdAt,
        }
    })
}

export function getMainList() {
    return selectLevels(isNotNull(level.position))
}

// The hardest first. Places come from the order, the stored ones can have gaps or be missing
export function getFutureList() {
    return selectLevels(isNull(level.position)).map((row, index) => ({
        ...row,
        futurePosition: index + 1,
    }))
}

export function getLevel(id: number) {
    return selectLevels(eq(level.id, id))[0]
}

export function getLevelNeighbours(current: Level) {
    if (current.position === null) {
        return { previous: null, next: null }
    }

    const neighbour = (position: number) => {
        const row = db.select(levelRefColumns).from(level).where(eq(level.position, position)).get()

        return row === undefined ? null : toLevelRef(row)
    }

    return {
        previous: neighbour(current.position - 1),
        next: neighbour(current.position + 1),
    }
}

function selectRecords(where: SQL | undefined) {
    return db
        .select({
            id: record.id,
            progress: record.progress,
            videoUrl: record.videoUrl,
            submittedAt: record.submittedAt,
            status: record.status,
            level: levelRefColumns,
            player: playerColumns(user),
        })
        .from(record)
        .innerJoin(level, eq(level.id, record.levelId))
        .innerJoin(user, eq(user.id, record.playerId))
        .where(and(where, visiblePlayer()))
}

type RecordRow = ReturnType<ReturnType<typeof selectRecords>['all']>[number]

function toLevelRecord(row: RecordRow): LevelRecord {
    return {
        id: row.id,
        level: toLevelRef(row.level),
        player: requirePlayerRef(row.player),
        progress: row.progress,
        videoUrl: row.videoUrl,
        submittedAt: row.submittedAt,
        status: row.status,
    }
}

// Keeps the first record of every player and level, sort the rows by the best first
function bestPerPlayer(rows: RecordRow[]) {
    const seen = new Set<string>()

    return rows.filter((row) => {
        const key = `${row.level.id}:${row.player.username}`

        if (seen.has(key)) {
            return false
        }

        seen.add(key)
        return true
    })
}

// The best approved record of every player on the level
export function getLevelRecords(levelId: number) {
    const rows = selectRecords(
        and(eq(record.levelId, levelId), eq(record.status, RecordStatus.Approved)),
    )
        .orderBy(desc(record.progress), asc(record.submittedAt))
        .all()

    return bestPerPlayer(rows).map(toLevelRecord)
}

// How many players gave each score, index 0 is the score 1
export function getEngagementDistribution(levelId: number) {
    const rows = db
        .select({ score: rating.score, count: count() })
        .from(rating)
        .where(eq(rating.levelId, levelId))
        .groupBy(rating.score)
        .all()

    return Array.from(
        { length: ENGAGEMENT_MAX },
        (_, index) => rows.find((row) => row.score === index + 1)?.count ?? 0,
    )
}

// The verifier beat the level too, a verified level counts like a completion
function isVerifier(levelId: number, playerId: string) {
    const row = db
        .select({ id: level.id })
        .from(level)
        .where(
            and(
                eq(level.id, levelId),
                eq(level.verifierId, playerId),
                eq(level.verificationProgress, 100),
            ),
        )
        .get()

    return row !== undefined
}

export function hasCompleted(levelId: number, playerId: string) {
    if (isVerifier(levelId, playerId)) {
        return true
    }

    const row = db
        .select({ id: record.id })
        .from(record)
        .where(
            and(
                eq(record.levelId, levelId),
                eq(record.playerId, playerId),
                eq(record.status, RecordStatus.Approved),
                eq(record.progress, 100),
            ),
        )
        .get()

    return row !== undefined
}

// Only players who beat a level of the Main List can rate it
export function getViewerRating(current: Level, playerId: string | undefined) {
    if (playerId === undefined || current.position === null) {
        return { canRate: false, rating: null }
    }

    const row = db
        .select({ score: rating.score })
        .from(rating)
        .where(and(eq(rating.levelId, current.id), eq(rating.playerId, playerId)))
        .get()

    return {
        canRate: hasCompleted(current.id, playerId),
        rating: row === undefined ? null : row.score,
    }
}

// Approved completions of Main List levels, one per player and level
function selectCompletions(where?: SQL) {
    const rows = selectRecords(
        and(
            where,
            eq(record.status, RecordStatus.Approved),
            eq(record.progress, 100),
            isNotNull(level.position),
        ),
    )
        .orderBy(asc(level.position), asc(record.submittedAt))
        .all()

    return bestPerPlayer(rows)
}

// Verified levels of the Main List, the verifier gets them like completions
function selectVerifications(where?: SQL) {
    return db
        .select({ level: levelRefColumns, username: verifier.username })
        .from(level)
        .innerJoin(verifier, eq(verifier.id, level.verifierId))
        .where(
            and(
                where,
                isNotNull(level.position),
                eq(level.verificationProgress, 100),
                visiblePlayer(verifier),
            ),
        )
        .orderBy(asc(level.position))
        .all()
}

// Levels beaten by every player (completions and verifications), the hardest first
function beatenLevels() {
    const beaten = new Map<string, Map<number, LevelRefRow>>()
    const add = (username: string | null, row: LevelRefRow) => {
        if (username === null) {
            return
        }

        const levels = beaten.get(username) ?? new Map<number, LevelRefRow>()
        levels.set(row.id, row)
        beaten.set(username, levels)
    }

    for (const row of selectCompletions()) {
        add(row.player.username, row.level)
    }

    for (const row of selectVerifications()) {
        add(row.username, row.level)
    }

    return (username: string) =>
        [...(beaten.get(username)?.values() ?? [])].sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
        )
}

export function getLeaderboard(): LeaderboardEntry[] {
    const players = db
        .select({ ...playerColumns(user), accountVerified: user.accountVerified })
        .from(user)
        .where(and(visiblePlayer(), eq(user.emailVerified, true)))
        .all()

    const beatenBy = beatenLevels()
    const tags = skillsetTags(beatenBy)

    const entries = players.flatMap((player) => {
        const ref = toPlayerRef(player)

        if (ref === null) {
            return []
        }

        // Sorted by position, so the first one is the hardest
        const beaten = beatenBy(ref.username)
        const hardest = beaten[0]

        return [
            {
                rank: 0,
                player: ref,
                points: roundPoints(
                    beaten.reduce((sum, row) => sum + pointsFor(row.position ?? 0), 0),
                ),
                completions: beaten.length,
                hardest: hardest === undefined ? null : toLevelRef(hardest),
                accountVerified: player.accountVerified,
                skillset: tags[ref.username] ?? null,
            },
        ]
    })

    entries.sort(
        (a, b) =>
            b.points - a.points ||
            b.completions - a.completions ||
            a.player.displayUsername.localeCompare(b.player.displayUsername),
    )

    // Players with the same points share the rank
    return entries.map((entry, index) => {
        const previous = entries.findIndex((other) => other.points === entry.points)

        return { ...entry, rank: (previous === -1 ? index : previous) + 1 }
    })
}

export function getPlayer(username: string) {
    return db
        .select({
            id: user.id,
            ...playerColumns(user),
            accountVerified: user.accountVerified,
            iconKit: user.iconKit,
            showSkillsets: user.showSkillsets,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(and(eq(user.username, username), visiblePlayer()))
        .get()
}

// Null if the player isn't on the leaderboard (banned or without a verified email)
export function getPlayerProfile(playerId: string, username: string) {
    const entry = getLeaderboard().find((other) => other.player.username === username)

    if (entry === undefined) {
        return null
    }

    const completed = selectCompletions(eq(record.playerId, playerId))
    const completedIds = new Set(completed.map((row) => row.level.id))
    const completedLevels =
        completed.length === 0 ? [] : selectLevels(inArray(level.id, [...completedIds]))

    // Best progress on the levels the player hasn't beaten yet
    const progress = bestPerPlayer(
        selectRecords(
            and(
                eq(record.playerId, playerId),
                eq(record.status, RecordStatus.Approved),
                isNotNull(level.position),
            ),
        )
            .orderBy(desc(record.progress), asc(record.submittedAt))
            .all()
            .filter((row) => !completedIds.has(row.level.id)),
    ).sort((a, b) => (a.level.position ?? 0) - (b.level.position ?? 0))

    const verified = selectVerifications(eq(level.verifierId, playerId)).map((row) => row.level)

    return {
        rank: entry.rank,
        points: entry.points,
        completions: entry.completions,
        hardest: entry.hardest,
        accountVerified: entry.accountVerified,
        skillset: entry.skillset,
        // Shown like the levels of the lists, with their whole levels
        completed: completed.flatMap((row): PlayerSubmission[] => {
            const beaten = completedLevels.find((other) => other.id === row.level.id)

            return beaten === undefined ? [] : [{ ...toLevelRecord(row), level: beaten }]
        }),
        progress: progress.map(toLevelRecord),
        verified: verified.map(toLevelRef),
    }
}

export function countSubmissions(playerId: string) {
    const row = db
        .select({ count: count() })
        .from(record)
        .where(eq(record.playerId, playerId))
        .get()

    return row?.count ?? 0
}

// Records submitted by the player with every status, the newest first, with their whole levels
export function getSubmissions(playerId: string, limit: number, offset: number) {
    const rows = selectRecords(eq(record.playerId, playerId))
        .orderBy(desc(record.submittedAt), desc(record.id))
        .limit(limit)
        .offset(offset)
        .all()

    if (rows.length === 0) {
        return []
    }

    const levels = selectLevels(
        inArray(
            level.id,
            rows.map((row) => row.level.id),
        ),
    )

    return rows.flatMap((row): PlayerSubmission[] => {
        const submitted = levels.find((other) => other.id === row.level.id)

        return submitted === undefined ? [] : [{ ...toLevelRecord(row), level: submitted }]
    })
}

// Beaten levels the player hasn't rated yet
export function getLevelsToRate(playerId: string) {
    const rated = new Set(
        db
            .select({ levelId: rating.levelId })
            .from(rating)
            .where(eq(rating.playerId, playerId))
            .all()
            .map((row) => row.levelId),
    )

    const beaten = new Map<number, LevelRefRow>()

    for (const row of selectCompletions(eq(record.playerId, playerId))) {
        beaten.set(row.level.id, row.level)
    }

    for (const row of selectVerifications(eq(level.verifierId, playerId))) {
        beaten.set(row.level.id, row.level)
    }

    return [...beaten.values()]
        .filter((row) => !rated.has(row.id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(toLevelRef)
}

export function getRecentRecords(limit: number) {
    return selectRecords(
        and(
            eq(record.status, RecordStatus.Approved),
            eq(record.progress, 100),
            isNotNull(level.position),
        ),
    )
        .orderBy(desc(record.submittedAt))
        .limit(limit)
        .all()
        .map(toLevelRecord)
}

export function getRecentChanges(limit: number): ListChange[] {
    return db
        .select({
            id: listChange.id,
            date: listChange.createdAt,
            kind: listChange.kind,
            levelName: listChange.levelName,
            from: listChange.from,
            to: listChange.to,
            level: levelRefColumns,
        })
        .from(listChange)
        .leftJoin(level, eq(level.id, listChange.levelId))
        .orderBy(desc(listChange.createdAt), desc(listChange.id))
        .limit(limit)
        .all()
        .map((row) => ({ ...row, level: row.level === null ? null : toLevelRef(row.level) }))
}

export function getListStats() {
    const countLevels = (where: SQL) =>
        db.select({ count: count() }).from(level).where(where).get()?.count ?? 0
    const players = db
        .select({ count: count() })
        .from(user)
        .where(and(visiblePlayer(), eq(user.emailVerified, true)))
        .get()
    const records = db
        .select({ count: count() })
        .from(record)
        .innerJoin(user, eq(user.id, record.playerId))
        .where(and(eq(record.status, RecordStatus.Approved), visiblePlayer()))
        .get()

    return {
        levels: countLevels(isNotNull(level.position)),
        futureLevels: countLevels(isNull(level.position)),
        players: players?.count ?? 0,
        records: records?.count ?? 0,
    }
}

// Best approved progress of the player on the level, 0 without records, 100 for the verifier
export function getBestProgress(levelId: number, playerId: string) {
    if (isVerifier(levelId, playerId)) {
        return 100
    }

    const row = db
        .select({ progress: record.progress })
        .from(record)
        .where(
            and(
                eq(record.levelId, levelId),
                eq(record.playerId, playerId),
                eq(record.status, RecordStatus.Approved),
            ),
        )
        .orderBy(desc(record.progress))
        .get()

    return row === undefined ? 0 : row.progress
}

export function hasPendingRecord(levelId: number, playerId: string) {
    const row = db
        .select({ id: record.id })
        .from(record)
        .where(
            and(
                eq(record.levelId, levelId),
                eq(record.playerId, playerId),
                eq(record.status, RecordStatus.Pending),
            ),
        )
        .get()

    return row !== undefined
}

// Skillsets

const skillsetColumns = {
    id: skillset.id,
    name: skillset.name,
    description: skillset.description,
    icon: skillset.icon,
}

type SkillsetRow = {
    id: number
    name: string
    description: string | null
    icon: string
}

function toSkillset(row: SkillsetRow): Skillset {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        iconUrl: mediaUrl(row.icon),
    }
}

// In the order of the admins
export function getSkillsets() {
    return db
        .select(skillsetColumns)
        .from(skillset)
        .orderBy(asc(skillset.position), asc(skillset.id))
        .all()
        .map(toSkillset)
}

export function getAdminSkillsets() {
    return db
        .select({
            ...skillsetColumns,
            position: skillset.position,
            levelsCount: countDistinct(skillsetVote.levelId),
        })
        .from(skillset)
        .leftJoin(skillsetVote, eq(skillsetVote.skillsetId, skillset.id))
        .groupBy(skillset.id)
        .orderBy(asc(skillset.position), asc(skillset.id))
        .all()
        .map((row): AdminSkillset => ({
            ...toSkillset(row),
            position: row.position,
            levelsCount: row.levelsCount,
        }))
}

// Scales the values so the biggest one becomes SKILLSET_SCORE_MAX, drops the ones at 0
function normalizeScores(values: Map<number, number>) {
    const max = Math.max(0, ...values.values())
    const scores = new Map<number, number>()

    if (max === 0) {
        return scores
    }

    for (const [skillsetId, value] of values) {
        if (value > 0) {
            scores.set(skillsetId, (value / max) * SKILLSET_SCORE_MAX)
        }
    }

    return scores
}

// The skillsets with a score from the best one, ties keep the order of the admins
function toSkillsetScores(skillsets: Skillset[], scores: Map<number, number>) {
    return skillsets
        .flatMap((current): SkillsetScore[] => {
            const score = scores.get(current.id)

            return score === undefined ? [] : [{ skillset: current, score }]
        })
        .sort((a, b) => b.score - a.score)
}

// How many players voted for every skillset of the Main List levels, by level and skillset id
function skillsetVotes(where?: SQL) {
    const rows = db
        .select({
            levelId: skillsetVote.levelId,
            skillsetId: skillsetVote.skillsetId,
            votes: count(),
        })
        .from(skillsetVote)
        .innerJoin(level, eq(level.id, skillsetVote.levelId))
        .where(and(where, isNotNull(level.position)))
        .groupBy(skillsetVote.levelId, skillsetVote.skillsetId)
        .all()

    const votes = new Map<number, Map<number, number>>()

    for (const row of rows) {
        const levelVotes = votes.get(row.levelId) ?? new Map<number, number>()
        levelVotes.set(row.skillsetId, row.votes)
        votes.set(row.levelId, levelVotes)
    }

    return votes
}

// Skillsets of a level of the Main List from the best one, and how many players voted
export function getLevelSkillsets(current: Level) {
    if (current.position === null) {
        return { scores: [], voters: 0 }
    }

    const votes = skillsetVotes(eq(level.id, current.id)).get(current.id) ?? new Map()
    const voters = db
        .select({ count: countDistinct(skillsetVote.playerId) })
        .from(skillsetVote)
        .where(eq(skillsetVote.levelId, current.id))
        .get()

    return {
        scores: toSkillsetScores(getSkillsets(), normalizeScores(votes)).map(
            (score): LevelSkillsetScore => ({ ...score, votes: votes.get(score.skillset.id) ?? 0 }),
        ),
        voters: voters?.count ?? 0,
    }
}

// Only players who beat a level of the Main List can vote for its skillsets
export function getViewerSkillsets(current: Level, playerId: string | undefined) {
    if (playerId === undefined || current.position === null) {
        return { canVote: false, votes: [] }
    }

    const votes = db
        .select({ skillsetId: skillsetVote.skillsetId })
        .from(skillsetVote)
        .where(and(eq(skillsetVote.levelId, current.id), eq(skillsetVote.playerId, playerId)))
        .all()
        .map((row) => row.skillsetId)

    return { canVote: hasCompleted(current.id, playerId), votes }
}

// Scores of every player: the scores of the levels they beat summed up for every skillset, then
// scaled like the ones of a level, by skillset id
function playerSkillsetScores(beatenBy: (username: string) => LevelRefRow[]) {
    const levelScores = new Map<number, Map<number, number>>()

    for (const [levelId, votes] of skillsetVotes()) {
        levelScores.set(levelId, normalizeScores(votes))
    }

    return (username: string) => {
        const sums = new Map<number, number>()

        for (const row of beatenBy(username)) {
            for (const [skillsetId, score] of levelScores.get(row.id) ?? []) {
                sums.set(skillsetId, (sums.get(skillsetId) ?? 0) + score)
            }
        }

        return normalizeScores(sums)
    }
}

// Main skillset of every player who shows it: the best score, the first in the admins' order on a
// tie
function skillsetTags(beatenBy: (username: string) => LevelRefRow[]): SkillsetTags {
    const skillsets = getSkillsets()
    const scoresOf = playerSkillsetScores(beatenBy)
    const players = db
        .select({ username: user.username })
        .from(user)
        .where(and(visiblePlayer(), eq(user.showSkillsetTag, true)))
        .all()
    const tags: SkillsetTags = {}

    for (const player of players) {
        if (player.username === null) {
            continue
        }

        const main = toSkillsetScores(skillsets, scoresOf(player.username))[0]

        if (main !== undefined) {
            tags[player.username] = main.skillset
        }
    }

    return tags
}

export function getSkillsetTags() {
    return skillsetTags(beatenLevels())
}

export function getPlayerSkillsets(username: string) {
    return toSkillsetScores(getSkillsets(), playerSkillsetScores(beatenLevels())(username))
}

// Admin tools

export function countReviewRecords(status: RecordStatus) {
    const row = db
        .select({ count: count() })
        .from(record)
        .innerJoin(user, eq(user.id, record.playerId))
        .where(and(eq(record.status, status), visiblePlayer()))
        .get()

    return row?.count ?? 0
}

export function countPendingRecords() {
    return countReviewRecords(RecordStatus.Pending)
}

// The review queue starts from the oldest submission, the other statuses from the newest
export function getReviewRecords(
    status: RecordStatus,
    limit: number,
    offset: number,
): ReviewRecord[] {
    return db
        .select({
            id: record.id,
            progress: record.progress,
            videoUrl: record.videoUrl,
            rawFootageUrl: record.rawFootageUrl,
            notes: record.notes,
            submittedAt: record.submittedAt,
            status: record.status,
            playerId: record.playerId,
            accountVerified: user.accountVerified,
            level: levelRefColumns,
            player: playerColumns(user),
        })
        .from(record)
        .innerJoin(level, eq(level.id, record.levelId))
        .innerJoin(user, eq(user.id, record.playerId))
        .where(and(eq(record.status, status), visiblePlayer()))
        .orderBy(
            status === RecordStatus.Pending ? asc(record.submittedAt) : desc(record.submittedAt),
            desc(record.id),
        )
        .limit(limit)
        .offset(offset)
        .all()
        .map((row) => ({
            id: row.id,
            level: toLevelRef(row.level),
            player: requirePlayerRef(row.player),
            progress: row.progress,
            videoUrl: row.videoUrl,
            rawFootageUrl: row.rawFootageUrl,
            notes: row.notes,
            submittedAt: row.submittedAt,
            status: row.status,
            playerId: row.playerId,
            accountVerified: row.accountVerified,
        }))
}

// Accounts of a tab of the admin players page that match the search
function adminPlayersWhere(filter: PlayerFilter, search: string) {
    const filters: Record<PlayerFilter, SQL | undefined> = {
        [PlayerFilter.Unverified]: and(
            eq(user.accountVerified, false),
            eq(user.emailVerified, true),
            or(isNull(user.banned), eq(user.banned, false)),
        ),
        [PlayerFilter.All]: undefined,
        // Like isAdminRole: one of the comma separated roles
        [PlayerFilter.Admins]: sql`',' || replace(${user.role}, ' ', '') || ',' like ${'%,' + ADMIN_ROLE + ',%'}`,
        [PlayerFilter.Banned]: eq(user.banned, true),
    }
    const pattern = '%' + search.replace(/[\\%_]/g, (char) => '\\' + char) + '%'
    const matches =
        search === ''
            ? undefined
            : or(
                  sql`${user.username} like ${pattern} escape '\\'`,
                  sql`${user.displayUsername} like ${pattern} escape '\\'`,
                  sql`${user.email} like ${pattern} escape '\\'`,
              )

    return and(filters[filter], matches)
}

export function countAdminPlayers(filter: PlayerFilter, search: string) {
    return (
        db.select({ count: count() }).from(user).where(adminPlayersWhere(filter, search)).get()
            ?.count ?? 0
    )
}

// Every account, including banned ones and the ones without a verified email
export function getAdminPlayers(
    filter: PlayerFilter,
    search: string,
    limit: number,
    offset: number,
) {
    return db
        .select({
            id: user.id,
            username: user.username,
            displayUsername: user.displayUsername,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            accountVerified: user.accountVerified,
            role: user.role,
            banned: user.banned,
            banReason: user.banReason,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(adminPlayersWhere(filter, search))
        .orderBy(desc(user.createdAt), asc(user.id))
        .limit(limit)
        .offset(offset)
        .all()
        .map((row): AdminPlayer => ({
            id: row.id,
            username: row.username,
            displayUsername: row.displayUsername ?? row.username ?? row.name,
            email: row.email,
            avatarUrl: avatarUrl(row.avatar),
            hasAvatar: row.avatar !== null,
            emailVerified: row.emailVerified,
            accountVerified: row.accountVerified,
            admin: isAdminRole(row.role),
            banned: row.banned === true,
            banReason: row.banReason,
            createdAt: row.createdAt,
        }))
}

export function getLevelDraft(id: number): LevelDraft | undefined {
    const row = db
        .select({
            ...levelRefColumns,
            gdId: level.gdId,
            creator: level.creator,
            verificationProgress: level.verificationProgress,
            gameDifficulty: level.gameDifficulty,
            listDifficultyId: level.listDifficultyId,
            verifier: verifier.username,
        })
        .from(level)
        .leftJoin(verifier, eq(verifier.id, level.verifierId))
        .where(eq(level.id, id))
        .get()

    if (row === undefined) {
        return undefined
    }

    return {
        id: row.id,
        gdId: row.gdId,
        name: row.name,
        creator: row.creator,
        verifier: row.verifier,
        verificationProgress: row.verificationProgress,
        videoUrl: row.videoUrl,
        thumbnailUrl: levelThumbnailUrl(row.preview, row.videoUrl),
        hasPreview: row.preview !== null,
        gameDifficulty: row.gameDifficulty,
        listDifficultyId: row.listDifficultyId,
        position: row.position,
    }
}

// Usernames of the players for the verifier field
export function getPlayerUsernames() {
    return db
        .select({ username: user.username })
        .from(user)
        .where(visiblePlayer())
        .orderBy(asc(user.username))
        .all()
        .flatMap((row) => (row.username === null ? [] : [row.username]))
}

export function getMainListSize() {
    return (
        db.select({ count: count() }).from(level).where(isNotNull(level.position)).get()?.count ?? 0
    )
}

// Level submissions

function selectSubmissions(where: SQL | undefined) {
    return db
        .select({
            id: levelSubmission.id,
            gdId: levelSubmission.gdId,
            name: levelSubmission.name,
            creator: levelSubmission.creator,
            gameDifficulty: levelSubmission.gameDifficulty,
            preview: levelSubmission.preview,
            videoUrl: levelSubmission.videoUrl,
            rawFootageUrl: levelSubmission.rawFootageUrl,
            notes: levelSubmission.notes,
            status: levelSubmission.status,
            submittedAt: levelSubmission.submittedAt,
            playerId: levelSubmission.playerId,
            accountVerified: user.accountVerified,
            player: playerColumns(user),
            listDifficulty: difficultyColumns,
            level: levelRefColumns,
        })
        .from(levelSubmission)
        .innerJoin(user, eq(user.id, levelSubmission.playerId))
        .leftJoin(difficulty, eq(difficulty.id, levelSubmission.listDifficultyId))
        .leftJoin(level, eq(level.id, levelSubmission.levelId))
        .where(and(where, visiblePlayer()))
}

type SubmissionRow = ReturnType<ReturnType<typeof selectSubmissions>['all']>[number]

function toLevelSubmission(row: SubmissionRow): LevelSubmission {
    return {
        id: row.id,
        gdId: row.gdId,
        name: row.name,
        creator: row.creator,
        gameDifficulty: row.gameDifficulty,
        listDifficulty: row.listDifficulty === null ? null : toListDifficulty(row.listDifficulty),
        thumbnailUrl: levelThumbnailUrl(row.preview, row.videoUrl),
        videoUrl: row.videoUrl,
        rawFootageUrl: row.rawFootageUrl,
        notes: row.notes,
        status: row.status,
        submittedAt: row.submittedAt,
        level: row.level === null ? null : toLevelRef(row.level),
    }
}

function toReviewSubmission(row: SubmissionRow): ReviewSubmission {
    return {
        ...toLevelSubmission(row),
        player: requirePlayerRef(row.player),
        playerId: row.playerId,
        accountVerified: row.accountVerified,
        hasPreview: row.preview !== null,
    }
}

// Levels the player sent, with every status
export function getLevelSubmissions(playerId: string) {
    return selectSubmissions(eq(levelSubmission.playerId, playerId))
        .orderBy(desc(levelSubmission.submittedAt))
        .all()
        .map(toLevelSubmission)
}

export function countReviewSubmissions(status: RecordStatus) {
    const row = db
        .select({ count: count() })
        .from(levelSubmission)
        .innerJoin(user, eq(user.id, levelSubmission.playerId))
        .where(and(eq(levelSubmission.status, status), visiblePlayer()))
        .get()

    return row?.count ?? 0
}

export function countPendingSubmissions() {
    return countReviewSubmissions(RecordStatus.Pending)
}

// The review queue starts from the oldest submission, the other statuses from the newest
export function getReviewSubmissions(status: RecordStatus, limit: number, offset: number) {
    return selectSubmissions(eq(levelSubmission.status, status))
        .orderBy(
            status === RecordStatus.Pending
                ? asc(levelSubmission.submittedAt)
                : desc(levelSubmission.submittedAt),
            desc(levelSubmission.id),
        )
        .limit(limit)
        .offset(offset)
        .all()
        .map(toReviewSubmission)
}

export function getReviewSubmission(id: number) {
    const row = selectSubmissions(eq(levelSubmission.id, id)).get()

    return row === undefined ? undefined : toReviewSubmission(row)
}
