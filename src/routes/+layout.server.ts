import { avatarUrl } from '#lib/server/media.ts'
import { isAdmin } from '#lib/server/access.ts'
import { countPendingRecords } from '#lib/server/list.ts'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ locals }) => {
    const user = locals.user

    if (user === undefined) {
        return { user: null }
    }

    const admin = isAdmin(user)

    // Only expose what the UI needs
    return {
        user: {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            username: user.username ?? null,
            displayUsername: user.displayUsername ?? user.username ?? user.name,
            avatarUrl: avatarUrl(user.avatar),
            hasAvatar: user.avatar !== null && user.avatar !== undefined,
            accountVerified: user.accountVerified,
            admin,
            // Shown next to the admin link
            pendingRecords: admin ? countPendingRecords() : 0,
            createdAt: user.createdAt,
        },
    }
}
