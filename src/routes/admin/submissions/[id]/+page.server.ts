import { error, redirect } from '@sveltejs/kit'
import type { LevelFormValues } from '#lib/list.ts'
import { requireAdmin } from '#lib/server/access.ts'
import { run } from '#lib/server/forms.ts'
import { formPreview, parseLevelForm } from '#lib/server/level-form.ts'
import { acceptLevelSubmission, rejectLevelSubmission } from '#lib/server/list-actions.ts'
import {
    getDifficulties,
    getMainListSize,
    getPlayerUsernames,
    getReviewSubmission,
} from '#lib/server/list.ts'
import { levelThumbnailUrl } from '#lib/server/media.ts'
import type { Actions, PageServerLoad } from './$types'

function submissionId(param: string) {
    const id = Number(param)

    if (!Number.isInteger(id)) {
        error(404, 'Submission not found')
    }

    return id
}

export const load: PageServerLoad = ({ params }) => {
    const submission = getReviewSubmission(submissionId(params.id))

    if (submission === undefined) {
        error(404, 'Submission not found')
    }

    // The level starts as the player sent it. Their video is the completion, not the
    // verification, so it isn't the level video and its thumbnail isn't the preview
    const level: LevelFormValues = {
        gdId: submission.gdId,
        name: submission.name,
        creator: submission.creator,
        verifier: null,
        verificationProgress: 100,
        videoUrl: null,
        thumbnailUrl: submission.hasPreview
            ? submission.thumbnailUrl
            : levelThumbnailUrl(null, null),
        hasPreview: submission.hasPreview,
        gameDifficulty: submission.gameDifficulty,
        listDifficultyId: submission.listDifficulty === null ? null : submission.listDifficulty.id,
        position: null,
    }

    return {
        submission,
        level,
        players: getPlayerUsernames(),
        difficulties: getDifficulties(),
        mainListSize: getMainListSize(),
    }
}

export const actions = {
    accept: async ({ locals, params, request }) => {
        requireAdmin(locals)
        const id = submissionId(params.id)
        const formData = await request.formData()
        const parsed = parseLevelForm('accept', formData)

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const { input, removePreview, gameThumbnail } = parsed.data
        const accepted = await run('accept', async () =>
            acceptLevelSubmission(
                id,
                input,
                await formPreview(formData, input.gdId, gameThumbnail),
                removePreview,
            ),
        )

        if (accepted.failure !== null) {
            return accepted.failure
        }

        redirect(303, '/levels/' + accepted.data)
    },
    reject: async ({ locals, params }) => {
        requireAdmin(locals)
        const id = submissionId(params.id)
        const rejected = await run('accept', () => rejectLevelSubmission(id))

        if (rejected.failure !== null) {
            return rejected.failure
        }

        redirect(303, '/admin/submissions')
    },
} satisfies Actions
