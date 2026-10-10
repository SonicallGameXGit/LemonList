import {
    getLevelsToRate,
    getMainList,
    getPlayerProfile,
    getSubmissions,
} from '#lib/server/placeholders.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ locals }) => {
    const profile = getPlayerProfile(locals.user?.username ?? '')

    return {
        stats:
            profile === null
                ? null
                : { rank: profile.rank, points: profile.points, completions: profile.completions },
        // Placeholder: manual account verification is not implemented yet
        accountVerified: false,
        levels: getMainList().map((level) => ({
            id: level.id,
            name: level.name,
            position: level.position,
        })),
        submissions: getSubmissions(),
        levelsToRate: getLevelsToRate(),
    }
}
