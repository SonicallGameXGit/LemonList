import { error } from '@sveltejs/kit'
import { MEDIA_TYPE, readMedia } from '#lib/server/media.ts'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ params }) => {
    const file = await readMedia(params.key)

    if (file === null) {
        error(404, 'Not found')
    }

    return new Response(new Uint8Array(file), {
        headers: {
            'content-type': MEDIA_TYPE,
            // Keys are random and never reused, a new upload always gets a new URL
            'cache-control': 'public, max-age=31536000, immutable',
            'x-content-type-options': 'nosniff',
        },
    })
}
