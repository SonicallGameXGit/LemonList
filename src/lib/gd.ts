import { asset } from '$app/paths'
import { GameDifficulty, gameDifficultyNames, type DifficultyRef, type Level } from '#lib/list.ts'

// Geometry Dash sprites from static/gd
export type SpriteName =
    | 'arrow'
    | 'back'
    | 'check'
    | 'close'
    | 'copy'
    | 'cube-default'
    | 'cube-lemon'
    | 'demon'
    | 'download'
    | 'info'
    | 'like'
    | 'lock'
    | 'magnify'
    | 'menu'
    | 'play'
    | 'star'
    | 'time'
    | 'trophy'
    | 'x'
    | 'youtube'

export function sprite(name: SpriteName) {
    return asset(`gd/${name}.png`)
}

// Faces of the game difficulties, our own meter has uploaded faces (ListDifficulty.faceUrl)
export function gameDifficultyRef(difficulty: GameDifficulty): DifficultyRef {
    return {
        name: gameDifficultyNames[difficulty],
        faceUrl: asset(`gd/difficulties/${difficulty}.png`),
    }
}

// The N/A face, shared by both meters
export function naDifficultyRef() {
    return gameDifficultyRef(GameDifficulty.NA)
}

// The difficulty a level shows: ours once it's decided, the game one until then
export function levelDifficultyRef(level: Level) {
    return level.listDifficulty ?? gameDifficultyRef(level.gameDifficulty)
}
