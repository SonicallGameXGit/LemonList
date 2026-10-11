// Fills the database with sample data for development: pnpm db:seed
// Adds sample players (password: lemonlist), levels with generated previews, records, ratings and
// list history, and the Demons In Between difficulties if they're missing. Refuses to run if there are levels already, pnpm db:seed --reset deletes ALL list
// data (levels, records, ratings, history) and the sample players first.
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import Database from 'better-sqlite3'
import { hashPassword } from 'better-auth/crypto'
import { count, inArray, isNotNull, like, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import sharp from 'sharp'
import * as schema from '../src/lib/server/db/schema.ts'
import { ENGAGEMENT_MAX, GameDifficulty, ListChangeKind, RecordStatus } from '../src/lib/list.ts'
import { MediaKind, deleteMediaFile, writeImage } from '../src/lib/server/media-store.ts'
import { addDibDifficulties } from './dib.ts'
import { drawScene } from './scene.ts'

const { difficulty, level, listChange, rating, record, user, account } = schema

const databaseUrl = process.env.DATABASE_URL
const mediaDir =
    process.env.MEDIA_DIR === undefined || process.env.MEDIA_DIR === ''
        ? 'media'
        : process.env.MEDIA_DIR

if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL is not set')
}

const client = new Database(databaseUrl)
client.pragma('foreign_keys = ON')

const db = drizzle(client, { schema })

const SEED_EMAIL_DOMAIN = '@seed.lemonlist.test'
const SEED_PASSWORD = 'lemonlist'
const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

function daysAgo(days: number) {
    return new Date(now - days * DAY)
}

async function reset() {
    const previews = db
        .select({ preview: level.preview })
        .from(level)
        .where(isNotNull(level.preview))
        .all()
    const players = db
        .select({ id: user.id, avatar: user.avatar })
        .from(user)
        .where(like(user.email, '%' + SEED_EMAIL_DOMAIN))
        .all()

    db.transaction((tx) => {
        tx.delete(listChange).run()
        tx.delete(rating).run()
        tx.delete(record).run()
        tx.delete(level).run()

        if (players.length > 0) {
            tx.delete(user)
                .where(
                    inArray(
                        user.id,
                        players.map((player) => player.id),
                    ),
                )
                .run()
        }
    })

    const keys = [...previews.map((row) => row.preview), ...players.map((player) => player.avatar)]

    for (const key of keys) {
        if (key !== null) {
            await deleteMediaFile(mediaDir, key)
        }
    }

    console.info(`Deleted the list data and ${players.length} sample players`)
}

if (process.argv.includes('--reset')) {
    await reset()
}

const existing = db.select({ count: count() }).from(level).get()

if (existing !== undefined && existing.count > 0) {
    console.error(
        'The database already has levels. Run pnpm db:seed --reset to replace ALL list data.',
    )
    process.exit(1)
}

// Our own difficulties, the levels use them by name

const addedDifficulties = await addDibDifficulties(db, mediaDir)

if (addedDifficulties.length > 0) {
    console.info(`Added ${addedDifficulties.length} Demons In Between difficulties`)
}

function difficultyId(name: string | null) {
    if (name === null) {
        return null
    }

    const row = db
        .select({ id: difficulty.id })
        .from(difficulty)
        .where(sql`lower(${difficulty.name}) = lower(${name})`)
        .get()

    if (row === undefined) {
        throw new Error('Missing difficulty ' + name)
    }

    return row.id
}

// Players

const playerNames = [
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
]

const BANNED_PLAYER = 'WaveSpammer'

const gdSprite = (file: string) => path.join(import.meta.dirname, '../static/gd', file)

// The default cube in different colors, like icons of real players
async function drawAvatar(index: number) {
    if (index === 9) {
        return sharp(gdSprite('cube-lemon.png')).png().toBuffer()
    }

    return sharp(gdSprite('cube-default.png'))
        .modulate({ hue: index * 47 })
        .png()
        .toBuffer()
}

const passwordHash = await hashPassword(SEED_PASSWORD)

const players = await Promise.all(
    playerNames.map(async (name, index) => ({
        id: randomUUID(),
        name,
        email: name.toLowerCase() + SEED_EMAIL_DOMAIN,
        emailVerified: true,
        username: name.toLowerCase(),
        displayUsername: name,
        role: index === 0 ? 'admin' : 'user',
        banned: name === BANNED_PLAYER,
        banReason: name === BANNED_PLAYER ? 'Fake records' : null,
        // The last players keep the default cube
        avatar:
            index < 11
                ? await writeImage(mediaDir, MediaKind.Avatar, await drawAvatar(index))
                : null,
        accountVerified: index % 5 !== 4,
        createdAt: daysAgo(200 - index * 9),
        updatedAt: daysAgo(200 - index * 9),
    })),
)

function playerAt(index: number) {
    const player = players[index % players.length]

    if (player === undefined) {
        throw new Error('No sample players')
    }

    return player
}

// Levels

type LevelSeed = {
    name: string
    creator: string
    gameDifficulty: GameDifficulty
    // Name of our own difficulty, null is N/A
    listDifficulty: string | null
    // Average of the generated ratings, null for no ratings
    engagement: number | null
}

const mainSeeds: LevelSeed[] = [
    {
        name: 'Citrus Cataclysm',
        creator: 'CreatorName',
        gameDifficulty: GameDifficulty.ExtremeDemon,
        listDifficulty: 'Supreme Demon',
        engagement: 9.1,
    },
    {
        name: 'Sour Factory',
        creator: 'BlockBuilder',
        gameDifficulty: GameDifficulty.ExtremeDemon,
        listDifficulty: 'Extreme Demon',
        engagement: 7.4,
    },
    {
        name: 'Zest Overdrive',
        creator: 'CreatorName',
        gameDifficulty: GameDifficulty.InsaneDemon,
        listDifficulty: 'Brutal Demon',
        engagement: 8.6,
    },
    {
        name: 'Peel Paradox',
        creator: 'Glowstick',
        gameDifficulty: GameDifficulty.InsaneDemon,
        listDifficulty: 'Crazy Demon',
        engagement: 6.9,
    },
    {
        name: 'Lemon Labyrinth',
        creator: 'ShipLord',
        gameDifficulty: GameDifficulty.InsaneDemon,
        listDifficulty: 'Insane Demon',
        engagement: 8.2,
    },
    {
        name: 'Acidic Ascent',
        creator: 'BlockBuilder',
        gameDifficulty: GameDifficulty.HardDemon,
        listDifficulty: 'Wild Demon',
        engagement: 5.8,
    },
    {
        name: 'Juice Junction',
        creator: 'SawbladeFan',
        gameDifficulty: GameDifficulty.HardDemon,
        listDifficulty: 'Harder Demon',
        engagement: 7.7,
    },
    {
        name: 'Rind Runner',
        creator: 'Glowstick',
        gameDifficulty: GameDifficulty.HardDemon,
        listDifficulty: 'Hard Demon',
        engagement: 6.3,
    },
    {
        name: 'Tangy Temple',
        creator: 'ShipLord',
        gameDifficulty: GameDifficulty.InsaneDemon,
        listDifficulty: 'Tricky Demon',
        engagement: 7.1,
    },
    {
        name: 'Squeeze Play',
        creator: 'CreatorName',
        gameDifficulty: GameDifficulty.MediumDemon,
        listDifficulty: 'Moderate Demon',
        engagement: 8.8,
    },
    {
        name: 'Pulp Fiction',
        creator: 'SawbladeFan',
        gameDifficulty: GameDifficulty.MediumDemon,
        listDifficulty: 'Medium Demon',
        engagement: 6.6,
    },
    {
        name: 'Yellow Wave',
        creator: 'WaveMaker',
        gameDifficulty: GameDifficulty.Insane,
        listDifficulty: 'Mild Demon',
        engagement: 5.2,
    },
    {
        name: 'Lemonade Stand',
        creator: 'Glowstick',
        gameDifficulty: GameDifficulty.EasyDemon,
        listDifficulty: 'Casual Demon',
        engagement: 7.9,
    },
    {
        name: 'Seed Spitter',
        creator: 'WaveMaker',
        gameDifficulty: GameDifficulty.Harder,
        listDifficulty: 'Simple Demon',
        engagement: 4.7,
    },
    {
        name: 'First Squeeze',
        creator: 'BlockBuilder',
        gameDifficulty: GameDifficulty.EasyDemon,
        listDifficulty: null,
        engagement: null,
    },
]

const futureSeeds: (LevelSeed & { verificationProgress: number; hasVerifier: boolean })[] = [
    {
        name: 'Bitter End',
        creator: 'CreatorName',
        gameDifficulty: GameDifficulty.ExtremeDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 87,
        hasVerifier: true,
    },
    {
        name: 'Vitamin Sea',
        creator: 'ShipLord',
        gameDifficulty: GameDifficulty.InsaneDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 100,
        hasVerifier: true,
    },
    {
        name: 'Citric Storm',
        creator: 'Glowstick',
        gameDifficulty: GameDifficulty.HardDemon,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 54,
        hasVerifier: true,
    },
    {
        name: 'Unnamed Lemon',
        creator: 'SawbladeFan',
        gameDifficulty: GameDifficulty.NA,
        listDifficulty: null,
        engagement: null,
        verificationProgress: 0,
        hasVerifier: false,
    },
]

const sceneColors: Record<GameDifficulty, { background: string; ground: string }> = {
    [GameDifficulty.NA]: { background: '#a0a0a0', ground: '#5a5a5a' },
    [GameDifficulty.Auto]: { background: '#ffd36b', ground: '#b8861a' },
    [GameDifficulty.Easy]: { background: '#2ac8ff', ground: '#0a7bc2' },
    [GameDifficulty.Normal]: { background: '#4cda5b', ground: '#1f8a2c' },
    [GameDifficulty.Hard]: { background: '#ffd23a', ground: '#b38a0a' },
    [GameDifficulty.Harder]: { background: '#ff8a2a', ground: '#b34a12' },
    [GameDifficulty.Insane]: { background: '#ff6fe0', ground: '#a3168a' },
    [GameDifficulty.EasyDemon]: { background: '#9b6bff', ground: '#5326b3' },
    [GameDifficulty.MediumDemon]: { background: '#e05cff', ground: '#8a1fa8' },
    [GameDifficulty.HardDemon]: { background: '#ff5a5a', ground: '#a01c1c' },
    [GameDifficulty.InsaneDemon]: { background: '#ff3b3b', ground: '#8f1010' },
    [GameDifficulty.ExtremeDemon]: { background: '#c01818', ground: '#4a0606' },
}

// A scene in the colors of the game difficulty with its face, saved like an uploaded preview
async function drawPreview(difficulty: GameDifficulty) {
    const scene = await drawScene({
        ...sceneColors[difficulty],
        sprite: `difficulties/${difficulty}.png`,
        spriteSize: 260,
    })

    return writeImage(mediaDir, MediaKind.Preview, scene)
}

const mainLevels = await Promise.all(
    mainSeeds.map(async (seed, index) => {
        const position = index + 1
        // The easiest one shows the thumbnail of its video instead of a preview
        const hasPreview = position !== mainSeeds.length

        return {
            seed,
            row: {
                gdId: 90000000 + position * 13579,
                name: seed.name,
                creator: seed.creator,
                verifierId: playerAt(index % 4).id,
                verificationProgress: 100,
                videoUrl: VIDEO_URL,
                preview: hasPreview ? await drawPreview(seed.gameDifficulty) : null,
                gameDifficulty: seed.gameDifficulty,
                listDifficultyId: difficultyId(seed.listDifficulty),
                position,
                // Placed the day before, pushing Peel Paradox down
                placedAt: position === 3 ? daysAgo(1) : daysAgo(10 + position * 9),
                createdAt: daysAgo(15 + position * 9),
            },
        }
    }),
)

const futureLevels = await Promise.all(
    futureSeeds.map(async (seed, index) => ({
        gdId: 110000000 + (100 + index) * 2468,
        name: seed.name,
        creator: seed.creator,
        verifierId: seed.hasVerifier ? playerAt(index + 1).id : null,
        verificationProgress: seed.verificationProgress,
        videoUrl: null,
        // The last one has neither a preview nor a video and shows the default scene
        preview: seed.hasVerifier ? await drawPreview(seed.gameDifficulty) : null,
        gameDifficulty: seed.gameDifficulty,
        listDifficultyId: difficultyId(seed.listDifficulty),
        position: null,
        placedAt: null,
        createdAt: daysAgo(2 + index * 5),
    })),
)

db.transaction((tx) => {
    tx.insert(user).values(players).run()
    tx.insert(account)
        .values(
            players.map((player) => ({
                id: randomUUID(),
                accountId: player.id,
                providerId: 'credential',
                userId: player.id,
                password: passwordHash,
                createdAt: player.createdAt,
                updatedAt: player.createdAt,
            })),
        )
        .run()

    const mainIds = mainLevels.map(
        ({ row }) => tx.insert(level).values(row).returning({ id: level.id }).get().id,
    )
    tx.insert(level).values(futureLevels).run()

    // Records: harder levels (lower position) are beaten by fewer players

    const records: (typeof record.$inferInsert)[] = []
    const ratings: (typeof rating.$inferInsert)[] = []

    mainLevels.forEach(({ seed }, levelIndex) => {
        const levelId = mainIds[levelIndex]

        if (levelId === undefined) {
            throw new Error('Missing level id')
        }

        const completers = Math.min(players.length, 1 + Math.floor((levelIndex + 1) * 0.9))

        for (
            let playerIndex = 0;
            playerIndex < Math.min(players.length, completers + 2);
            playerIndex++
        ) {
            const player = playerAt(playerIndex)
            const beaten = playerIndex < completers
            const submittedAt = daysAgo(1 + ((levelIndex * 5 + playerIndex * 3) % 60))
            const status =
                (levelIndex + playerIndex) % 11 === 5
                    ? RecordStatus.Pending
                    : (levelIndex + playerIndex) % 17 === 8
                      ? RecordStatus.Rejected
                      : RecordStatus.Approved

            // Some players sent their progress before beating the level
            if (beaten && (levelIndex + playerIndex) % 3 === 0) {
                records.push({
                    levelId,
                    playerId: player.id,
                    progress: 30 + ((levelIndex * 7 + playerIndex * 11) % 60),
                    videoUrl: VIDEO_URL,
                    status: RecordStatus.Approved,
                    submittedAt: new Date(submittedAt.getTime() - 20 * DAY),
                })
            }

            records.push({
                levelId,
                playerId: player.id,
                progress: beaten ? 100 : 41 + ((levelIndex * 13 + playerIndex * 7) % 55),
                videoUrl: VIDEO_URL,
                rawFootageUrl: playerIndex % 2 === 0 ? VIDEO_URL : null,
                notes: playerIndex % 4 === 0 ? 'Recorded on 240 fps.' : null,
                status,
                submittedAt,
            })

            // Not everyone rates, so the dashboard has levels to rate
            if (
                beaten &&
                status === RecordStatus.Approved &&
                seed.engagement !== null &&
                (levelIndex + playerIndex) % 4 !== 0
            ) {
                const offset = ((levelIndex * 3 + playerIndex * 5) % 5) - 2

                ratings.push({
                    levelId,
                    playerId: player.id,
                    score: Math.min(
                        ENGAGEMENT_MAX,
                        Math.max(1, Math.round(seed.engagement + offset)),
                    ),
                    createdAt: submittedAt,
                })
            }
        }
    })

    tx.insert(record).values(records).run()
    tx.insert(rating).values(ratings).run()

    // History of the Main List

    const levelAt = (position: number) => {
        const id = mainIds[position - 1]
        const seed = mainSeeds[position - 1]

        if (id === undefined || seed === undefined) {
            throw new Error('Missing level')
        }

        return { levelId: id, levelName: seed.name }
    }

    tx.insert(listChange)
        .values([
            ...mainLevels.map(({ row }) => ({
                ...levelAt(row.position),
                kind: ListChangeKind.Placed,
                from: null,
                to: row.position,
                createdAt: row.placedAt,
            })),
            {
                levelId: null,
                levelName: 'Old Lemon',
                kind: ListChangeKind.Removed,
                from: 7,
                to: null,
                createdAt: daysAgo(14),
            },
            {
                ...levelAt(9),
                kind: ListChangeKind.MovedUp,
                from: 11,
                to: 9,
                createdAt: daysAgo(6),
            },
            {
                ...levelAt(4),
                kind: ListChangeKind.MovedDown,
                from: 3,
                to: 4,
                createdAt: daysAgo(1),
            },
        ])
        .run()

    console.info(
        `Added ${players.length} players, ${mainLevels.length + futureLevels.length} levels, ${records.length} records and ${ratings.length} ratings`,
    )
})

console.info(`Sample players sign in with their username and the password "${SEED_PASSWORD}"`)
