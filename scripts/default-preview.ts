// Regenerates static/gd/preview-default.png, the preview of levels without a preview or a video:
// pnpm exec tsx scripts/default-preview.ts
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { drawScene } from './scene.ts'

const scene = await drawScene({
    background: '#287dff',
    ground: '#0066ff',
    sprite: 'cube-default.png',
    spriteSize: 120,
})

await writeFile(
    path.join(import.meta.dirname, '../static/gd/preview-default.png'),
    await sharp(scene).png({ palette: true, quality: 90 }).toBuffer(),
)
