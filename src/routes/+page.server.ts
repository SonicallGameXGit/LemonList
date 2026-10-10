import {
    getListStats,
    getMainList,
    getRecentChanges,
    getRecentRecords,
} from '#lib/server/placeholders.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return {
        stats: getListStats(),
        topLevels: getMainList().slice(0, 5),
        changes: getRecentChanges(),
        recentRecords: getRecentRecords(5),
    }
}
