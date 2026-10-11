import { requireUser } from '#lib/server/access.ts'
import { attempt, formFailure } from '#lib/server/forms.ts'
import { renderKitIcon } from '#lib/server/icons.ts'
import { setIconKit } from '#lib/server/list-actions.ts'
import { loadIconManifest, parseIconKit } from '#lib/icon-kit.ts'
import { defaultIconKit } from '#lib/icons.ts'
import type { Actions, PageServerLoad } from './$types'

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
} satisfies Actions
