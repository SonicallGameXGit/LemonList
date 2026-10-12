import { redirect } from '@sveltejs/kit'
import { requireAdmin } from '#lib/server/access.ts'
import { run } from '#lib/server/forms.ts'
import { formPreview, parseLevelForm } from '#lib/server/level-form.ts'
import { createLevel } from '#lib/server/list-actions.ts'
import { getDifficulties, getMainListSize, getPlayerUsernames } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return {
        players: getPlayerUsernames(),
        difficulties: getDifficulties(),
        mainListSize: getMainListSize(),
    }
}

export const actions = {
    create: async ({ locals, request }) => {
        requireAdmin(locals)
        const formData = await request.formData()
        const parsed = parseLevelForm('create', formData)

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const { input, gameThumbnail } = parsed.data
        const created = await run('create', async () =>
            createLevel(input, await formPreview(formData, input.gdId, gameThumbnail)),
        )

        if (created.failure !== null) {
            return created.failure
        }

        redirect(303, '/levels/' + created.data)
    },
} satisfies Actions
