// Sends a drag and drop move of the admins to the move action of the current page, and works out
// which of our difficulties the move would take along (the dialog lists them before)
import { deserialize } from '$app/forms'
import { shuffleDifficulties } from '#lib/difficulty-shuffle.ts'
import type { DifficultyChange, Level } from '#lib/list.ts'

// Changes of our difficulties if `level` moves to the index `to` of `levels` (in the list order)
export function moveDifficultyChanges(levels: Level[], level: Level, to: number) {
    const changes = shuffleDifficulties(
        levels.map((other) => ({ id: other.id, difficulty: other.listDifficulty })),
        levels.indexOf(level),
        to,
    )

    return changes.map((change): DifficultyChange => ({
        levelId: change.id,
        levelName: levels.find((other) => other.id === change.id)?.name ?? '',
        from: change.from,
        to: change.to,
    }))
}

// The levels with the changes applied, to show them right away
export function applyDifficultyChanges(levels: Level[], changes: DifficultyChange[]) {
    return levels.map((other) => {
        const change = changes.find((candidate) => candidate.levelId === other.id)

        return change === undefined ? other : { ...other, listDifficulty: change.to }
    })
}

// Returns the error to show, null if the level was moved
export async function sendMove(levelId: number, position: number, withDifficulties: boolean) {
    const body = new FormData()
    body.set('level', String(levelId))
    body.set('position', String(position))

    if (withDifficulties) {
        body.set('difficulties', 'on')
    }

    try {
        const response = await fetch('?/move', {
            method: 'POST',
            body,
            headers: { 'x-sveltekit-action': 'true' },
        })
        const result = deserialize(await response.text())

        if (result.type === 'failure') {
            const error = result.data?.error
            return typeof error === 'string' ? error : "Couldn't move the level"
        }

        if (result.type === 'error') {
            return "Couldn't move the level"
        }

        return null
    } catch {
        return "Couldn't reach the server"
    }
}
