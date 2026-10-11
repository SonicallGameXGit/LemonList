import { error } from '@sveltejs/kit'
import * as v from 'valibot'
import { ENGAGEMENT_MAX } from '#lib/list.ts'
import { requireUser } from '#lib/server/access.ts'
import { attempt, parseForm, requiredInteger } from '#lib/server/forms.ts'
import { rateLevel } from '#lib/server/list-actions.ts'
import {
    getEngagementDistribution,
    getLevel,
    getLevelNeighbours,
    getLevelRecords,
    getViewerRating,
} from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

function levelId(param: string) {
    const id = Number(param)

    if (!Number.isInteger(id)) {
        error(404, 'Level not found')
    }

    return id
}

export const load: PageServerLoad = ({ params, locals }) => {
    const level = getLevel(levelId(params.id))

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

export const actions = {
    rate: async ({ locals, params, request }) => {
        const user = requireUser(locals)
        const parsed = parseForm(
            'rate',
            await request.formData(),
            v.object({ score: requiredInteger('Rating', 1, ENGAGEMENT_MAX) }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const score = parsed.data.score
        const id = levelId(params.id)

        return attempt('rate', () => rateLevel(user.id, id, score), 'Thanks for rating!')
    },
} satisfies Actions
