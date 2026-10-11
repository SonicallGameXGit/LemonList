import { error, redirect } from '@sveltejs/kit'
import { requireAdmin } from '#lib/server/access.ts'
import { formImage, run } from '#lib/server/forms.ts'
import { parseLevelForm } from '#lib/server/level-form.ts'
import { deleteLevel, updateLevel } from '#lib/server/list-actions.ts'
import { getLevelDraft, getMainListSize, getPlayerUsernames } from '#lib/server/list.ts'
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

    return { level, players: getPlayerUsernames(), mainListSize: getMainListSize() }
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

        const { input, removePreview } = parsed.data
        const preview = await formImage(formData, 'preview')
        const saved = await run('save', () => updateLevel(id, input, preview, removePreview))

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
