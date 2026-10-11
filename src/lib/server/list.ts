// Database queries of the demon list, returning the shapes from #lib/list.ts
import {
    aliasedTable,
    and,
    asc,
    avg,
    count,
    desc,
    eq,
    isNotNull,
    isNull,
    or,
    sql,
    type SQL,
} from 'drizzle-orm'
import { db } from '#lib/server/db/index.ts'
import { difficulty, level, listChange, rating, record, user } from '#lib/server/db/schema.ts'
import { avatarUrl, levelThumbnailUrl, mediaUrl } from '#lib/server/media.ts'
import { isAdminRole } from '#lib/auth-rules.ts'
import {
    ENGAGEMENT_MAX,
    PlayerFilter,
    RecordStatus,
    type AdminDifficulty,
    type AdminPlayer,
    type LeaderboardEntry,
    type Level,
    type LevelRecord,
    type LevelDraft,
    type LevelRef,
    type ListChange,
    type ListDifficulty,
    type PlayerRef,
    type ReviewRecord,
} from '#lib/list.ts'

// List points of a level at the given position of the Main List
export function pointsFor(position: number) {
    return Math.round(250 * Math.pow(0.88, position - 1) * 100) / 100
}

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
            placedAt: level.placedAt,
            createdAt: level.createdAt,
            verifier: playerColumns(verifier),
        })
        .from(level)
        .leftJoin(verifier, and(eq(verifier.id, level.verifierId), visiblePlayer(verifier)))
        .leftJoin(difficulty, eq(difficulty.id, level.listDifficultyId))
        .where(where)
        .orderBy(asc(level.position), desc(level.verificationProgress), asc(level.createdAt))
        .all()

    const statsOf = levelStats(where)

    return rows.map((row): Level => {
        const stats = statsOf(row.id)

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
            engagement: stats.engagement,
            ratingsCount: stats.ratingsCount,
            points: row.position === null ? 0 : pointsFor(row.position),
            recordsCount: stats.recordsCount,
            addedAt: row.placedAt ?? row.createdAt,
        }
    })
}

export function getMainList() {
    return selectLevels(isNotNull(level.position))
}

// The closest to being verified first
export function getFutureList() {
    return selectLevels(isNull(level.position))
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

export function hasCompleted(levelId: number, playerId: string) {
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

export function getLeaderboard(): LeaderboardEntry[] {
    const players = db
        .select({ ...playerColumns(user), accountVerified: user.accountVerified })
        .from(user)
        .where(and(visiblePlayer(), eq(user.emailVerified, true)))
        .all()

    const completions = Map.groupBy(selectCompletions(), (row) => row.player.username)

    const entries = players.flatMap((player) => {
        const ref = toPlayerRef(player)

        if (ref === null) {
            return []
        }

        // Sorted by position, so the first one is the hardest
        const beaten = completions.get(ref.username) ?? []
        const hardest = beaten[0]

        return [
            {
                rank: 0,
                player: ref,
                points: roundPoints(
                    beaten.reduce((sum, row) => sum + pointsFor(row.level.position ?? 0), 0),
                ),
                completions: beaten.length,
                hardest: hardest === undefined ? null : toLevelRef(hardest.level),
                accountVerified: player.accountVerified,
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

    const verified = db
        .select(levelRefColumns)
        .from(level)
        .where(and(eq(level.verifierId, playerId), isNotNull(level.position)))
        .orderBy(asc(level.position))
        .all()

    return {
        rank: entry.rank,
        points: entry.points,
        completions: entry.completions,
        hardest: entry.hardest,
        accountVerified: entry.accountVerified,
        completed: completed.map(toLevelRecord),
        progress: progress.map(toLevelRecord),
        verified: verified.map(toLevelRef),
    }
}

// Records submitted by the player, with every status
export function getSubmissions(playerId: string) {
    return selectRecords(eq(record.playerId, playerId))
        .orderBy(desc(record.submittedAt))
        .all()
        .map(toLevelRecord)
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

    return selectCompletions(eq(record.playerId, playerId))
        .filter((row) => !rated.has(row.level.id))
        .map((row) => toLevelRef(row.level))
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

// Best approved progress of the player on the level, 0 without records
export function getBestProgress(levelId: number, playerId: string) {
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

// Admin tools

export function countPendingRecords() {
    const row = db
        .select({ count: count() })
        .from(record)
        .innerJoin(user, eq(user.id, record.playerId))
        .where(and(eq(record.status, RecordStatus.Pending), visiblePlayer()))
        .get()

    return row?.count ?? 0
}

// The review queue starts from the oldest submission, the other statuses from the newest
export function getReviewRecords(status: RecordStatus, limit: number): ReviewRecord[] {
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
        )
        .limit(limit)
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

// Every account, including banned ones and the ones without a verified email
export function getAdminPlayers(filter: PlayerFilter, search: string, limit: number) {
    const filters: Record<PlayerFilter, SQL | undefined> = {
        [PlayerFilter.Unverified]: and(
            eq(user.accountVerified, false),
            eq(user.emailVerified, true),
            or(isNull(user.banned), eq(user.banned, false)),
        ),
        [PlayerFilter.All]: undefined,
        [PlayerFilter.Admins]: sql`${user.role} like '%admin%'`,
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
        .where(and(filters[filter], matches))
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .all()
        .filter((row) => filter !== PlayerFilter.Admins || isAdminRole(row.role))
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
