// Shared shapes of the demon list data, used by both the server loads and the UI

// Original rating of the game, from N/A (not rated) up. Levels below Easy Demon are underrates
export enum GameDifficulty {
    NA = 'na',
    Auto = 'auto',
    Easy = 'easy',
    Normal = 'normal',
    Hard = 'hard',
    Harder = 'harder',
    Insane = 'insane',
    EasyDemon = 'easy-demon',
    MediumDemon = 'medium-demon',
    HardDemon = 'hard-demon',
    InsaneDemon = 'insane-demon',
    ExtremeDemon = 'extreme-demon',
}

export const gameDifficultyNames: Record<GameDifficulty, string> = {
    [GameDifficulty.NA]: 'N/A',
    [GameDifficulty.Auto]: 'Auto',
    [GameDifficulty.Easy]: 'Easy',
    [GameDifficulty.Normal]: 'Normal',
    [GameDifficulty.Hard]: 'Hard',
    [GameDifficulty.Harder]: 'Harder',
    [GameDifficulty.Insane]: 'Insane',
    [GameDifficulty.EasyDemon]: 'Easy Demon',
    [GameDifficulty.MediumDemon]: 'Medium Demon',
    [GameDifficulty.HardDemon]: 'Hard Demon',
    [GameDifficulty.InsaneDemon]: 'Insane Demon',
    [GameDifficulty.ExtremeDemon]: 'Extreme Demon',
}

// What a difficulty face shows, for both the game rating and our own meter
export type DifficultyRef = {
    name: string
    faceUrl: string
}

// A difficulty of our own meter, the admins manage them on /admin/difficulties
export type ListDifficulty = DifficultyRef & {
    id: number
}

// A difficulty as the admins see it, position 1 is the easiest
export type AdminDifficulty = ListDifficulty & {
    position: number
    levelsCount: number
}

export enum RecordStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
}

export enum ListChangeKind {
    Placed = 'placed',
    MovedUp = 'moved-up',
    MovedDown = 'moved-down',
    Removed = 'removed',
}

export type PlayerRef = {
    username: string
    displayUsername: string
    avatarUrl: string
}

export type LevelRef = {
    id: number
    name: string
    // null means the level is on the Future List
    position: number | null
    thumbnailUrl: string
}

export type Level = LevelRef & {
    gdId: number
    creator: string
    verifier: PlayerRef | null
    // Best progress of the verifier, 100 once the level is verified
    verificationProgress: number
    videoUrl: string | null
    gameDifficulty: GameDifficulty
    // Our own difficulty, null is N/A (not decided yet)
    listDifficulty: ListDifficulty | null
    // Average engagement rating from 1 to 10, null if nobody rated it yet
    engagement: number | null
    ratingsCount: number
    points: number
    recordsCount: number
    addedAt: Date
}

export type LevelRecord = {
    id: number
    level: LevelRef
    player: PlayerRef
    progress: number
    videoUrl: string
    submittedAt: Date
    status: RecordStatus
}

// A submission with everything the admins need to review it
export type ReviewRecord = LevelRecord & {
    rawFootageUrl: string | null
    notes: string | null
    playerId: string
    accountVerified: boolean
}

// Tabs of the admin players page
export enum PlayerFilter {
    Unverified = 'unverified',
    All = 'all',
    Admins = 'admins',
    Banned = 'banned',
}

// An account as the admins see it, including the ones hidden from the list
export type AdminPlayer = {
    id: string
    username: string | null
    displayUsername: string
    email: string
    avatarUrl: string
    hasAvatar: boolean
    emailVerified: boolean
    accountVerified: boolean
    admin: boolean
    banned: boolean
    banReason: string | null
    createdAt: Date
}

// Stored fields of a level for the admin form
export type LevelDraft = {
    id: number
    gdId: number
    name: string
    creator: string
    // Username of the verifier
    verifier: string | null
    verificationProgress: number
    videoUrl: string | null
    thumbnailUrl: string
    hasPreview: boolean
    gameDifficulty: GameDifficulty
    // Null is N/A
    listDifficultyId: number | null
    position: number | null
}

export type LeaderboardEntry = {
    rank: number
    player: PlayerRef
    points: number
    completions: number
    hardest: LevelRef | null
    accountVerified: boolean
}

export type ListChange = {
    id: number
    date: Date
    kind: ListChangeKind
    // Null if the level was deleted since then
    level: LevelRef | null
    levelName: string
    from: number | null
    to: number | null
}

export const ENGAGEMENT_MAX = 10
