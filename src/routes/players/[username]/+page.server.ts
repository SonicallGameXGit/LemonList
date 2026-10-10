import { error } from '@sveltejs/kit'
import { eq } from 'drizzle-orm'
import { db } from '#lib/server/db/index.ts'
import { user } from '#lib/server/db/schema.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ params }) => {
    const player = db
        .select({
            username: user.username,
            displayUsername: user.displayUsername,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.username, params.username.toLowerCase()))
        .get()

    if (player === undefined || player.username === null) {
        error(404, 'Player not found')
    }

    return {
        player: {
            username: player.username,
            displayUsername: player.displayUsername ?? player.username,
            createdAt: player.createdAt,
        },
    }
}
