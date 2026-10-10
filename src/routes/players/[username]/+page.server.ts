import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '#lib/server/db/index.ts'
import { user } from '#lib/server/db/schema.ts'
import { placeholderAvatar } from '#lib/format.ts'
import { findPlaceholderPlayer, getPlayerProfile } from '#lib/server/placeholders.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ params }) => {
    const username = params.username.toLowerCase()
    const player = db
        .select({
            username: user.username,
            displayUsername: user.displayUsername,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.username, username))
        .get()

    const profile = getPlayerProfile(username)

    if (profile === null) {
        error(404, 'Player not found')
    }

    if (player !== undefined && player.username !== null) {
        const displayUsername = player.displayUsername ?? player.username

        return {
            player: {
                username: player.username,
                displayUsername,
                avatarUrl: placeholderAvatar(),
                createdAt: player.createdAt,
            },
            profile,
        }
    }

    // Placeholder: lets the template players from the leaderboard open their profiles
    const placeholder = findPlaceholderPlayer(username)

    if (placeholder === undefined) {
        error(404, 'Player not found')
    }

    return {
        player: { ...placeholder, createdAt: new Date(Date.UTC(2026, 0, 15)) },
        profile,
    }
}
