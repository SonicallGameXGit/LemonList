import * as v from 'valibot'
import { requireAdmin } from '#lib/server/access.ts'
import { attempt, checkbox, id, parseForm, requiredInteger } from '#lib/server/forms.ts'
import { moveLevel } from '#lib/server/list-actions.ts'
import { getDifficulties, getMainList } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { levels: getMainList(), difficulties: getDifficulties() }
}

export const actions = {
    // Drag and drop of the admins, the levels in between shift by one
    move: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'move',
            await request.formData(),
            v.object({
                level: id(),
                position: requiredInteger('Place', 1, Number.MAX_SAFE_INTEGER),
                // Takes our difficulties along (#lib/difficulty-shuffle.ts)
                difficulties: checkbox(),
            }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt('move', () => moveLevel(input.level, input.position, input.difficulties))
    },
} satisfies Actions
