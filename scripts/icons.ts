// Extracts the player icons from the game: pnpm icons "<Geometry Dash>/Resources"
// Writes static/gd/icons/<mode>/<id>.png (the frames of an icon repacked into one column, without
// rotated frames), static/gd/icons/manifest.json (frames and the robot/spider idle poses) and the
// garage buttons to static/gd/garage. Run it again after a game update that adds icons
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parsePlist } from 'plist'
import sharp, { type OverlayOptions } from 'sharp'
import {
    IconMode,
    iconModePrefixes,
    iconModes,
    type IconFrame,
    type IconManifest,
    type IconPart,
    type IconSheet,
} from '../src/lib/icons.ts'

const resources = process.argv[2]

if (resources === undefined || resources === '') {
    throw new Error('Pass the Resources folder of Geometry Dash: pnpm icons "<path>/Resources"')
}

const output = path.join(import.meta.dirname, '../static/gd')

// Empty space between frames, so scaled frames don't bleed into each other
const PADDING = 2

type SourceFrame = {
    x: number
    y: number
    width: number
    height: number
    rotated: boolean
    offsetX: number
    offsetY: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// The dictionaries among the values of a dictionary
function records(value: Record<string, unknown>) {
    return Object.values(value).flatMap((item) => (isRecord(item) ? [item] : []))
}

// "{1,2}" or "{{1,2},{3,4}}"
function numbers(value: unknown) {
    if (typeof value !== 'string') {
        throw new Error('Expected a cocos2d point or rect, got ' + String(value))
    }

    return [...value.matchAll(/-?[\d.]+(?:e-?\d+)?/g)].map((match) => Number(match[0]))
}

async function readPlist(file: string) {
    // Some game files start with an empty line, which isn't valid before the XML declaration
    const parsed = parsePlist((await readFile(file, 'utf8')).trimStart())

    if (!isRecord(parsed)) {
        throw new Error(file + ' is not a dictionary')
    }

    return parsed
}

// Frames of a TexturePacker sheet (format 3) by their names
async function readSheet(plistFile: string) {
    const sheet = await readPlist(plistFile)
    const frames = new Map<string, SourceFrame>()

    if (!isRecord(sheet.frames)) {
        throw new Error(plistFile + ' has no frames')
    }

    for (const [name, frame] of Object.entries(sheet.frames)) {
        if (!isRecord(frame)) {
            continue
        }

        const [x, y, width, height] = numbers(frame.textureRect)
        const [offsetX, offsetY] = numbers(frame.spriteOffset)

        frames.set(name, {
            x,
            y,
            width,
            height,
            rotated: frame.textureRotated === true,
            offsetX,
            offsetY,
        })
    }

    return frames
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

async function extractIcon(mode: IconMode, id: number): Promise<IconSheet> {
    const name = iconModePrefixes[mode] + '_' + String(id).padStart(2, '0')
    const frames = await readSheet(path.join(resources, 'icons', name + '-uhd.plist'))
    const texture = await readFile(path.join(resources, 'icons', name + '-uhd.png'))
    const result: Record<string, IconFrame> = {}
    const composites: OverlayOptions[] = []
    let width = 0
    let height = 0

    for (const [frameName, frame] of [...frames].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (!frameName.startsWith(name + '_') || !frameName.endsWith('.png')) {
            continue
        }

        const suffix = frameName.slice(name.length + 1, -'.png'.length)

        composites.push({ input: await extractFrame(texture, frame), left: 0, top: height })
        result[suffix] = {
            y: height,
            width: frame.width,
            height: frame.height,
            offsetX: frame.offsetX,
            offsetY: frame.offsetY,
        }
        width = Math.max(width, frame.width)
        height += frame.height + PADDING
    }

    if (composites.length === 0) {
        throw new Error(name + ' has no frames')
    }

    height -= PADDING

    await mkdir(path.join(output, 'icons', mode), { recursive: true })
    await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
        .composite(composites)
        .png({ palette: true, quality: 100, effort: 10 })
        .toFile(path.join(output, 'icons', mode, id + '.png'))

    return { width, height, frames: result }
}

async function iconIds(mode: IconMode) {
    const pattern = new RegExp(`^${iconModePrefixes[mode]}_(\\d+)-uhd\\.png$`)

    // Id 0 is a placeholder, the garage starts from 1
    return (await readdir(path.join(resources, 'icons')))
        .map((file) => file.match(pattern)?.[1])
        .filter((id) => id !== undefined)
        .map(Number)
        .filter((id) => id > 0)
        .sort((a, b) => a - b)
}

// The idle pose of a robot or a spider from Robot_AnimDesc.plist / Spider_AnimDesc.plist
async function readPose(file: string, animation: string, prefix: string): Promise<IconPart[]> {
    const description = await readPlist(path.join(resources, file))
    const animations = description.animationContainer
    const used = description.usedTextures

    if (!isRecord(animations) || !isRecord(used)) {
        throw new Error(file + ' has no animations')
    }

    const pose = animations[animation]

    if (!isRecord(pose)) {
        throw new Error(file + ' has no ' + animation)
    }

    // Back legs have a custom id (back01, back02...)
    const backTags = new Set(
        records(used)
            .filter((texture) => typeof texture.customID === 'string')
            .filter((texture) => String(texture.customID).startsWith('back'))
            .map((texture) => String(texture.tag)),
    )
    const partPattern = new RegExp(`^${prefix}_01_(\\d+)_001\\.png$`)

    return records(pose)
        .map((sprite) => {
            const part =
                typeof sprite.texture === 'string' ? sprite.texture.match(partPattern) : null

            if (part === null) {
                throw new Error(file + ': unknown texture ' + String(sprite.texture))
            }

            const [x, y] = numbers(sprite.position)
            const [scaleX, scaleY] = numbers(sprite.scale)
            const [flipX, flipY] = numbers(sprite.flipped)

            return {
                z: Number(sprite.zValue),
                part: {
                    part: part[1],
                    x,
                    y,
                    scaleX: flipX === 1 ? -scaleX : scaleX,
                    scaleY: flipY === 1 ? -scaleY : scaleY,
                    rotation: numbers(sprite.rotation)[0],
                    back: backTags.has(String(sprite.tag)),
                },
            }
        })
        .sort((a, b) => a.z - b.z)
        .map((sprite) => sprite.part)
}

// Garage buttons from the game sheet, saved as static/gd/garage/<name>.png
const garageSprites: Record<string, string> = {
    'gj_iconBtn_on_001.png': 'cube-on',
    'gj_iconBtn_off_001.png': 'cube-off',
    'gj_shipBtn_on_001.png': 'ship-on',
    'gj_shipBtn_off_001.png': 'ship-off',
    'gj_ballBtn_on_001.png': 'ball-on',
    'gj_ballBtn_off_001.png': 'ball-off',
    'gj_birdBtn_on_001.png': 'ufo-on',
    'gj_birdBtn_off_001.png': 'ufo-off',
    'gj_dartBtn_on_001.png': 'wave-on',
    'gj_dartBtn_off_001.png': 'wave-off',
    'gj_robotBtn_on_001.png': 'robot-on',
    'gj_robotBtn_off_001.png': 'robot-off',
    'gj_spiderBtn_on_001.png': 'spider-on',
    'gj_spiderBtn_off_001.png': 'spider-off',
    'gj_swingBtn_on_001.png': 'swing-on',
    'gj_swingBtn_off_001.png': 'swing-off',
    'gj_jetpackBtn_on_001.png': 'jetpack-on',
    'gj_jetpackBtn_off_001.png': 'jetpack-off',
    'GJ_select_001.png': 'select',
    'GJ_colorBtn_001.png': 'color',
    'GJ_checkOn_001.png': 'check-on',
    'GJ_checkOff_001.png': 'check-off',
    'GJ_paintBtn_001.png': 'paint',
}

async function extractGarage() {
    const frames = await readSheet(path.join(resources, 'GJ_GameSheet03-uhd.plist'))
    const texture = await readFile(path.join(resources, 'GJ_GameSheet03-uhd.png'))

    await mkdir(path.join(output, 'garage'), { recursive: true })

    for (const [frameName, name] of Object.entries(garageSprites)) {
        const frame = frames.get(frameName)

        if (frame === undefined) {
            throw new Error('GJ_GameSheet03 has no ' + frameName)
        }

        await sharp(await extractFrame(texture, frame))
            .png({ palette: true, quality: 100, effort: 10 })
            .toFile(path.join(output, 'garage', name + '.png'))
    }
}

await rm(path.join(output, 'icons'), { recursive: true, force: true })

const sheets: Partial<Record<IconMode, IconSheet[]>> = {}

for (const mode of iconModes) {
    const ids = await iconIds(mode)

    // The manifest finds icons by their index
    ids.forEach((id, index) => {
        if (id !== index + 1) {
            throw new Error(`${mode} ${index + 1} is missing`)
        }
    })

    sheets[mode] = await Promise.all(ids.map((id) => extractIcon(mode, id)))
    console.info(`${mode}: ${ids.length} icons`)
}

const manifest: IconManifest = {
    sheets: {
        [IconMode.Cube]: sheets[IconMode.Cube] ?? [],
        [IconMode.Ship]: sheets[IconMode.Ship] ?? [],
        [IconMode.Ball]: sheets[IconMode.Ball] ?? [],
        [IconMode.Ufo]: sheets[IconMode.Ufo] ?? [],
        [IconMode.Wave]: sheets[IconMode.Wave] ?? [],
        [IconMode.Robot]: sheets[IconMode.Robot] ?? [],
        [IconMode.Spider]: sheets[IconMode.Spider] ?? [],
        [IconMode.Swing]: sheets[IconMode.Swing] ?? [],
        [IconMode.Jetpack]: sheets[IconMode.Jetpack] ?? [],
    },
    poses: {
        [IconMode.Robot]: await readPose('Robot_AnimDesc.plist', 'Robot_idle_001.png', 'robot'),
        [IconMode.Spider]: await readPose('Spider_AnimDesc.plist', 'Spider_idle_001.png', 'spider'),
    },
}

await writeFile(path.join(output, 'icons', 'manifest.json'), JSON.stringify(manifest))
await extractGarage()

console.info('Done')
