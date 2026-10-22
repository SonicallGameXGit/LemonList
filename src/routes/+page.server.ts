import { getChangelogs } from '#lib/server/changelogs.ts'
import { getListStats, getMainList, getRecentChanges, getRecentRecords } from '#lib/server/list.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return {
        stats: getListStats(),
        topLevels: getMainList().slice(0, 5),
        changes: getRecentChanges(5),
        recentRecords: getRecentRecords(5),
        changelogs: getChangelogs(2),
    }
}
