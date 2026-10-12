import * as v from 'valibot'
import { RecordStatus } from '#lib/list.ts'
import { requireAdmin } from '#lib/server/access.ts'
import { attempt, id, parseForm } from '#lib/server/forms.ts'
import { rejectLevelSubmission } from '#lib/server/list-actions.ts'
import { getReviewSubmissions } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

const REVIEW_LIMIT = 200

function statusParam(value: string | null) {
    const result = v.safeParse(v.enum(RecordStatus), value)

    return result.success ? result.output : RecordStatus.Pending
}

export const load: PageServerLoad = ({ url }) => {
    const status = statusParam(url.searchParams.get('status'))

    return {
        status,
        submissions: getReviewSubmissions(status, REVIEW_LIMIT),
        limit: REVIEW_LIMIT,
    }
}

export const actions = {
    reject: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm('review', await request.formData(), v.object({ submission: id() }))

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const submissionId = parsed.data.submission

        return attempt('review', () => rejectLevelSubmission(submissionId))
    },
} satisfies Actions
