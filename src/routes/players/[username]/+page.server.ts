import { error } from '@sveltejs/kit'
import { getPlayer, getPlayerProfile } from '#lib/server/list.ts'
import { avatarUrl } from '#lib/server/media.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ params }) => {
    const player = getPlayer(params.username.toLowerCase())

    if (player === undefined || player.username === null) {
        error(404, 'Player not found')
    }

    const profile = getPlayerProfile(player.id, player.username)

    if (profile === null) {
        error(404, 'Player not found')
    }

    return {
        player: {
            username: player.username,
            displayUsername: player.displayUsername ?? player.username,
            avatarUrl: avatarUrl(player.avatar),
            createdAt: player.createdAt,
        },
        profile,
    }
}
