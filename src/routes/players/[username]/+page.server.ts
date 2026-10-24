import { error } from '@sveltejs/kit'
import { kitIconSvg, loadIconManifest, parseIconKit } from '#lib/icon-kit.ts'
import { iconModeNames, iconModes } from '#lib/icons.ts'
import { getPlayer, getPlayerProfile, getPlayerSkillsets } from '#lib/server/list.ts'
import { avatarUrl } from '#lib/server/media.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, fetch }) => {
    const player = getPlayer(params.username.toLowerCase())

    if (player === undefined || player.username === null) {
        error(404, 'Player not found')
    }

    const profile = getPlayerProfile(player.id, player.username)

    if (profile === null) {
        error(404, 'Player not found')
    }

    // Every icon of the kit built in the garage, like on game profiles
    const manifest = await loadIconManifest(fetch)
    const kit = parseIconKit(manifest, player.iconKit)
    const icons =
        kit === null
            ? []
            : iconModes.map((mode) => ({
                  name: iconModeNames[mode],
                  svg: kitIconSvg(manifest, mode, kit.icons[mode], kit, 'kit-' + mode),
              }))

    return {
        player: {
            username: player.username,
            displayUsername: player.displayUsername ?? player.username,
            avatarUrl: avatarUrl(player.avatar),
            createdAt: player.createdAt,
        },
        profile,
        icons,
        // The player can hide them in the settings
        skillsets: player.showSkillsets ? getPlayerSkillsets(player.username) : null,
    }
}
