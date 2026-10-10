// Shared shapes of the demon list data, used by both the server loads and the UI

export enum Difficulty {
    EasyDemon = 'easy-demon',
    MediumDemon = 'medium-demon',
    HardDemon = 'hard-demon',
    InsaneDemon = 'insane-demon',
    ExtremeDemon = 'extreme-demon',
}

export const difficultyNames: Record<Difficulty, string> = {
    [Difficulty.EasyDemon]: 'Easy Demon',
    [Difficulty.MediumDemon]: 'Medium Demon',
    [Difficulty.HardDemon]: 'Hard Demon',
    [Difficulty.InsaneDemon]: 'Insane Demon',
    [Difficulty.ExtremeDemon]: 'Extreme Demon',
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
    gameDifficulty: Difficulty
    // Our own difficulty, null while it's not decided yet
    listDifficulty: Difficulty | null
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
    level: LevelRef
    from: number | null
    to: number | null
}

export const ENGAGEMENT_MAX = 10
