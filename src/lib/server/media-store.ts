// Storage of uploaded media on the local disk. Doesn't depend on SvelteKit, so scripts (like the
// seed) can use it too: every function takes the media directory. Inside the app use media.ts
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export enum MediaKind {
    Avatar = 'avatars',
    Preview = 'previews',
    DifficultyFace = 'difficulties',
}

// Every image is re-encoded, so the stored files are always of this type
export const MEDIA_TYPE = 'image/webp'

type ImageRules = {
    maxBytes: number
    width: number
    height: number
    // Avatars are game icons with transparency, keep them whole. Previews fill the frame.
    // Difficulty faces keep their own shape and are only scaled down
    fit: 'contain' | 'cover' | 'inside'
}

const MEGABYTE = 1024 * 1024

export const imageRules: Record<MediaKind, ImageRules> = {
    [MediaKind.Avatar]: { maxBytes: 2 * MEGABYTE, width: 256, height: 256, fit: 'contain' },
    [MediaKind.Preview]: { maxBytes: 8 * MEGABYTE, width: 1280, height: 720, fit: 'cover' },
    [MediaKind.DifficultyFace]: { maxBytes: 2 * MEGABYTE, width: 256, height: 256, fit: 'inside' },
}

const acceptedFormats = ['jpeg', 'png', 'webp']

// Guards against decompression bombs, way above any real screenshot
const MAX_INPUT_PIXELS = 40_000_000

const keyPattern = new RegExp(
    `^(${Object.values(MediaKind).join('|')})/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp$`,
)

// Messages are safe to show to the uploader
export class MediaError extends Error {}

export function isMediaKey(key: string) {
    return keyPattern.test(key)
}

function mediaPath(dir: string, key: string) {
    if (!isMediaKey(key)) {
        throw new MediaError('Invalid media key')
    }

    return path.join(dir, key)
}

// Validates an uploaded image, re-encodes it (which also strips metadata like GPS) and returns
// the key to store in the database
export async function writeImage(dir: string, kind: MediaKind, data: Uint8Array) {
    const rules = imageRules[kind]

    if (data.byteLength > rules.maxBytes) {
        throw new MediaError(`The image is too big, the limit is ${rules.maxBytes / MEGABYTE} MB`)
    }

    const image = sharp(data, { limitInputPixels: MAX_INPUT_PIXELS })
    const format = await image
        .metadata()
        .then((metadata) => metadata.format)
        .catch(() => undefined)

    if (format === undefined || !acceptedFormats.includes(format)) {
        throw new MediaError('Only PNG, JPEG and WebP images are allowed')
    }

    const output = await image
        .rotate()
        .resize(rules.width, rules.height, {
            fit: rules.fit,
            withoutEnlargement: rules.fit === 'inside',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 85 })
        .toBuffer()
        .catch(() => {
            throw new MediaError('The image is damaged')
        })

    const key = `${kind}/${randomUUID()}.webp`

    await mkdir(path.join(dir, kind), { recursive: true })
    await writeFile(mediaPath(dir, key), output)

    return key
}

// Null if the key is invalid or the file is gone
export async function readMediaFile(dir: string, key: string) {
    if (!isMediaKey(key)) {
        return null
    }

    return readFile(mediaPath(dir, key)).catch(() => null)
}

export async function deleteMediaFile(dir: string, key: string) {
    if (!isMediaKey(key)) {
        return
    }

    await rm(mediaPath(dir, key), { force: true })
}
