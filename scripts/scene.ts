// Draws a Geometry Dash scene (background, ground, floor line and a sprite) out of the sprites in
// static/gd, used for the default level preview and the previews of the seed levels
import path from 'node:path'
import sharp from 'sharp'

const WIDTH = 1280
const HEIGHT = 720
const GROUND = 200

const gd = (file: string) => path.join(import.meta.dirname, '../static/gd', file)

type Scene = {
    // Colors of the background and the ground, like the color triggers of the game
    background: string
    ground: string
    // Sprite standing on the ground
    sprite: string
    spriteSize: number
}

async function tinted(input: Buffer, width: number, height: number, color: string) {
    return sharp(input)
        .composite([
            {
                input: { create: { width, height, channels: 3, background: color } },
                blend: 'multiply',
            },
        ])
        .png()
        .toBuffer()
}

export async function drawScene(scene: Scene) {
    const background = await sharp(gd('background.png'))
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'top' })
        .flatten()
        .toBuffer()

    const groundTile = await sharp(gd('ground.png')).resize(GROUND, GROUND).png().toBuffer()
    const groundStrip = await sharp({
        create: { width: WIDTH, height: GROUND, channels: 4, background: '#ffffff' },
    })
        .composite([{ input: groundTile, tile: true, top: 0, left: 0 }])
        .flatten()
        .png()
        .toBuffer()

    const floorLine = await sharp(gd('floor-line.png')).resize(WIDTH, 6, { fit: 'fill' }).toBuffer()
    const sprite = await sharp(gd(scene.sprite))
        .resize(scene.spriteSize, scene.spriteSize, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer()

    return sharp(await tinted(background, WIDTH, HEIGHT, scene.background))
        .composite([
            {
                input: await tinted(groundStrip, WIDTH, GROUND, scene.ground),
                top: HEIGHT - GROUND,
                left: 0,
            },
            { input: floorLine, top: HEIGHT - GROUND - 3, left: 0 },
            {
                input: sprite,
                top: HEIGHT - GROUND - scene.spriteSize,
                left: Math.round((WIDTH - scene.spriteSize) / 2),
            },
        ])
        .png()
        .toBuffer()
}
