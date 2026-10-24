// Icons admins pick for skillsets (IconPicker.svelte): sprites of the game from static/gd/picker
// (written by scripts/picker.ts) and every player icon of the icon kit
import { asset } from '$app/paths'
import * as v from 'valibot'
import { IconMode } from '#lib/icons.ts'

export type PickerIcon = {
    // '<category>/<name>', the sprite is static/gd/picker/<id>.png
    id: string
    name: string
}

export type PickerCategory = {
    id: string
    name: string
    icons: PickerIcon[]
}

// static/gd/picker/manifest.json
export type PickerManifest = {
    categories: PickerCategory[]
}

// What the picker sends: a sprite, or a player icon drawn with the default colors
export type PickedIcon =
    { kind: 'sprite'; id: string } | { kind: 'player'; mode: IconMode; id: number }

const manifestSchema = v.object({
    categories: v.array(
        v.object({
            id: v.string(),
            name: v.string(),
            icons: v.array(v.object({ id: v.string(), name: v.string() })),
        }),
    ),
})

let manifestRequest: Promise<PickerManifest> | null = null

// Loaded once (per server process or browser tab). The server must pass event.fetch
export function loadPickerManifest(fetcher: typeof fetch) {
    if (manifestRequest === null) {
        manifestRequest = fetcher(manifestUrl())
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`The icon picker manifest is missing (${response.status})`)
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
    return asset('gd/picker/manifest.json')
}

// asset() only takes known file names, the sprites are next to the manifest
export function pickerSpriteUrl(id: string) {
    return manifestUrl().slice(0, -'manifest.json'.length) + id + '.png'
}

// Form value of a picked icon: 'sprite:<id>' or 'player:<mode>:<id>'
export function pickedIconValue(icon: PickedIcon) {
    if (icon.kind === 'sprite') {
        return 'sprite:' + icon.id
    }

    return `player:${icon.mode}:${icon.id}`
}

// Null if the value isn't one of pickedIconValue, the ids still have to be checked
export function parsePickedIcon(value: string): PickedIcon | null {
    const sprite = value.match(/^sprite:([a-z0-9-]+\/[a-z0-9-]+)$/)

    if (sprite !== null) {
        return { kind: 'sprite', id: sprite[1] }
    }

    const player = value.match(/^player:([a-z]+):(\d+)$/)

    if (player === null) {
        return null
    }

    const mode = Object.values(IconMode).find((other) => other === player[1])

    if (mode === undefined) {
        return null
    }

    return { kind: 'player', mode, id: Number(player[2]) }
}
