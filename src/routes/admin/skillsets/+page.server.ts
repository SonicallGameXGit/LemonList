import * as v from 'valibot'
import { SKILLSET_DESCRIPTION_MAX_LENGTH, SKILLSET_NAME_MAX_LENGTH } from '#lib/list-rules.ts'
import { requireAdmin } from '#lib/server/access.ts'
import {
    ActionError,
    attempt,
    formFailure,
    formImage,
    id,
    optionalText,
    parseForm,
    requiredText,
    run,
} from '#lib/server/forms.ts'
import { pickedIconImage } from '#lib/server/icons.ts'
import { createSkillset, deleteSkillset, updateSkillset } from '#lib/server/list-actions.ts'
import { getAdminSkillsets } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { skillsets: getAdminSkillsets() }
}

const fields = () => ({
    name: requiredText('Name', SKILLSET_NAME_MAX_LENGTH),
    description: optionalText('Description', SKILLSET_DESCRIPTION_MAX_LENGTH),
})

// An uploaded image, otherwise the one picked in the icon picker. Null if neither was chosen
async function skillsetIcon(fetcher: typeof fetch, formData: FormData) {
    const upload = await formImage(formData, 'iconFile')

    if (upload !== null) {
        return upload
    }

    const picked = formData.get('icon')

    if (typeof picked !== 'string' || picked === '') {
        return null
    }

    const image = await pickedIconImage(fetcher, picked)

    if (image === null) {
        throw new ActionError("This icon doesn't exist anymore, pick another one")
    }

    return image
}

export const actions = {
    create: async ({ locals, request, fetch }) => {
        requireAdmin(locals)
        const formData = await request.formData()
        const parsed = parseForm('create', formData, v.object(fields()))

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data
        const icon = await run('create', () => skillsetIcon(fetch, formData))

        if (icon.failure !== null) {
            return icon.failure
        }

        const image = icon.data

        if (image === null) {
            return formFailure('create', 'Pick an icon or upload one')
        }

        return attempt(
            'create',
            () => createSkillset({ name: input.name, description: input.description }, image),
            'Added ' + input.name,
        )
    },
    save: async ({ locals, request, fetch }) => {
        requireAdmin(locals)
        const formData = await request.formData()
        const parsed = parseForm('skillset', formData, v.object({ skillset: id(), ...fields() }))

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data
        const icon = await run('skillset', () => skillsetIcon(fetch, formData))

        if (icon.failure !== null) {
            return icon.failure
        }

        const image = icon.data

        return attempt('skillset', () =>
            updateSkillset(
                input.skillset,
                { name: input.name, description: input.description },
                image,
            ),
        )
    },
    delete: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm('skillset', await request.formData(), v.object({ skillset: id() }))

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const skillsetId = parsed.data.skillset

        return attempt('skillset', () => deleteSkillset(skillsetId))
    },
} satisfies Actions
