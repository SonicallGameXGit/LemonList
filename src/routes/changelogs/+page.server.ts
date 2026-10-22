import { getChangelogs } from '#lib/server/changelogs.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { changelogs: getChangelogs() }
}
