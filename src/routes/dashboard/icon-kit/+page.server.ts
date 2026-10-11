import * as v from 'valibot'
import { requireUser } from '#lib/server/access.ts'
import {
    attempt,
    formFailure,
    formSuccess,
    parseForm,
    requiredText,
    run,
} from '#lib/server/forms.ts'
import { fetchGameIconKit } from '#lib/server/gd-servers.ts'
import { renderKitIcon } from '#lib/server/icons.ts'
import { setIconKit } from '#lib/server/list-actions.ts'
import { loadIconManifest, parseIconKit } from '#lib/icon-kit.ts'
import { defaultIconKit } from '#lib/icons.ts'
import { GD_USERNAME_MAX_LENGTH } from '#lib/list-rules.ts'
import type { Actions, PageServerLoad } from './$types'

const fromGameSchema = v.object({
    gdUsername: requiredText('Username', GD_USERNAME_MAX_LENGTH),
})

export const load: PageServerLoad = async ({ locals, fetch }) => {
    const user = requireUser(locals)
    const kit = parseIconKit(await loadIconManifest(fetch), user.iconKit)

    return { kit: kit ?? defaultIconKit() }
}

export const actions = {
    save: async ({ locals, request, fetch }) => {
        const user = requireUser(locals)
        const field = (await request.formData()).get('kit')
        const kit = parseIconKit(
            await loadIconManifest(fetch),
            typeof field === 'string' ? field : null,
        )

        if (kit === null) {
            return formFailure('save', 'This icon kit is broken, reload the page and try again')
        }

        const image = await renderKitIcon(fetch, kit)

        return attempt(
            'save',
            () => setIconKit(user.id, kit, image),
            'Saved! This is your avatar now.',
        )
    },

    // Only fills the garage, the player saves the kit after looking at it
    fromGame: async ({ locals, request, fetch }) => {
        const user = requireUser(locals)
        const form = parseForm('fromGame', await request.formData(), fromGameSchema)

        if (form.failure !== null) {
            return form.failure
        }

        const manifest = await loadIconManifest(fetch)
        const result = await run('fromGame', () =>
            fetchGameIconKit(manifest, user.id, form.data.gdUsername),
        )

        if (result.failure !== null) {
            return result.failure
        }

        if (result.data === null) {
            return formFailure('fromGame', 'There is no Geometry Dash player with this name', 404)
        }

        return {
            ...formSuccess(
                'fromGame',
                `Got the icons of ${result.data.username}! Save to make them yours.`,
            ),
            kit: result.data.kit,
        }
    },
} satisfies Actions
