import { asset } from '$app/paths'
import { Difficulty } from '#lib/list.ts'

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

type DemonSpriteName =
    'demon-easy' | 'demon-medium' | 'demon-hard' | 'demon-insane' | 'demon-extreme'

const difficultySprites: Record<Difficulty, DemonSpriteName> = {
    [Difficulty.EasyDemon]: 'demon-easy',
    [Difficulty.MediumDemon]: 'demon-medium',
    [Difficulty.HardDemon]: 'demon-hard',
    [Difficulty.InsaneDemon]: 'demon-insane',
    [Difficulty.ExtremeDemon]: 'demon-extreme',
}

export function difficultySprite(difficulty: Difficulty | null) {
    const name: DemonSpriteName | 'unrated' =
        difficulty === null ? 'unrated' : difficultySprites[difficulty]

    return asset(`gd/difficulties/${name}.png`)
}

// Labeled buttons from the difficulty filter of the search screen
export function difficultyFilterSprite(difficulty: Difficulty) {
    const name: `filter-${DemonSpriteName}` = `filter-${difficultySprites[difficulty]}`

    return asset(`gd/difficulties/${name}.png`)
}
