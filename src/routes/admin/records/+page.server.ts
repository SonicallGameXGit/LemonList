import * as v from 'valibot'
import { RecordStatus } from '#lib/list.ts'
import { requireAdmin } from '#lib/server/access.ts'
import { attempt, id, parseForm } from '#lib/server/forms.ts'
import { deleteRecord, reviewRecord, setAccountVerified } from '#lib/server/list-actions.ts'
import { countReviewRecords, getReviewRecords } from '#lib/server/list.ts'
import { paginate } from '#lib/pagination.ts'
import type { Actions, PageServerLoad } from './$types'

const PAGE_SIZE = 25

function statusParam(value: string | null) {
    const result = v.safeParse(v.enum(RecordStatus), value)

    return result.success ? result.output : RecordStatus.Pending
}

export const load: PageServerLoad = ({ url }) => {
    const status = statusParam(url.searchParams.get('status'))
    const pages = paginate(url, countReviewRecords(status), PAGE_SIZE)

    return {
        status,
        records: getReviewRecords(status, PAGE_SIZE, pages.offset),
        page: pages.page,
        pages: pages.pages,
    }
}

export const actions = {
    review: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'review',
            await request.formData(),
            v.object({ record: id(), status: v.enum(RecordStatus, 'Unknown record status') }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const input = parsed.data

        return attempt('review', () => reviewRecord(input.record, input.status))
    },
    delete: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm('review', await request.formData(), v.object({ record: id() }))

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const recordId = parsed.data.record

        return attempt('review', () => deleteRecord(recordId))
    },
    // Records of unverified accounts can't be approved, so the queue can verify them right away
    verify: async ({ locals, request }) => {
        requireAdmin(locals)
        const parsed = parseForm(
            'review',
            await request.formData(),
            v.object({ player: v.pipe(v.string(), v.nonEmpty('Unknown player')) }),
        )

        if (parsed.failure !== null) {
            return parsed.failure
        }

        const playerId = parsed.data.player

        return attempt('review', () => setAccountVerified(playerId, true))
    },
} satisfies Actions
