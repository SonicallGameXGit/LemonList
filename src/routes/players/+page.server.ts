import { getLeaderboard } from '#lib/server/list.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { leaderboard: getLeaderboard() }
}
