import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ locals }) => {
    const user = locals.user

    if (user === undefined) {
        return { user: null }
    }

    // Only expose what the UI needs
    return {
        user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            username: user.username ?? null,
            displayUsername: user.displayUsername ?? user.username ?? user.name,
            createdAt: user.createdAt,
        },
    }
}
