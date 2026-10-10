// Placeholder data for the UI templates.
// Every exported function mirrors a future database query: replace them one by one with real
// queries returning the same shapes, then delete this file.
import { placeholderAvatar, placeholderImage } from '#lib/format.ts'
import {
    Difficulty,
    ENGAGEMENT_MAX,
    ListChangeKind,
    RecordStatus,
    type LeaderboardEntry,
    type Level,
    type LevelRecord,
    type LevelRef,
    type ListChange,
    type PlayerRef,
} from '#lib/list.ts'

const DAY = 24 * 60 * 60 * 1000
const BASE_DATE = Date.UTC(2026, 9, 1)

function daysAgo(days: number) {
    return new Date(BASE_DATE - days * DAY)
}

const players: PlayerRef[] = [
    'Zestful',
    'SourPatch',
    'CitrusKid',
    'Limeade',
    'PeelMaster',
    'Pulpy',
    'JuiceBox',
    'Rindwalker',
    'Squeezy',
    'Lemonhead',
    'Zestiny',
    'TartTart',
    'PlayerName',
    'WaveSpammer',
].map((name) => ({
    username: name.toLowerCase(),
    displayUsername: name,
    avatarUrl: placeholderAvatar(),
}))

type LevelSeed = {
    name: string
    creator: string
    gameDifficulty: Difficulty
    listDifficulty: Difficulty | null
    engagement: number | null
}

const mainSeeds: LevelSeed[] = [
    {
        name: 'Citrus Cataclysm',
        creator: 'CreatorName',
        gameDifficulty: Difficulty.ExtremeDemon,
        listDifficulty: Difficulty.ExtremeDemon,
        engagement: 9.1,
    },
    {
        name: 'Sour Factory',
        creator: 'BlockBuilder',
        gameDifficulty: Difficulty.ExtremeDemon,
        listDifficulty: Difficulty.ExtremeDemon,
        engagement: 7.4,
    },
    {
        name: 'Zest Overdrive',
        creator: 'CreatorName',
        gameDifficulty: Difficulty.InsaneDemon,
        listDifficulty: Difficulty.ExtremeDemon,
        engagement: 8.6,
    },
    {
        name: 'Peel Paradox',
        creator: 'Glowstick',
        gameDifficulty: Difficulty.InsaneDemon,
        listDifficulty: Difficulty.InsaneDemon,
        engagement: 6.9,
    },
    {
        name: 'Lemon Labyrinth',
        creator: 'ShipLord',
        gameDifficulty: Difficulty.InsaneDemon,
        listDifficulty: Difficulty.InsaneDemon,
        engagement: 8.2,
    },
    {
        name: 'Acidic Ascent',
        creator: 'BlockBuilder',
        gameDifficulty: Difficulty.HardDemon,
        listDifficulty: Difficulty.InsaneDemon,
        engagement: 5.8,
    },
    {
        name: 'Juice Junction',
        creator: 'SawbladeFan',
        gameDifficulty: Difficulty.HardDemon,
        listDifficulty: Difficulty.HardDemon,
        engagement: 7.7,
    },
    {
        name: 'Rind Runner',
        creator: 'Glowstick',
        gameDifficulty: Difficulty.HardDemon,
        listDifficulty: Difficulty.HardDemon,
        engagement: 6.3,
    },
    {
        name: 'Tangy Temple',
        creator: 'ShipLord',
        gameDifficulty: Difficulty.InsaneDemon,
        listDifficulty: Difficulty.HardDemon,
        engagement: 7.1,
    },
    {
        name: 'Squeeze Play',
        creator: 'CreatorName',
        gameDifficulty: Difficulty.MediumDemon,
        listDifficulty: Difficulty.HardDemon,
        engagement: 8.8,
    },
    {
        name: 'Pulp Fiction',
        creator: 'SawbladeFan',
        gameDifficulty: Difficulty.MediumDemon,
        listDifficulty: Difficulty.MediumDemon,
        engagement: 6.6,
    },
    {
        name: 'Yellow Wave',
        creator: 'WaveMaker',
        gameDifficulty: Difficulty.MediumDemon,
        listDifficulty: Difficulty.MediumDemon,
        engagement: 5.2,
    },
    {
        name: 'Lemonade Stand',
        creator: 'Glowstick',
        gameDifficulty: Difficulty.EasyDemon,
        listDifficulty: Difficulty.MediumDemon,
        engagement: 7.9,
    },
    {
        name: 'Seed Spitter',
        creator: 'WaveMaker',
        gameDifficulty: Difficulty.EasyDemon,
        listDifficulty: Difficulty.EasyDemon,
        engagement: 4.7,
    },
    {
        name: 'First Squeeze',
        creator: 'BlockBuilder',
        gameDifficulty: Difficulty.EasyDemon,
        listDifficulty: Difficulty.EasyDemon,
        engagement: null,
    },
]

const futureSeeds: (LevelSeed & { verificationProgress: number; hasVerifier: boolean })[] = [
    {
        name: 'Bitter End',
        creator: 'CreatorName',
        gameDifficulty: Difficulty.ExtremeDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 87,
        hasVerifier: true,
    },
    {
        name: 'Vitamin Sea',
        creator: 'ShipLord',
        gameDifficulty: Difficulty.InsaneDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 100,
        hasVerifier: true,
    },
    {
        name: 'Citric Storm',
        creator: 'Glowstick',
        gameDifficulty: Difficulty.HardDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 54,
        hasVerifier: true,
    },
    {
        name: 'Unnamed Lemon',
        creator: 'SawbladeFan',
        gameDifficulty: Difficulty.MediumDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 0,
        hasVerifier: false,
    },
]

function pointsFor(position: number) {
    return Math.round(250 * Math.pow(0.88, position - 1) * 100) / 100
}

function playerAt(index: number) {
    const player = players[index % players.length]

    if (player === undefined) {
        throw new Error('No placeholder players')
    }

    return player
}

const mainLevels: Level[] = mainSeeds.map((seed, index) => {
    const position = index + 1

    return {
        ...seed,
        id: position,
        position,
        gdId: 90000000 + position * 13579,
        thumbnailUrl: placeholderImage(640, 360, seed.name),
        verifier: playerAt(index % 4),
        verificationProgress: 100,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ratingsCount: seed.engagement === null ? 0 : 3 + ((position * 7) % 20),
        points: pointsFor(position),
        recordsCount: 0,
        addedAt: daysAgo(10 + position * 9),
    }
})

const futureLevels: Level[] = futureSeeds.map((seed, index) => {
    const id = 100 + index

    return {
        name: seed.name,
        creator: seed.creator,
        gameDifficulty: seed.gameDifficulty,
        listDifficulty: seed.listDifficulty,
        engagement: seed.engagement,
        id,
        position: null,
        gdId: 110000000 + id * 2468,
        thumbnailUrl: placeholderImage(640, 360, seed.name),
        verifier: seed.hasVerifier ? playerAt(index + 1) : null,
        verificationProgress: seed.verificationProgress,
        videoUrl: null,
        ratingsCount: 0,
        points: 0,
        recordsCount: 0,
        addedAt: daysAgo(2 + index * 5),
    }
})

function toRef(level: Level): LevelRef {
    return {
        id: level.id,
        name: level.name,
        position: level.position,
        thumbnailUrl: level.thumbnailUrl,
    }
}

// Harder levels (lower position) are beaten by fewer players
const records: LevelRecord[] = mainLevels.flatMap((level, levelIndex) => {
    const completers = Math.min(players.length, 1 + Math.floor((levelIndex + 1) * 0.9))
    const levelRecords: LevelRecord[] = []

    for (let playerIndex = 0; playerIndex < completers + 2; playerIndex++) {
        if (playerIndex >= players.length) {
            break
        }

        const beaten = playerIndex < completers
        const status =
            (levelIndex + playerIndex) % 11 === 5
                ? RecordStatus.Pending
                : (levelIndex + playerIndex) % 17 === 8
                  ? RecordStatus.Rejected
                  : RecordStatus.Approved

        levelRecords.push({
            id: levelIndex * 100 + playerIndex,
            level: toRef(level),
            player: playerAt(playerIndex),
            progress: beaten ? 100 : 41 + ((levelIndex * 13 + playerIndex * 7) % 55),
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            submittedAt: daysAgo(1 + ((levelIndex * 5 + playerIndex * 3) % 60)),
            status,
        })
    }

    return levelRecords
})

for (const level of mainLevels) {
    level.recordsCount = records.filter(
        (record) => record.level.id === level.id && record.status === RecordStatus.Approved,
    ).length
}

const byNewest = (a: LevelRecord, b: LevelRecord) =>
    b.submittedAt.getTime() - a.submittedAt.getTime()

export function getMainList() {
    return mainLevels
}

export function getFutureList() {
    return futureLevels
}

export function getLevel(id: number) {
    return (
        mainLevels.find((level) => level.id === id) ?? futureLevels.find((level) => level.id === id)
    )
}

export function getLevelNeighbours(level: Level) {
    if (level.position === null) {
        return { previous: null, next: null }
    }

    const position = level.position
    const previous = mainLevels.find((other) => other.position === position - 1)
    const next = mainLevels.find((other) => other.position === position + 1)

    return {
        previous: previous === undefined ? null : toRef(previous),
        next: next === undefined ? null : toRef(next),
    }
}

export function getLevelRecords(levelId: number) {
    return records
        .filter((record) => record.level.id === levelId && record.status === RecordStatus.Approved)
        .sort(
            (a, b) => b.progress - a.progress || a.submittedAt.getTime() - b.submittedAt.getTime(),
        )
}

// How many players gave each score, index 0 is the score 1
export function getEngagementDistribution(level: Level) {
    const engagement = level.engagement

    if (engagement === null) {
        return Array.from({ length: ENGAGEMENT_MAX }, () => 0)
    }

    const weights = Array.from({ length: ENGAGEMENT_MAX }, (_, index) =>
        Math.exp(-Math.pow(index + 1 - engagement, 2) / 3),
    )
    const total = weights.reduce((sum, weight) => sum + weight, 0)

    return weights.map((weight) => Math.round((weight / total) * level.ratingsCount))
}

export function getLeaderboard(): LeaderboardEntry[] {
    const entries = players.map((player, index) => {
        const beaten = records.filter(
            (record) =>
                record.player.username === player.username &&
                record.status === RecordStatus.Approved &&
                record.progress === 100,
        )
        const levels = beaten
            .map((record) => mainLevels.find((level) => level.id === record.level.id))
            .filter((level) => level !== undefined)
        const hardest = levels.reduce<Level | null>(
            (best, level) =>
                best === null || (level.position ?? Infinity) < (best.position ?? Infinity)
                    ? level
                    : best,
            null,
        )

        return {
            rank: 0,
            player,
            points: Math.round(levels.reduce((sum, level) => sum + level.points, 0) * 100) / 100,
            completions: levels.length,
            hardest: hardest === null ? null : toRef(hardest),
            accountVerified: index % 5 !== 4,
        }
    })

    return entries
        .sort((a, b) => b.points - a.points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

export function findPlaceholderPlayer(username: string) {
    return players.find((player) => player.username === username)
}

// Profile data of any player. Real accounts that don't exist in the placeholders get the stats of
// a template player, so their pages still show every block
export function getPlayerProfile(username: string) {
    const leaderboard = getLeaderboard()
    const entry =
        leaderboard.find((other) => other.player.username === username) ?? leaderboard[2] ?? null

    if (entry === null) {
        return null
    }

    const playerRecords = records
        .filter(
            (record) =>
                record.player.username === entry.player.username &&
                record.status === RecordStatus.Approved,
        )
        .sort((a, b) => (a.level.position ?? Infinity) - (b.level.position ?? Infinity))

    return {
        rank: entry.rank,
        points: entry.points,
        completions: entry.completions,
        hardest: entry.hardest,
        accountVerified: entry.accountVerified,
        completed: playerRecords.filter((record) => record.progress === 100),
        progress: playerRecords.filter((record) => record.progress < 100),
        verified: mainLevels
            .filter((level) => level.verifier?.username === entry.player.username)
            .map(toRef),
    }
}

// Records submitted by the signed in player, with every status
export function getSubmissions() {
    const template = playerAt(4)

    return records.filter((record) => record.player.username === template.username).sort(byNewest)
}

// Beaten levels the player hasn't rated yet
export function getLevelsToRate() {
    return mainLevels.slice(9, 12).map(toRef)
}

export function getRecentRecords(limit: number) {
    return records
        .filter((record) => record.status === RecordStatus.Approved && record.progress === 100)
        .sort(byNewest)
        .slice(0, limit)
}

export function getRecentChanges(): ListChange[] {
    const level = (index: number) => {
        const found = mainLevels[index]

        if (found === undefined) {
            throw new Error('Missing placeholder level')
        }

        return toRef(found)
    }

    return [
        {
            id: 1,
            date: daysAgo(1),
            kind: ListChangeKind.Placed,
            level: level(2),
            from: null,
            to: 3,
        },
        {
            id: 2,
            date: daysAgo(1),
            kind: ListChangeKind.MovedDown,
            level: level(3),
            from: 3,
            to: 4,
        },
        {
            id: 3,
            date: daysAgo(6),
            kind: ListChangeKind.MovedUp,
            level: level(8),
            from: 11,
            to: 9,
        },
        {
            id: 4,
            date: daysAgo(14),
            kind: ListChangeKind.Removed,
            level: { id: 999, name: 'Old Lemon', position: null, thumbnailUrl: '' },
            from: 7,
            to: null,
        },
    ]
}

export function getListStats() {
    return {
        levels: mainLevels.length,
        futureLevels: futureLevels.length,
        players: players.length,
        records: records.filter((record) => record.status === RecordStatus.Approved).length,
    }
}
