import * as v from 'valibot'
import { PlayerFilter } from '#lib/list.ts'
import { requireAdmin } from '#lib/server/access.ts'
import { attempt, checkbox, parseForm } from '#lib/server/forms.ts'
import { removeAvatar, setAccountVerified } from '#lib/server/list-actions.ts'
import { getAdminPlayers } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

const PLAYERS_LIMIT = 100

export const load: PageServerLoad = ({ url }) => {
    const filterResult = v.safeParse(v.enum(PlayerFilter), url.searchParams.get('filter'))
    const filter = filterResult.success ? filterResult.output : PlayerFilter.Unverified
    const search = (url.searchParams.get('q') ?? '').trim()

    return {
        filter,
        search,
        players: getAdminPlayers(filter, search, PLAYERS_LIMIT),
        limit: PLAYERS_LIMIT,
    }
}

const playerSchema = v.pipe(v.optional(v.string(), ''), v.nonEmpty('Unknown player'))

export const actions = {
    verify: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'player',
            await request.formData(),
            v.object({ player: playerSchema, verified: checkbox() }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt('player', () => setAccountVerified(input.player, input.verified))
    },
    removeAvatar: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'player',
            await request.formData(),
            v.object({ player: playerSchema }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const playerId = parsed.data.player

        return attempt('player', () => removeAvatar(playerId))
    },
} satisfies Actions
