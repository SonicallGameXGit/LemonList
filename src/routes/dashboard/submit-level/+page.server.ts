import * as v from 'valibot'
import { requireUser } from '#lib/server/access.ts'
import { attempt, formSuccess, id, parseForm, run } from '#lib/server/forms.ts'
import { formPreview, parseSubmissionForm } from '#lib/server/level-form.ts'
import { submitLevel, withdrawLevelSubmission } from '#lib/server/list-actions.ts'
import { getDifficulties, getLevelSubmissions, getMainListSize } from '#lib/server/list.ts'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = ({ locals }) => {
    const user = requireUser(locals)

    return {
        difficulties: getDifficulties(),
        mainListSize: getMainListSize(),
        submissions: getLevelSubmissions(user.id),
    }
}

export const actions = {
    submit: async ({ locals, request }) => {
        const user = requireUser(locals)
        const formData = await request.formData()
        const parsed = parseSubmissionForm('submit', formData)

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const { input, gameThumbnail } = parsed.data
        const sent = await run('submit', async () =>
            submitLevel(user.id, input, await formPreview(formData, input.gdId, gameThumbnail)),
        )

        if (sent.failure !== null) {
            return sent.failure
        }

        return formSuccess('submit', 'Level sent! An admin will review it and place it soon.')
    },
    withdraw: async ({ locals, request }) => {
        const user = requireUser(locals)
        const parsed = parseForm(
            'withdraw',
            await request.formData(),
            v.object({ submission: id() }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const submissionId = parsed.data.submission

        return attempt('withdraw', () => withdrawLevelSubmission(user.id, submissionId))
    },
} satisfies Actions
