// Player icons of Geometry Dash (the icon kit). Sprites come from the game (scripts/icons.ts writes
// them to static/gd/icons), here is everything to compose them. No SvelteKit imports: the
// extraction script uses this module too

// In the order of the garage tabs
export enum IconMode {
    Cube = 'cube',
    Ship = 'ship',
    Ball = 'ball',
    Ufo = 'ufo',
    Wave = 'wave',
    Robot = 'robot',
    Spider = 'spider',
    Swing = 'swing',
    Jetpack = 'jetpack',
}

export const iconModes = Object.values(IconMode)

export const iconModeNames: Record<IconMode, string> = {
    [IconMode.Cube]: 'Cube',
    [IconMode.Ship]: 'Ship',
    [IconMode.Ball]: 'Ball',
    [IconMode.Ufo]: 'UFO',
    [IconMode.Wave]: 'Wave',
    [IconMode.Robot]: 'Robot',
    [IconMode.Spider]: 'Spider',
    [IconMode.Swing]: 'Swing',
    [IconMode.Jetpack]: 'Jetpack',
}

// Prefix of the sprite sheets in the game resources (Resources/icons/<prefix>_<id>-uhd.png)
export const iconModePrefixes: Record<IconMode, string> = {
    [IconMode.Cube]: 'player',
    [IconMode.Ship]: 'ship',
    [IconMode.Ball]: 'player_ball',
    [IconMode.Ufo]: 'bird',
    [IconMode.Wave]: 'dart',
    [IconMode.Robot]: 'robot',
    [IconMode.Spider]: 'spider',
    [IconMode.Swing]: 'swing',
    [IconMode.Jetpack]: 'jetpack',
}

// The player colors of the game (2.2), the index is the color id
export const iconColors = [
    '#7dff00',
    '#00ff00',
    '#00ff7d',
    '#00ffff',
    '#007dff',
    '#0000ff',
    '#7d00ff',
    '#ff00ff',
    '#ff007d',
    '#ff0000',
    '#ff7d00',
    '#ffff00',
    '#ffffff',
    '#b900ff',
    '#ffb900',
    '#000000',
    '#00c8ff',
    '#afafaf',
    '#5a5a5a',
    '#ff7d7d',
    '#00af4b',
    '#007d7d',
    '#004baf',
    '#4b00af',
    '#7d007d',
    '#af004b',
    '#af4b00',
    '#7d7d00',
    '#4baf00',
    '#ff4b00',
    '#963200',
    '#966400',
    '#649600',
    '#009664',
    '#006496',
    '#640096',
    '#960064',
    '#960000',
    '#009600',
    '#000096',
    '#7dffaf',
    '#7d7dff',
    '#fffa7f',
    '#fa7fff',
    '#00ffc0',
    '#50320e',
    '#cda576',
    '#b680ff',
    '#ff3a3a',
    '#4d4d8f',
    '#000a4c',
    '#fdd4ce',
    '#beb5ff',
    '#700000',
    '#520200',
    '#380106',
    '#804f4f',
    '#7a3535',
    '#512424',
    '#a36246',
    '#754936',
    '#563528',
    '#ffb972',
    '#ffa040',
    '#66311e',
    '#5b2700',
    '#472000',
    '#a77b4d',
    '#6d5339',
    '#513e2a',
    '#ffffc0',
    '#fde0a0',
    '#c0ffa0',
    '#b1ff6d',
    '#c0ffe0',
    '#94ffe4',
    '#43a18a',
    '#316d5f',
    '#265449',
    '#006000',
    '#004000',
    '#006060',
    '#004040',
    '#a0ffff',
    '#010770',
    '#00496d',
    '#00324c',
    '#002638',
    '#5080ad',
    '#335375',
    '#233c56',
    '#e0e0e0',
    '#3d068c',
    '#370860',
    '#404040',
    '#6f49a4',
    '#54367f',
    '#422a63',
    '#fcb5ff',
    '#af57af',
    '#824382',
    '#5e315e',
    '#808080',
    '#66033e',
    '#470134',
    '#d2ff32',
    '#76bdff',
]

// Id of black in iconColors
const BLACK = 15

// What a player picked in the garage: an icon of every mode, the colors (ids of iconColors) and
// the mode shown as their avatar (the last one picked, like the icon on game leaderboards)
export type IconKit = {
    mode: IconMode
    icons: Record<IconMode, number>
    color1: number
    color2: number
    glowColor: number
    glow: boolean
}

// The kit of new players in the game
export function defaultIconKit(): IconKit {
    return {
        mode: IconMode.Cube,
        icons: {
            [IconMode.Cube]: 1,
            [IconMode.Ship]: 1,
            [IconMode.Ball]: 1,
            [IconMode.Ufo]: 1,
            [IconMode.Wave]: 1,
            [IconMode.Robot]: 1,
            [IconMode.Spider]: 1,
            [IconMode.Swing]: 1,
            [IconMode.Jetpack]: 1,
        },
        color1: 0,
        color2: 3,
        glowColor: 3,
        glow: false,
    }
}

// static/gd/icons/manifest.json, written by scripts/icons.ts. Sizes and positions are in pixels of
// the UHD textures, offsets are in cocos2d coordinates (y goes up)
export type IconFrame = {
    // Frames of a sheet are stacked in one column
    y: number
    width: number
    height: number
    offsetX: number
    offsetY: number
}

export type IconSheet = {
    width: number
    height: number
    // By the suffix after the icon name: '001', '2_001', 'glow_001', '01_001' (a part)...
    frames: Record<string, IconFrame>
}

export type IconPart = {
    // '01', '02'... of the sheet
    part: string
    x: number
    y: number
    scaleX: number
    scaleY: number
    // Degrees, clockwise
    rotation: number
    // The legs behind the body are darker
    back: boolean
}

export type IconManifest = {
    // Index 0 is the icon 1
    sheets: Record<IconMode, IconSheet[]>
    // Idle pose, from the bottom part to the top one
    poses: Record<IconMode.Robot | IconMode.Spider, IconPart[]>
}

export function iconCount(manifest: IconManifest, mode: IconMode) {
    return manifest.sheets[mode].length
}

// How a layer is tinted: by a color of the kit, darkened for the back legs, or kept as it is
type Tint = { color: string; shade: number } | null

export type IconLayer = {
    frame: IconFrame
    tint: Tint
    // Pixels of the UHD texture, y goes down. Moves the center of the frame
    x: number
    y: number
    scaleX: number
    scaleY: number
    rotation: number
}

export type IconRender = {
    // URL or data URI of the sheet
    href: string
    sheet: IconSheet
    layers: IconLayer[]
}

// The game draws these frames from the bottom: glow, secondary color, the UFO dome, primary
// color, then the white details
const layerOrder = ['2_001', '3_001', '001', 'extra_001']

// Darkness of the back legs
const BACK_SHADE = 0.6

// Animation positions are in points, UHD textures have 4 pixels per point
const UHD_SCALE = 4

export type IconColors = Pick<IconKit, 'color1' | 'color2' | 'glowColor' | 'glow'>

export function colorHex(id: number) {
    const color = iconColors[id]

    return color === undefined ? '#ffffff' : color
}

// Layers of an icon, from the bottom one
export function iconLayers(
    manifest: IconManifest,
    mode: IconMode,
    id: number,
    colors: IconColors,
): IconLayer[] {
    const sheet = manifest.sheets[mode][id - 1]

    if (sheet === undefined) {
        return []
    }

    const tints: Record<string, string | null> = {
        '2_001': colorHex(colors.color2),
        '3_001': null,
        '001': colorHex(colors.color1),
        extra_001: null,
    }
    // A black icon without glow would be invisible on the dark background, the game forces it
    const glow = colors.glow || (colors.color1 === BLACK && colors.color2 === BLACK)
    const glowTint = { color: colorHex(colors.glowColor), shade: 1 }

    // Robots and spiders are built from several parts, posed like in the garage
    const parts: IconPart[] =
        mode === IconMode.Robot || mode === IconMode.Spider
            ? manifest.poses[mode]
            : [{ part: '', x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, back: false }]

    const glows: IconLayer[] = []
    const layers: IconLayer[] = []

    for (const part of parts) {
        const prefix = part.part === '' ? '' : part.part + '_'
        const placement = {
            x: part.x * UHD_SCALE,
            y: -part.y * UHD_SCALE,
            scaleX: part.scaleX,
            scaleY: part.scaleY,
            rotation: part.rotation,
        }
        const glowFrame = sheet.frames[prefix + 'glow_001']

        if (glow && glowFrame !== undefined) {
            glows.push({ frame: glowFrame, tint: glowTint, ...placement })
        }

        for (const suffix of layerOrder) {
            const frame = sheet.frames[prefix + suffix]
            const color = tints[suffix]

            if (frame === undefined || color === undefined) {
                continue
            }

            const shade = part.back ? BACK_SHADE : 1
            const tint =
                color === null
                    ? shade === 1
                        ? null
                        : { color: '#ffffff', shade }
                    : { color, shade }

            layers.push({ frame, tint, ...placement })
        }
    }

    return [...glows, ...layers]
}

type Matrix = [number, number, number, number, number, number]

function multiply(a: Matrix, b: Matrix): Matrix {
    return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
    ]
}

// From the frame (its top left corner at 0, 0) to the icon
function layerMatrix(layer: IconLayer): Matrix {
    const angle = (layer.rotation * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const part: Matrix = [
        cos * layer.scaleX,
        sin * layer.scaleX,
        -sin * layer.scaleY,
        cos * layer.scaleY,
        layer.x,
        layer.y,
    ]
    // The frame is trimmed, its center is moved by the offset inside the part
    const frame: Matrix = [
        1,
        0,
        0,
        1,
        layer.frame.offsetX - layer.frame.width / 2,
        -layer.frame.offsetY - layer.frame.height / 2,
    ]

    return multiply(part, frame)
}

function round(value: number) {
    return Math.round(value * 1000) / 1000
}

function tintFilter(tint: NonNullable<Tint>) {
    const value = Number.parseInt(tint.color.slice(1), 16)
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) =>
        round((channel / 255) * tint.shade),
    )

    // Multiplies the (white) sprite by the color, like the game tints sprites
    return `${channels[0]} 0 0 0 0 0 ${channels[1]} 0 0 0 0 0 ${channels[2]} 0 0 0 0 0 1 0`
}

// The icon as an SVG document, scales to any size. `id` keeps the filters of several icons on one
// page apart
export function iconSvg(render: IconRender, id: string) {
    const filters = new Map<string, string>()
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const groups: string[] = []

    for (const layer of render.layers) {
        const matrix = layerMatrix(layer)
        const { width, height, y } = layer.frame

        for (const [cornerX, cornerY] of [
            [0, 0],
            [width, 0],
            [0, height],
            [width, height],
        ]) {
            const pointX = matrix[0] * cornerX + matrix[2] * cornerY + matrix[4]
            const pointY = matrix[1] * cornerX + matrix[3] * cornerY + matrix[5]

            minX = Math.min(minX, pointX)
            minY = Math.min(minY, pointY)
            maxX = Math.max(maxX, pointX)
            maxY = Math.max(maxY, pointY)
        }

        let filter = ''

        if (layer.tint !== null) {
            const values = tintFilter(layer.tint)
            let filterId = filters.get(values)

            if (filterId === undefined) {
                filterId = id + '-' + filters.size
                filters.set(values, filterId)
            }

            filter = ` filter="url(#${filterId})"`
        }

        groups.push(
            `<g transform="matrix(${matrix.map(round).join(' ')})"${filter}>` +
                `<svg width="${width}" height="${height}" viewBox="0 ${y} ${width} ${height}">` +
                `<image href="${render.href}" width="${render.sheet.width}" height="${render.sheet.height}"/>` +
                '</svg></g>',
        )
    }

    if (groups.length === 0) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'
    }

    const defs = [...filters]
        .map(
            ([values, filterId]) =>
                `<filter id="${filterId}" color-interpolation-filters="sRGB">` +
                `<feColorMatrix type="matrix" values="${values}"/></filter>`,
        )
        .join('')
    const viewBox = [minX, minY, maxX - minX, maxY - minY].map(round).join(' ')
    const width = Math.ceil(maxX - minX)
    const height = Math.ceil(maxY - minY)

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">` +
        `<defs>${defs}</defs>${groups.join('')}</svg>`
    )
}
