import { getFutureList } from '#lib/server/list.ts'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => {
    return { levels: getFutureList() }
}
