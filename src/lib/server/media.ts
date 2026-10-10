// Uploaded media of the app, stored in MEDIA_DIR and served by /media/[...key]
import { MEDIA_DIR } from '$app/env/private'
import { asset, resolve } from '$app/paths'
import {
    deleteMediaFile,
    readMediaFile,
    writeImage,
    type MediaKind,
} from '#lib/server/media-store.ts'

export { MEDIA_TYPE, MediaError, MediaKind, imageRules } from '#lib/server/media-store.ts'

export function saveImage(kind: MediaKind, data: Uint8Array) {
    return writeImage(MEDIA_DIR, kind, data)
}

export function readMedia(key: string) {
    return readMediaFile(MEDIA_DIR, key)
}

export function deleteMedia(key: string) {
    return deleteMediaFile(MEDIA_DIR, key)
}

export function mediaUrl(key: string) {
    return resolve('/media/[...key]', { key })
}

// Everyone without an uploaded avatar gets the default Geometry Dash cube
export function avatarUrl(avatar: string | null | undefined) {
    if (avatar === null || avatar === undefined) {
        return asset('gd/cube-default.png')
    }

    return mediaUrl(avatar)
}

const youtubeHosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']

export function youtubeVideoId(videoUrl: string) {
    if (!URL.canParse(videoUrl)) {
        return null
    }

    const url = new URL(videoUrl)

    if (!youtubeHosts.includes(url.hostname)) {
        return null
    }

    const id =
        url.hostname === 'youtu.be'
            ? url.pathname.slice(1)
            : (url.searchParams.get('v') ??
              url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1])

    if (id === undefined || id === null || !/^[\w-]{11}$/.test(id)) {
        return null
    }

    return id
}

// The uploaded preview, otherwise the thumbnail of the video, otherwise the default GD scene
export function levelThumbnailUrl(preview: string | null, videoUrl: string | null) {
    if (preview !== null) {
        return mediaUrl(preview)
    }

    const videoId = videoUrl === null ? null : youtubeVideoId(videoUrl)

    if (videoId !== null) {
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    }

    return asset('gd/preview-default.png')
}
