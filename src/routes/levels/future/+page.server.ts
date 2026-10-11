import * as v from 'valibot'
import { requireAdmin } from '#lib/server/access.ts'
import { attempt, id, parseForm, requiredInteger } from '#lib/server/forms.ts'
import { moveFutureLevel } from '#lib/server/list-actions.ts'
import { getFutureList } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { levels: getFutureList() }
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
            }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt('move', () => moveFutureLevel(input.level, input.position))
    },
} satisfies Actions
