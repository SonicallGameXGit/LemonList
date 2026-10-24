// Renders icons to images: the avatar of players who build their icon in the garage, and the icons
// admins pick for skillsets
import { iconSheetUrl, loadIconManifest } from '#lib/icon-kit.ts'
import { loadPickerManifest, parsePickedIcon, pickerSpriteUrl } from '#lib/icon-picker.ts'
import {
    defaultIconKit,
    iconCount,
    type IconColors,
    type IconKit,
    type IconMode,
} from '#lib/icons.ts'
import { renderIcon } from '#lib/server/icon-render.ts'

// Static files through event.fetch, it reads them without a request
async function readStatic(fetcher: typeof fetch, url: string) {
    const response = await fetcher(url)

    if (!response.ok) {
        throw new Error(`${url} is missing (${response.status})`)
    }

    return new Uint8Array(await response.arrayBuffer())
}

async function renderPlayerIcon(
    fetcher: typeof fetch,
    mode: IconMode,
    iconId: number,
    colors: IconColors,
) {
    const manifest = await loadIconManifest(fetcher)
    const texture = await readStatic(fetcher, iconSheetUrl(mode, iconId))

    return renderIcon(manifest, mode, iconId, colors, texture)
}

// PNG of the icon the kit shows (its mode), `fetcher` is event.fetch
export function renderKitIcon(fetcher: typeof fetch, kit: IconKit) {
    return renderPlayerIcon(fetcher, kit.mode, kit.icons[kit.mode], kit)
}

// Image of an icon from the icon picker (the value of its input), player icons get the default
// colors of the game. Null if there's no such icon
export async function pickedIconImage(fetcher: typeof fetch, value: string) {
    const picked = parsePickedIcon(value)

    if (picked === null) {
        return null
    }

    if (picked.kind === 'player') {
        const manifest = await loadIconManifest(fetcher)

        if (picked.id < 1 || picked.id > iconCount(manifest, picked.mode)) {
            return null
        }

        return renderPlayerIcon(fetcher, picked.mode, picked.id, defaultIconKit())
    }

    const manifest = await loadPickerManifest(fetcher)
    const known = manifest.categories.some((category) =>
        category.icons.some((icon) => icon.id === picked.id),
    )

    if (!known) {
        return null
    }

    return readStatic(fetcher, pickerSpriteUrl(picked.id))
}
