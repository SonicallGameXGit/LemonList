import { error } from '@sveltejs/kit'
import {
    getEngagementDistribution,
    getLevel,
    getLevelNeighbours,
    getLevelRecords,
    getViewerRating,
} from '#lib/server/list.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ params, locals }) => {
    const id = Number(params.id)

    if (!Number.isInteger(id)) {
        error(404, 'Level not found')
    }

    const level = getLevel(id)

    if (level === undefined) {
        error(404, 'Level not found')
    }

    return {
        level,
        neighbours: getLevelNeighbours(level),
        records: getLevelRecords(level.id),
        distribution: getEngagementDistribution(level.id),
        viewerRating: getViewerRating(level, locals.user?.id),
    }
}
