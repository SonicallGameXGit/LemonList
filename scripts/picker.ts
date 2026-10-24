// Extracts the sprites of the icon picker (skillset icons) from the game: pnpm picker "<Geometry Dash>/Resources"
// Writes static/gd/picker/<category>/<name>.png and static/gd/picker/manifest.json. Player icons
// aren't here, the picker takes them from the icon kit (static/gd/icons, pnpm icons)
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parsePlist } from 'plist'
import sharp, { type OverlayOptions } from 'sharp'
import type { PickerCategory, PickerManifest } from '../src/lib/icon-picker.ts'

const resources = process.argv[2]

if (resources === undefined || resources === '') {
    throw new Error('Pass the Resources folder of Geometry Dash: pnpm picker "<path>/Resources"')
}

const output = path.join(import.meta.dirname, '../static/gd/picker')

// Sprites are scaled down to fit this size, the UHD textures are 4 times bigger than the game
const MAX_SIZE = 192

type SourceFrame = {
    x: number
    y: number
    width: number
    height: number
    rotated: boolean
    offsetX: number
    offsetY: number
}

type Sheet = {
    texture: Buffer
    frames: Map<string, SourceFrame>
}

// An icon of the picker: its name and the frames drawn on top of each other, from the bottom
type IconSpec = {
    name: string
    frames: string[]
}

type CategorySpec = {
    id: string
    name: string
    sheet: string
    icons: IconSpec[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// "{1,2}" or "{{1,2},{3,4}}"
function numbers(value: unknown) {
    if (typeof value !== 'string') {
        throw new Error('Expected a cocos2d point or rect, got ' + String(value))
    }

    return [...value.matchAll(/-?[\d.]+(?:e-?\d+)?/g)].map((match) => Number(match[0]))
}

const sheets = new Map<string, Sheet>()

// TexturePacker sheets (format 3), loaded once
async function loadSheet(name: string) {
    const loaded = sheets.get(name)

    if (loaded !== undefined) {
        return loaded
    }

    const plist = parsePlist(
        (await readFile(path.join(resources, name + '-uhd.plist'), 'utf8')).trimStart(),
    )

    if (!isRecord(plist) || !isRecord(plist.frames)) {
        throw new Error(name + ' has no frames')
    }

    const frames = new Map<string, SourceFrame>()

    for (const [frameName, frame] of Object.entries(plist.frames)) {
        if (!isRecord(frame)) {
            continue
        }

        const [x, y, width, height] = numbers(frame.textureRect)
        const [offsetX, offsetY] = numbers(frame.spriteOffset)

        frames.set(frameName, {
            x,
            y,
            width,
            height,
            rotated: frame.textureRotated === true,
            offsetX,
            offsetY,
        })
    }

    const sheet = { texture: await readFile(path.join(resources, name + '-uhd.png')), frames }
    sheets.set(name, sheet)
    return sheet
}

// Rotated frames are stored turned clockwise, with the width and height swapped
function extractFrame(texture: Buffer, frame: SourceFrame) {
    const image = sharp(texture).extract({
        left: frame.x,
        top: frame.y,
        width: frame.rotated ? frame.height : frame.width,
        height: frame.rotated ? frame.width : frame.height,
    })

    return (frame.rotated ? image.rotate(-90) : image).png().toBuffer()
}

// Frames of one object share its center, offsets move them from it (cocos2d, y goes up)
async function renderIcon(sheet: Sheet, spec: IconSpec) {
    const frames = spec.frames.map((name) => {
        const frame = sheet.frames.get(name)

        if (frame === undefined) {
            throw new Error('No frame ' + name)
        }

        return frame
    })

    const left = Math.min(...frames.map((frame) => frame.offsetX - frame.width / 2))
    const right = Math.max(...frames.map((frame) => frame.offsetX + frame.width / 2))
    const top = Math.min(...frames.map((frame) => -frame.offsetY - frame.height / 2))
    const bottom = Math.max(...frames.map((frame) => -frame.offsetY + frame.height / 2))
    const composites: OverlayOptions[] = []

    for (const frame of frames) {
        composites.push({
            input: await extractFrame(sheet.texture, frame),
            left: Math.round(frame.offsetX - frame.width / 2 - left),
            top: Math.round(-frame.offsetY - frame.height / 2 - top),
        })
    }

    const composed = await sharp({
        create: {
            width: Math.ceil(right - left),
            height: Math.ceil(bottom - top),
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite(composites)
        .png()
        .toBuffer()

    return sharp(composed)
        .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
        .png({ palette: true, quality: 100, effort: 10 })
        .toBuffer()
}

function slug(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

const pad = (number: number) => String(number).padStart(2, '0')

// Numbered sprites: series('Saw', 3, (n) => `sawblade_${pad(n)}_001.png`)
function series(name: string, count: number, frames: (number: number) => string[]): IconSpec[] {
    return Array.from({ length: count }, (_, index) => ({
        name: `${name} ${index + 1}`,
        frames: frames(index + 1),
    }))
}

const one = (name: string, frame: string): IconSpec => ({ name, frames: [frame] })

const categories: CategorySpec[] = [
    {
        id: 'orbs',
        name: 'Orbs and pads',
        sheet: 'GJ_GameSheet',
        icons: [
            one('Yellow orb', 'ring_01_001.png'),
            one('Pink orb', 'ring_03_001.png'),
            { name: 'Red orb', frames: ['ring_02_001.png', 'ring_02_extra_001.png'] },
            { name: 'Blue orb', frames: ['gravring_01_001.png', 'gravring_01_extra_001.png'] },
            {
                name: 'Green orb',
                frames: ['gravJumpRing_01_001.png', 'gravJumpRing_01_extra_001.png'],
            },
            { name: 'Black orb', frames: ['dropRing_01_001.png', 'dropRing_01_extra_001.png'] },
            one('Green dash orb', 'dashRing_01_001.png'),
            one('Pink dash orb', 'dashRing_02_001.png'),
            one('Spider orb', 'spiderRing_001.png'),
            {
                name: 'Teleport orb',
                frames: ['teleportRing_001.png', 'teleportRing_color_001.png'],
            },
            {
                name: 'Toggle orb',
                frames: ['ring_custom_01_001.png', 'ring_custom_01_color_001.png'],
            },
            one('Yellow pad', 'bump_01_001.png'),
            one('Pink pad', 'bump_03_001.png'),
            one('Red pad', 'bump_02_001.png'),
            one('Blue pad', 'gravbump_01_001.png'),
            one('Spider pad', 'spiderBump_001.png'),
        ],
    },
    {
        id: 'portals',
        name: 'Portals',
        sheet: 'GJ_GameSheet02',
        icons: [
            ...[
                'Blue gravity',
                'Yellow gravity',
                'Cube',
                'Ship',
                'Orange mirror',
                'Blue mirror',
                'Ball',
                'Normal size',
                'Mini',
                'UFO',
                'Dual',
                'Single',
                'Wave',
                'Robot',
                'Teleport',
                'Teleport exit',
                'Spider',
                'Green gravity',
                'Swing',
            ].map((name, index): IconSpec => ({
                name: name + ' portal',
                frames: [
                    `portal_${pad(index + 1)}_back_001.png`,
                    `portal_${pad(index + 1)}_front_001.png`,
                ],
            })),
            ...['Slow', 'Normal', 'Fast', 'Very fast', 'Super fast'].map((name, index) =>
                one(name + ' speed', `boost_${pad(index + 1)}_001.png`),
            ),
            one('Checkpoint', 'checkpoint_01_001.png'),
        ],
    },
    {
        id: 'hazards',
        name: 'Hazards',
        sheet: 'GJ_GameSheet',
        icons: [
            ...series('Spike', 4, (n) => [`spike_${pad(n)}_001.png`]),
            ...series('Ice spike', 3, (n) => [`iceSpike_${pad(n)}_001.png`]),
            ...series('Color spike', 4, (n) => [
                `colorSpike_${pad(n)}_001.png`,
                `colorSpike_${pad(n)}_color_001.png`,
            ]),
            ...series('Ground spikes', 4, (n) => [`pit_b_${pad(n)}_001.png`]),
            ...series('Saw', 3, (n) => [`sawblade_${pad(n)}_001.png`]),
            ...series('Blade', 3, (n) => [`blade_${pad(n)}_001.png`]),
            ...series('Dark blade', 3, (n) => [
                `darkblade_${pad(n)}_001.png`,
                `darkblade_${pad(n)}_color_001.png`,
            ]),
            ...series('Light blade', 3, (n) => [
                `lightBlade_${pad(n)}_001.png`,
                `lightBlade_${pad(n)}_color_001.png`,
            ]),
            ...series('Spin blade', 2, (n) => [
                `spinBlade${pad(n)}_001.png`,
                `spinBlade${pad(n)}_color_001.png`,
            ]),
            ...series('Cogwheel', 3, (n) => [
                `blackCogwheel_${pad(n)}_001.png`,
                `blackCogwheel_${pad(n)}_color_001.png`,
            ]),
            ...series('Blade trap', 3, (n) => [
                `bladeTrap${pad(n)}_001.png`,
                `bladeTrap${pad(n)}_color_001.png`,
            ]),
            ...series('Spike wheel', 3, (n) => [`d_spikewheel_${pad(n)}_001.png`]),
            { name: 'Fireball', frames: ['fireball_01_001.png', 'fireball_01_color_001.png'] },
        ],
    },
    {
        id: 'collectibles',
        name: 'Collectibles',
        sheet: 'GJ_GameSheet03',
        icons: [
            one('Star', 'GJ_bigStar_001.png'),
            one('Moon', 'GJ_bigMoon_001.png'),
            one('Diamond', 'GJ_bigDiamond_001.png'),
            one('Key', 'GJ_bigKey_001.png'),
            one('Gold key', 'GJ_bigGoldKey_001.png'),
            one('Small star', 'GJ_starsIcon_001.png'),
            one('Small moon', 'GJ_moonsIcon_001.png'),
            one('Small diamond', 'GJ_diamondsIcon_001.png'),
            one('Secret coin', 'GJ_coinsIcon_001.png'),
            one('User coin', 'GJ_coinsIcon2_001.png'),
            one('Big secret coin', 'secretCoinUI_001.png'),
            one('Big user coin', 'secretCoinUI2_001.png'),
            one('Mana orb', 'currencyOrbIcon_001.png'),
            one('Diamond shard', 'currencyDiamondIcon_001.png'),
            one('Fire shard', 'fireShardBig_001.png'),
            one('Ice shard', 'iceShardBig_001.png'),
            one('Poison shard', 'poisonShardBig_001.png'),
            one('Shadow shard', 'shadowShardBig_001.png'),
            one('Lava shard', 'lavaShardBig_001.png'),
            one('Earth shard', 'shard0201ShardBig_001.png'),
            one('Blood shard', 'shard0202ShardBig_001.png'),
            one('Metal shard', 'shard0203ShardBig_001.png'),
            one('Light shard', 'shard0204ShardBig_001.png'),
            one('Soul shard', 'shard0205ShardBig_001.png'),
        ],
    },
    {
        id: 'symbols',
        name: 'Symbols',
        sheet: 'GJ_GameSheet03',
        icons: [
            one('Demon', 'GJ_demonIcon_001.png'),
            one('Time', 'GJ_timeIcon_001.png'),
            one('Like', 'GJ_likesIcon_001.png'),
            one('Dislike', 'GJ_dislikesIcon_001.png'),
            one('Downloads', 'GJ_downloadsIcon_001.png'),
            one('Completions', 'GJ_completesIcon_001.png'),
            one('Creator points', 'GJ_pointsIcon_001.png'),
            one('Hammer', 'GJ_hammerIcon_001.png'),
            one('Music', 'GJ_musicIcon_001.png'),
            one('Note', 'GJ_noteIcon_001.png'),
            one('Info', 'GJ_infoIcon_001.png'),
            one('Lock', 'GJ_lock_001.png'),
            one('Open lock', 'GJ_lock_open_001.png'),
            one('Big lock', 'GJLargeLock_001.png'),
            one('Secret lock', 'GJ_secretLock_001.png'),
            one('Exclamation mark', 'exMark_001.png'),
            one('Skull', 'miniSkull_001.png'),
            one('Heart', 'gj_heartOn_001.png'),
            one('Folder', 'folderIcon_001.png'),
            one('Collaboration', 'collaborationIcon_001.png'),
            one('Achievement', 'GJ_achImage_001.png'),
            one('Magic', 'GJ_sMagicIcon_001.png'),
            one('Trending', 'GJ_sTrendingIcon_001.png'),
            one('Recent', 'GJ_sRecentIcon_001.png'),
            one('Friends', 'GJ_sFriendsIcon_001.png'),
            one('Mod badge', 'modBadge_01_001.png'),
            one('Elder mod badge', 'modBadge_02_001.png'),
            one('List mod badge', 'modBadge_03_001.png'),
            one('Rank 1', 'rankIcon_1_001.png'),
            one('Top 10', 'rankIcon_top10_001.png'),
            one('Top 50', 'rankIcon_top50_001.png'),
            one('Top 100', 'rankIcon_top100_001.png'),
            one('Top 200', 'rankIcon_top200_001.png'),
            one('Top 500', 'rankIcon_top500_001.png'),
            one('Top 1000', 'rankIcon_top1000_001.png'),
            one('Ranked', 'rankIcon_all_001.png'),
            one('Tier 1', 'tier1Icon_001.png'),
            one('Tier 2', 'tier2Icon_001.png'),
            one('Store item', 'storeItemIcon_001.png'),
        ],
    },
    {
        id: 'difficulties',
        name: 'Difficulties',
        sheet: 'GJ_GameSheet03',
        icons: [
            // The faces without the names under them, in the order of the game
            one('N/A', 'diffIcon_00_btn_001.png'),
            one('Auto', 'diffIcon_auto_btn_001.png'),
            one('Easy', 'diffIcon_01_btn_001.png'),
            one('Normal', 'diffIcon_02_btn_001.png'),
            one('Hard', 'diffIcon_03_btn_001.png'),
            one('Harder', 'diffIcon_04_btn_001.png'),
            one('Insane', 'diffIcon_05_btn_001.png'),
            one('Easy Demon', 'diffIcon_07_btn_001.png'),
            one('Medium Demon', 'diffIcon_08_btn_001.png'),
            one('Hard Demon', 'diffIcon_06_btn_001.png'),
            one('Insane Demon', 'diffIcon_09_btn_001.png'),
            one('Extreme Demon', 'diffIcon_10_btn_001.png'),
        ],
    },
    {
        id: 'garage',
        name: 'Garage',
        sheet: 'GJ_GameSheet03',
        icons: [
            ...series('Death effect', 20, (n) => [`explosionIcon_${pad(n)}_001.png`]),
            ...series('Ship fire', 6, (n) => [`shipfireIcon_${pad(n)}_001.png`]),
            ...series('Trail', 7, (n) => [`player_special_${pad(n)}_001.png`]),
            ...series('Path', 10, (n) => [`pathIcon_${pad(n)}_001.png`]),
            ...[1, 2, 3, 4, 5, 16, 17, 18, 19, 20].map((n) =>
                one('Item ' + n, `gjItem_${pad(n)}_001.png`),
            ),
        ],
    },
    {
        id: 'decorations',
        name: 'Decorations',
        sheet: 'GJ_GameSheet',
        icons: [
            { name: 'Skull', frames: ['d_skull01_001.png', 'd_skull01_color_001.png'] },
            ...series('Skull', 2, (n) => [`d_skull_${pad(n)}_001.png`]),
            { name: 'Heart', frames: ['d_heart01_001.png', 'd_heart01_color_001.png'] },
            { name: 'Potion', frames: ['d_potion01_001.png', 'd_potion01_color_001.png'] },
            { name: 'Key', frames: ['d_key01_001.png', 'd_key01_color_001.png'] },
            { name: 'Keyhole', frames: ['d_keyHole01_001.png', 'd_keyHole01_color_001.png'] },
            {
                name: 'Flower',
                frames: ['d_flower01_01_001.png', 'd_flower01_01_color_001.png'],
            },
            one('Question mark', 'd_qmark_01_001.png'),
            one('Exclamation mark', 'd_exmark_01_001.png'),
            one('Cross', 'd_cross_01_001.png'),
            ...series('Arrow', 3, (n) => [`d_arrow_${pad(n)}_001.png`]),
            ...series('Gear', 4, (n) => [`d_cogwheel_${pad(n)}_001.png`]),
            ...series('Wheel', 3, (n) => [`d_wheel_${pad(n)}_001.png`]),
            ...series('Cartwheel', 3, (n) => [`d_cartwheel_${pad(n)}_001.png`]),
            ...series('Spiral', 4, (n) => [`d_spiral_${pad(n)}_001.png`]),
            ...series('Swirl', 4, (n) => [`d_swirve_${pad(n)}_001.png`]),
            one('Ring spiral', 'd_ringSpiral_01_001.png'),
            ...series('Geometric', 3, (n) => [`d_geometric_${pad(n)}_001.png`]),
            ...series('Cloud', 3, (n) => [`d_cloud_${pad(n + 2)}_001.png`]),
            ...series('Round cloud', 3, (n) => [`d_roundCloud_${pad(n)}_001.png`]),
            ...series('Art cloud', 3, (n) => [`d_artCloud_${pad(n)}_001.png`]),
            ...series('Rainbow', 2, (n) => [`d_rainbow_${pad(n)}_001.png`]),
            ...[
                'Circle',
                'Ring',
                'Heart shape',
                'Diamond shape',
                'Star shape',
                'Note',
                'Square',
                'Triangle',
                'Hexagon',
            ].map((name, index) => one(name, `d_ball_${pad(index + 1)}_001.png`)),
        ],
    },
]

await rm(output, { recursive: true, force: true })

const manifest: PickerManifest = { categories: [] }

for (const spec of categories) {
    const sheet = await loadSheet(spec.sheet)
    const category: PickerCategory = { id: spec.id, name: spec.name, icons: [] }
    const used = new Set<string>()

    await mkdir(path.join(output, spec.id), { recursive: true })

    for (const icon of spec.icons) {
        const name = slug(icon.name)

        if (used.has(name)) {
            throw new Error(`${spec.id} has two icons called ${icon.name}`)
        }

        used.add(name)
        await writeFile(path.join(output, spec.id, name + '.png'), await renderIcon(sheet, icon))
        category.icons.push({ id: spec.id + '/' + name, name: icon.name })
    }

    manifest.categories.push(category)
    console.info(`${spec.name}: ${category.icons.length} icons`)
}

await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 4) + '\n')

console.info('Done')
