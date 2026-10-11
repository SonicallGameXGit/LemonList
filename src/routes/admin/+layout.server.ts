import { error, redirect } from '@sveltejs/kit'
import { isAdmin } from '#lib/server/access.ts'
import type { LayoutServerLoad } from './$types'

// Only protects the pages, every action checks the role again with requireAdmin
export const load: LayoutServerLoad = ({ locals, url }) => {
    if (locals.user === undefined) {
        redirect(303, '/login?redirectTo=' + encodeURIComponent(url.pathname))
    }

    // Not found instead of forbidden, players don't need to know about the admin pages
    if (!isAdmin(locals.user)) {
        error(404, 'Not found')
    }
}
