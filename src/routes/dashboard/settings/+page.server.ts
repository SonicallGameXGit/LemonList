import * as v from 'valibot'
import { requireUser } from '#lib/server/access.ts'
import { attempt, checkbox, formFailure, formImage, parseForm } from '#lib/server/forms.ts'
import { removeAvatar, setAvatar, setSkillsetSettings } from '#lib/server/list-actions.ts'
import type { Actions } from './$types'

export const actions = {
    avatar: async ({ locals, request }) => {
        const user = requireUser(locals)
        const image = await formImage(await request.formData(), 'avatar')

        if (image === null) {
            return formFailure('avatar', 'Choose an image first')
        }

        return attempt('avatar', () => setAvatar(user.id, image), 'Avatar updated.')
    },
    removeAvatar: async ({ locals }) => {
        const user = requireUser(locals)

        return attempt('avatar', () => removeAvatar(user.id), 'Avatar removed.')
    },
    skillsets: async ({ locals, request }) => {
        const user = requireUser(locals)
        const parsed = parseForm(
            'skillsets',
            await request.formData(),
            v.object({ showSkillsetTag: checkbox(), showSkillsets: checkbox() }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt(
            'skillsets',
            () => setSkillsetSettings(user.id, input.showSkillsetTag, input.showSkillsets),
            'Saved.',
        )
    },
} satisfies Actions
