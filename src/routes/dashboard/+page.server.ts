import * as v from 'valibot'
import { NOTES_MAX_LENGTH } from '#lib/list-rules.ts'
import { requireUser } from '#lib/server/access.ts'
import {
    attempt,
    id,
    optionalText,
    optionalUrl,
    parseForm,
    requiredInteger,
    requiredUrl,
} from '#lib/server/forms.ts'
import { submitRecord, withdrawRecord } from '#lib/server/list-actions.ts'
import {
    countSubmissions,
    getLevelsToRate,
    getMainList,
    getPlayerProfile,
    getSubmissions,
} from '#lib/server/list.ts'
import { paginate } from '#lib/pagination.ts'
import type { Actions, PageServerLoad } from './$types'

const SUBMISSIONS_PAGE_SIZE = 5

export const load: PageServerLoad = ({ locals, url }) => {
    const user = locals.user

    // The dashboard layout already redirects guests
    if (user === undefined) {
        return { stats: null, levels: [], submissions: [], page: 1, pages: 1, levelsToRate: [] }
    }

    const pages = paginate(url, countSubmissions(user.id), SUBMISSIONS_PAGE_SIZE)

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
        submissions: getSubmissions(user.id, SUBMISSIONS_PAGE_SIZE, pages.offset),
        page: pages.page,
        pages: pages.pages,
        levelsToRate: getLevelsToRate(user.id),
    }
}

const recordSchema = v.object({
    level: requiredInteger('Level', 1, Number.MAX_SAFE_INTEGER),
    progress: requiredInteger('Progress', 1, 100),
    video: requiredUrl('Video link'),
    raw: optionalUrl('Raw footage link'),
    notes: optionalText('Notes', NOTES_MAX_LENGTH),
})

export const actions = {
    submit: async ({ locals, request }) => {
        const user = requireUser(locals)
        const parsed = parseForm('submit', await request.formData(), recordSchema)

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt(
            'submit',
            () =>
                submitRecord(user.id, {
                    levelId: input.level,
                    progress: input.progress,
                    videoUrl: input.video,
                    rawFootageUrl: input.raw,
                    notes: input.notes,
                }),
            'Record submitted! An admin will review it soon.',
        )
    },
    withdraw: async ({ locals, request }) => {
        const user = requireUser(locals)
        const parsed = parseForm('withdraw', await request.formData(), v.object({ record: id() }))

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const recordId = parsed.data.record

        return attempt('withdraw', () => withdrawRecord(user.id, recordId))
    },
} satisfies Actions
