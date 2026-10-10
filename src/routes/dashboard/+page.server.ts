import { getLevelsToRate, getMainList, getPlayerProfile, getSubmissions } from '#lib/server/list.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ locals }) => {
    const user = locals.user

    // The dashboard layout already redirects guests
    if (user === undefined) {
        return { stats: null, levels: [], submissions: [], levelsToRate: [] }
    }

    const profile =
        user.username === null || user.username === undefined
            ? null
            : getPlayerProfile(user.id, user.username)

    return {
        stats:
            profile === null
                ? null
                : { rank: profile.rank, points: profile.points, completions: profile.completions },
        levels: getMainList().map((level) => ({
            id: level.id,
            name: level.name,
            position: level.position,
        })),
        submissions: getSubmissions(user.id),
        levelsToRate: getLevelsToRate(user.id),
    }
}
