import { getLeaderboard } from '#lib/server/placeholders.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { leaderboard: getLeaderboard() }
}
