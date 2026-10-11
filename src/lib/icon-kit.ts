// The icon manifest (static/gd/icons/manifest.json) for pages and the server, and the validation
// of icon kits. Composition itself lives in icons.ts
import { asset } from '$app/paths'
import * as v from 'valibot'
import {
    IconMode,
    iconColors,
    iconCount,
    iconLayers,
    iconSvg,
    type IconColors,
    type IconKit,
    type IconManifest,
} from '#lib/icons.ts'

const frameSchema = v.object({
    y: v.number(),
    width: v.number(),
    height: v.number(),
    offsetX: v.number(),
    offsetY: v.number(),
})

const sheetsSchema = v.array(
    v.object({
        width: v.number(),
        height: v.number(),
        frames: v.record(v.string(), frameSchema),
    }),
)

const poseSchema = v.array(
    v.object({
        part: v.string(),
        x: v.number(),
        y: v.number(),
        scaleX: v.number(),
        scaleY: v.number(),
        rotation: v.number(),
        back: v.boolean(),
    }),
)

const manifestSchema = v.object({
    sheets: v.object({
        [IconMode.Cube]: sheetsSchema,
        [IconMode.Ship]: sheetsSchema,
        [IconMode.Ball]: sheetsSchema,
        [IconMode.Ufo]: sheetsSchema,
        [IconMode.Wave]: sheetsSchema,
        [IconMode.Robot]: sheetsSchema,
        [IconMode.Spider]: sheetsSchema,
        [IconMode.Swing]: sheetsSchema,
        [IconMode.Jetpack]: sheetsSchema,
    }),
    poses: v.object({
        [IconMode.Robot]: poseSchema,
        [IconMode.Spider]: poseSchema,
    }),
})

let manifestRequest: Promise<IconManifest> | null = null

// Loaded once (per server process or browser tab). The server must pass event.fetch, it reads
// static files without a request
export function loadIconManifest(fetcher: typeof fetch) {
    if (manifestRequest === null) {
        manifestRequest = fetcher(manifestUrl())
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`The icon manifest is missing (${response.status})`)
                }

                return response.json()
            })
            .then((json: unknown) => v.parse(manifestSchema, json))
            .catch((error: unknown) => {
                manifestRequest = null
                throw error
            })
    }

    return manifestRequest
}

function manifestUrl() {
    return asset('gd/icons/manifest.json')
}

// asset() only takes known file names, the sheets are next to the manifest
export function iconSheetUrl(mode: IconMode, id: number) {
    return manifestUrl().slice(0, -'manifest.json'.length) + mode + '/' + id + '.png'
}

export function iconKitSchema(manifest: IconManifest) {
    const iconId = (mode: IconMode) =>
        v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(iconCount(manifest, mode)))
    const colorId = v.pipe(
        v.number(),
        v.integer(),
        v.minValue(0),
        v.maxValue(iconColors.length - 1),
    )

    return v.object({
        mode: v.enum(IconMode),
        icons: v.object({
            [IconMode.Cube]: iconId(IconMode.Cube),
            [IconMode.Ship]: iconId(IconMode.Ship),
            [IconMode.Ball]: iconId(IconMode.Ball),
            [IconMode.Ufo]: iconId(IconMode.Ufo),
            [IconMode.Wave]: iconId(IconMode.Wave),
            [IconMode.Robot]: iconId(IconMode.Robot),
            [IconMode.Spider]: iconId(IconMode.Spider),
            [IconMode.Swing]: iconId(IconMode.Swing),
            [IconMode.Jetpack]: iconId(IconMode.Jetpack),
        }),
        color1: colorId,
        color2: colorId,
        glowColor: colorId,
        glow: v.boolean(),
    })
}

// A kit stored or sent as JSON, null if it isn't a valid one
export function parseIconKit(manifest: IconManifest, json: string | null | undefined) {
    if (json === null || json === undefined) {
        return null
    }

    let value: unknown

    try {
        value = JSON.parse(json)
    } catch {
        return null
    }

    const result = v.safeParse(iconKitSchema(manifest), value)

    return result.success ? (result.output satisfies IconKit) : null
}

// SVG markup of one icon, the sheet is loaded by the browser. `id` must be unique on the page
export function kitIconSvg(
    manifest: IconManifest,
    mode: IconMode,
    iconId: number,
    colors: IconColors,
    id: string,
) {
    const sheet = manifest.sheets[mode][iconId - 1]

    if (sheet === undefined) {
        return null
    }

    return iconSvg(
        {
            href: iconSheetUrl(mode, iconId),
            sheet,
            layers: iconLayers(manifest, mode, iconId, colors),
        },
        id,
    )
}
