import { error, redirect } from '@sveltejs/kit'
import { requireAdmin } from '#lib/server/access.ts'
import { run } from '#lib/server/forms.ts'
import { formPreview, parseLevelForm } from '#lib/server/level-form.ts'
import { deleteLevel, updateLevel } from '#lib/server/list-actions.ts'
import {
    getDifficulties,
    getLevelDraft,
    getMainListSize,
    getPlayerUsernames,
} from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

function levelId(param: string) {
    const id = Number(param)

    if (!Number.isInteger(id)) {
        error(404, 'Level not found')
    }

    return id
}

export const load: PageServerLoad = ({ params }) => {
    const level = getLevelDraft(levelId(params.id))

    if (level === undefined) {
        error(404, 'Level not found')
    }

    return {
        level,
        players: getPlayerUsernames(),
        difficulties: getDifficulties(),
        mainListSize: getMainListSize(),
    }
}

export const actions = {
    save: async ({ locals, params, request }) => {
        requireAdmin(locals)
        const id = levelId(params.id)
        const formData = await request.formData()
        const parsed = parseLevelForm('save', formData)

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const { input, removePreview, gameThumbnail } = parsed.data
        const saved = await run('save', async () =>
            updateLevel(
                id,
                input,
                await formPreview(formData, input.gdId, gameThumbnail),
                removePreview,
            ),
        )

        if (saved.failure !== null) {
            return saved.failure
        }

        redirect(303, '/levels/' + id)
    },
    delete: async ({ locals, params }) => {
        requireAdmin(locals)
        const id = levelId(params.id)
        const deleted = await run('save', () => deleteLevel(id))

        if (deleted.failure !== null) {
            return deleted.failure
        }

        redirect(303, '/levels')
    },
} satisfies Actions
