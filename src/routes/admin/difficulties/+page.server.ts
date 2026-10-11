import * as v from 'valibot'
import { DIFFICULTY_NAME_MAX_LENGTH } from '#lib/list-rules.ts'
import { requireAdmin } from '#lib/server/access.ts'
import {
    attempt,
    formFailure,
    formImage,
    id,
    optionalInteger,
    parseForm,
    requiredInteger,
    requiredText,
} from '#lib/server/forms.ts'
import {
    createDifficulty,
    deleteDifficulty,
    moveDifficulty,
    updateDifficulty,
} from '#lib/server/list-actions.ts'
import { getAdminDifficulties } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { difficulties: getAdminDifficulties() }
}

const name = () => requiredText('Name', DIFFICULTY_NAME_MAX_LENGTH)

export const actions = {
    create: async ({ locals, request }) => {
        requireAdmin(locals)
        const formData = await request.formData()
        const parsed = parseForm(
            'create',
            formData,
            v.object({
                name: name(),
                position: optionalInteger('Place', 1, Number.MAX_SAFE_INTEGER),
            }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data
        const face = await formImage(formData, 'face')

        if (face === null) {
            return formFailure('create', 'Choose a face image')
        }

        return attempt(
            'create',
            () => createDifficulty(input.name, face, input.position),
            'Added ' + input.name,
        )
    },
    save: async ({ locals, request }) => {
        requireAdmin(locals)
        const formData = await request.formData()
        const parsed = parseForm(
            'difficulty',
            formData,
            v.object({ difficulty: id(), name: name() }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data
        const face = await formImage(formData, 'face')

        return attempt('difficulty', () => updateDifficulty(input.difficulty, input.name, face))
    },
    // Drag and drop or the arrow keys, the difficulties in between shift by one
    move: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'move',
            await request.formData(),
            v.object({
                difficulty: id(),
                position: requiredInteger('Place', 1, Number.MAX_SAFE_INTEGER),
            }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt('move', () => moveDifficulty(input.difficulty, input.position))
    },
    delete: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'difficulty',
            await request.formData(),
            v.object({ difficulty: id() }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const difficultyId = parsed.data.difficulty

        return attempt('difficulty', () => deleteDifficulty(difficultyId))
    },
} satisfies Actions
