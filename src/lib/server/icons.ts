// Renders icons of the kit to images (the avatar of players who build their icon in the garage)
import sharp from 'sharp'
import { iconSheetUrl, loadIconManifest } from '#lib/icon-kit.ts'
import { iconLayers, iconSvg, type IconKit } from '#lib/icons.ts'

// The SVG is in pixels of the UHD textures, rendered bigger so the avatar stays sharp after resizing
const DENSITY = 72 * 3

// PNG of the icon the kit shows (its mode), `fetcher` is event.fetch
export async function renderKitIcon(fetcher: typeof fetch, kit: IconKit) {
    const manifest = await loadIconManifest(fetcher)
    const iconId = kit.icons[kit.mode]
    const sheet = manifest.sheets[kit.mode][iconId - 1]

    if (sheet === undefined) {
        throw new Error(`There is no ${kit.mode} ${iconId}`)
    }

    const response = await fetcher(iconSheetUrl(kit.mode, iconId))

    if (!response.ok) {
        throw new Error(`The sheet of ${kit.mode} ${iconId} is missing (${response.status})`)
    }

    // librsvg only loads embedded images
    const texture = Buffer.from(await response.arrayBuffer()).toString('base64')
    const svg = iconSvg(
        {
            href: 'data:image/png;base64,' + texture,
            sheet,
            layers: iconLayers(manifest, kit.mode, iconId, kit),
        },
        'icon',
    )

    return new Uint8Array(await sharp(Buffer.from(svg), { density: DENSITY }).png().toBuffer())
}
