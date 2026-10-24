import { json } from '@sveltejs/kit'
import { LEVEL_NAME_MAX_LENGTH } from '#lib/list-rules.ts'
import { ActionError } from '#lib/server/forms.ts'
import { searchLevels } from '#lib/server/level-lookup.ts'
import type { RequestHandler } from './$types'

// Online levels by the name, for the level form to pick the one to look up (#lib/level-lookup.ts)
export const GET: RequestHandler = async ({ locals, url }) => {
    // Same as the lookup: every search asks the Geometry Dash servers
    if (locals.user === undefined) {
        return json({ error: 'Log in first' }, { status: 401 })
    }

    const query = (url.searchParams.get('q') ?? '').trim()

    if (query === '') {
        return json({ error: 'Enter the level name or ID first' }, { status: 400 })
    }

    if (query.length > LEVEL_NAME_MAX_LENGTH) {
        return json({ error: 'The level name is too long' }, { status: 400 })
    }

    try {
        return json({ levels: await searchLevels(locals.user.id, query) })
    } catch (error) {
        if (error instanceof ActionError) {
            return json({ error: error.message }, { status: 429 })
        }

        throw error
    }
}
