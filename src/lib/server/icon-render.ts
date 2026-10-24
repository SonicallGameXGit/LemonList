// Renders player icons to PNG. No SvelteKit imports, so scripts can use it too (inside the app use
// icons.ts next to it, it loads the sprites)
import sharp from 'sharp'
import { iconLayers, iconSvg, type IconColors, type IconManifest, type IconMode } from '../icons.ts'

// The SVG is in pixels of the UHD textures, rendered bigger so the image stays sharp after resizing
const DENSITY = 72 * 3

// `texture` is the sheet of the icon (static/gd/icons/<mode>/<id>.png)
export async function renderIcon(
    manifest: IconManifest,
    mode: IconMode,
    iconId: number,
    colors: IconColors,
    texture: Uint8Array,
) {
    const sheet = manifest.sheets[mode][iconId - 1]

    if (sheet === undefined) {
        throw new Error(`There is no ${mode} ${iconId}`)
    }

    // librsvg only loads embedded images
    const svg = iconSvg(
        {
            href: 'data:image/png;base64,' + Buffer.from(texture).toString('base64'),
            sheet,
            layers: iconLayers(manifest, mode, iconId, colors),
        },
        'icon',
    )

    return new Uint8Array(await sharp(Buffer.from(svg), { density: DENSITY }).png().toBuffer())
}
