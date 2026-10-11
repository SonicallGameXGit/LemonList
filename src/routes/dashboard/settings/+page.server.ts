import { requireUser } from '#lib/server/access.ts'
import { attempt, formFailure, formImage } from '#lib/server/forms.ts'
import { removeAvatar, setAvatar } from '#lib/server/list-actions.ts'
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
} satisfies Actions
