// Sends a drag and drop move of the admins to the move action of the current page. Returns the
// error to show, null if the level was moved
import { deserialize } from '$app/forms'

export async function sendMove(levelId: number, position: number) {
    const body = new FormData()
    body.set('level', String(levelId))
    body.set('position', String(position))

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
