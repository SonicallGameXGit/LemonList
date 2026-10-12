import { json } from '@sveltejs/kit'
import { GD_ID_MAX } from '#lib/list-rules.ts'
import { ActionError } from '#lib/server/forms.ts'
import { lookUpLevel } from '#lib/server/level-lookup.ts'
import type { RequestHandler } from './$types'

// What the level form can fill in from the level ID (#lib/level-lookup.ts)
export const GET: RequestHandler = async ({ locals, url }) => {
    // Players submitting levels use it too. Guests can't, every lookup asks other sites
    if (locals.user === undefined) {
        return json({ error: 'Log in first' }, { status: 401 })
    }

    const param = url.searchParams.get('id') ?? ''
    const gdId = Number(param)

    if (!/^\d+$/.test(param) || gdId < 1 || gdId > GD_ID_MAX) {
        return json({ error: 'Enter the level ID first' }, { status: 400 })
    }

    try {
        return json({ lookup: await lookUpLevel(locals.user.id, gdId) })
    } catch (error) {
        if (error instanceof ActionError) {
            return json({ error: error.message }, { status: 429 })
        }

        throw error
    }
}
