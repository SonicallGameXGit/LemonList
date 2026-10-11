import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { ENGAGEMENT_MAX, GameDifficulty, ListChangeKind, RecordStatus } from '../../list.ts'
import { user } from './auth.schema.ts'

// Values of a string enum as the non-empty tuple Drizzle expects
function enumValues<T extends string>(values: Record<string, T>): [T, ...T[]] {
    const [first, ...rest] = Object.values(values)

    if (first === undefined) {
        throw new Error('Empty enum')
    }

    return [first, ...rest]
}

const createdAt = () =>
    integer('created_at', { mode: 'timestamp_ms' })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
        .notNull()

// Players are the user accounts (user table from Better Auth)

// Our own difficulty meter, managed by the admins
export const difficulty = sqliteTable(
    'difficulty',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        name: text('name').notNull().unique(),
        // Media key of the uploaded face
        face: text('face').notNull(),
        // Place on the meter starting from 1, the easiest. Not unique, so difficulties can be
        // shifted one by one inside a transaction
        position: integer('position').notNull(),
        createdAt: createdAt(),
    },
    (table) => [
        index('difficulty_position_idx').on(table.position),
        check('difficulty_position_check', sql`${table.position} >= 1`),
    ],
)

export const level = sqliteTable(
    'level',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        gdId: integer('gd_id').notNull().unique(),
        name: text('name').notNull(),
        // Creators don't need an account, it's just the name from the game
        creator: text('creator').notNull(),
        verifierId: text('verifier_id').references(() => user.id, { onDelete: 'set null' }),
        // Best progress of the verifier, 100 once the level is verified
        verificationProgress: integer('verification_progress').notNull().default(0),
        videoUrl: text('video_url'),
        // Media key of the uploaded preview
        preview: text('preview'),
        gameDifficulty: text('game_difficulty', { enum: enumValues(GameDifficulty) }).notNull(),
        // Our own difficulty, null is N/A (not decided yet, or its difficulty was deleted)
        listDifficultyId: integer('list_difficulty_id').references(() => difficulty.id, {
            onDelete: 'set null',
        }),
        // Place on the Main List starting from 1, null means the level is on the Future List.
        // Not unique, so levels can be shifted one by one inside a transaction
        position: integer('position'),
        placedAt: integer('placed_at', { mode: 'timestamp_ms' }),
        createdAt: createdAt(),
    },
    (table) => [
        index('level_position_idx').on(table.position),
        index('level_verifierId_idx').on(table.verifierId),
        index('level_listDifficultyId_idx').on(table.listDifficultyId),
        check('level_position_check', sql`${table.position} is null or ${table.position} >= 1`),
        check(
            'level_verificationProgress_check',
            sql`${table.verificationProgress} between 0 and 100`,
        ),
    ],
)

export const record = sqliteTable(
    'record',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        levelId: integer('level_id')
            .notNull()
            .references(() => level.id, { onDelete: 'cascade' }),
        playerId: text('player_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        progress: integer('progress').notNull(),
        videoUrl: text('video_url').notNull(),
        rawFootageUrl: text('raw_footage_url'),
        // Note of the player for the admins
        notes: text('notes'),
        status: text('status', { enum: enumValues(RecordStatus) })
            .notNull()
            .default(RecordStatus.Pending),
        submittedAt: integer('submitted_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
    },
    (table) => [
        index('record_levelId_idx').on(table.levelId),
        index('record_playerId_idx').on(table.playerId),
        check('record_progress_check', sql`${table.progress} between 1 and 100`),
    ],
)

// Engagement ratings, one per player and level
export const rating = sqliteTable(
    'rating',
    {
        levelId: integer('level_id')
            .notNull()
            .references(() => level.id, { onDelete: 'cascade' }),
        playerId: text('player_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        score: integer('score').notNull(),
        createdAt: createdAt(),
    },
    (table) => [
        primaryKey({ columns: [table.levelId, table.playerId] }),
        index('rating_playerId_idx').on(table.playerId),
        check(
            'rating_score_check',
            sql`${table.score} between 1 and ${sql.raw(String(ENGAGEMENT_MAX))}`,
        ),
    ],
)

// History of the Main List
export const listChange = sqliteTable(
    'list_change',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        // Null once the level is deleted, the name stays for the history
        levelId: integer('level_id').references(() => level.id, { onDelete: 'set null' }),
        levelName: text('level_name').notNull(),
        kind: text('kind', { enum: enumValues(ListChangeKind) }).notNull(),
        from: integer('from'),
        to: integer('to'),
        createdAt: createdAt(),
    },
    (table) => [
        index('listChange_levelId_idx').on(table.levelId),
        index('listChange_createdAt_idx').on(table.createdAt),
    ],
)

export * from './auth.schema.ts'
