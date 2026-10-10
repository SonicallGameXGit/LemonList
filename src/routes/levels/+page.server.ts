import { getMainList } from '#lib/server/placeholders.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { levels: getMainList() }
}
