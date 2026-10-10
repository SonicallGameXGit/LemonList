import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// Login/register pages make no sense for signed in users
export const load: LayoutServerLoad = ({ locals }) => {
    if (locals.user !== undefined) {
        redirect(303, '/dashboard')
    }
}
