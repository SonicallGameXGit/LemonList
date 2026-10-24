import { error } from '@sveltejs/kit'
import * as v from 'valibot'
import { ENGAGEMENT_MAX } from '#lib/list.ts'
import { requireUser } from '#lib/server/access.ts'
import { attempt, formFailure, id, parseForm, requiredInteger } from '#lib/server/forms.ts'
import { rateLevel, voteSkillsets } from '#lib/server/list-actions.ts'
import {
    getEngagementDistribution,
    getLevel,
    getLevelNeighbours,
    getLevelRecords,
    getLevelSkillsets,
    getSkillsetTags,
    getSkillsets,
    getViewerRating,
    getViewerSkillsets,
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
        skillsets: getLevelSkillsets(level),
        // Every skillset, to vote
        allSkillsets: level.position === null ? [] : getSkillsets(),
        viewerSkillsets: getViewerSkillsets(level, locals.user?.id),
        skillsetTags: getSkillsetTags(),
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
        const target = levelId(params.id)

        return attempt('rate', () => rateLevel(user.id, target, score), 'Thanks for rating!')
    },
    // The checked skillsets replace the ones the player chose before, none takes the vote back
    skillsets: async ({ locals, params, request }) => {
        const user = requireUser(locals)
        const parsed = v.safeParse(v.array(id()), (await request.formData()).getAll('skillset'))

        if (!parsed.success) {
            return formFailure('skillsets', 'Reload the page and try again')
        }

        const skillsetIds = parsed.output

        return attempt(
            'skillsets',
            () => voteSkillsets(user.id, levelId(params.id), skillsetIds),
            skillsetIds.length === 0 ? 'Your vote was removed.' : 'Thanks for voting!',
        )
    },
} satisfies Actions
