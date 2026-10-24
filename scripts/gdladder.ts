// Adds the skillsets of the Demon Ladder (gdladder.com/api/tags) with icons from the game: the
// sprites of the icon picker (static/gd/picker, pnpm picker) and the default player icons
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { count, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as v from 'valibot'
import * as schema from '../src/lib/server/db/schema.ts'
import { MediaKind, writeImage } from '../src/lib/server/media-store.ts'
import { renderIcon } from '../src/lib/server/icon-render.ts'
import { IconMode, defaultIconKit, iconManifestSchema } from '../src/lib/icons.ts'

const { skillset } = schema

// The sprite (static/gd/picker/<id>.png) or the icon 1 of a game mode
type DefaultSkillset = {
    name: string
    description: string
    icon: { sprite: string } | { mode: IconMode }
}

const modeSkillset = (name: string, mode: IconMode): DefaultSkillset => ({
    name,
    description: `This level has ${name === 'UFO' ? name : name.toLowerCase()} sections that make up a large portion of its difficulty.`,
    icon: { mode },
})

export const defaultSkillsets: DefaultSkillset[] = [
    modeSkillset('Cube', IconMode.Cube),
    modeSkillset('Ship', IconMode.Ship),
    modeSkillset('Ball', IconMode.Ball),
    modeSkillset('UFO', IconMode.Ufo),
    modeSkillset('Wave', IconMode.Wave),
    modeSkillset('Robot', IconMode.Robot),
    modeSkillset('Spider', IconMode.Spider),
    modeSkillset('Swing', IconMode.Swing),
    {
        name: 'Nerve Control',
        description:
            'This level tests your consistency and ability to handle stress near the end of the level.',
        icon: { sprite: 'symbols/skull' },
    },
    {
        name: 'Memory',
        description:
            'This level requires remembering a complex path to complete, usually with several fakes, potential routes, and/or visual obscurity.',
        icon: { sprite: 'decorations/question-mark' },
    },
    {
        name: 'Learny',
        description:
            'This level needs a significant time investment in order to understand its complex/unintuitive gameplay.',
        icon: { sprite: 'portals/checkpoint' },
    },
    {
        name: 'Duals',
        description:
            'This level has duals that make up a large portion of its difficulty. Generally refers to asymmetrical duals.',
        icon: { sprite: 'portals/dual-portal' },
    },
    {
        name: 'Chokepoints',
        description:
            'This level contains parts with very condensed difficulty in relation to the rest of the level.',
        icon: { sprite: 'hazards/spike-1' },
    },
    {
        name: 'High CPS',
        description:
            'This level has several sections that require very fast (usually controlled) inputs.',
        icon: { sprite: 'orbs/yellow-orb' },
    },
    {
        name: 'Timings',
        description: 'This level tests your ability to perform many very precise inputs.',
        icon: { sprite: 'symbols/time' },
    },
    {
        name: 'Flow',
        description:
            'This level has many dynamic gameplay transitions throughout the level, forming a "smooth" and "flowy" type of gameplay.',
        icon: { sprite: 'decorations/spiral-2' },
    },
    {
        name: 'Overall',
        description:
            'This level has no specific skillset it tests, instead drawing on multiple skillsets in smaller proportion for its difficulty.',
        icon: { sprite: 'symbols/demon' },
    },
    {
        name: 'Gimmicky',
        description:
            'This level primarily focuses on developing an experimental, unorthodox gameplay type.',
        icon: { sprite: 'decorations/gear-2' },
    },
    {
        name: 'Fast-Paced',
        description:
            'This level has fast-moving sections (3x or 4x speed) for the majority of the level.',
        icon: { sprite: 'portals/very-fast-speed' },
    },
    {
        name: 'Slow-Paced',
        description: 'This level has slower-moving sections (0.5x) for a large part of the level.',
        icon: { sprite: 'portals/slow-speed' },
    },
]

const staticDir = path.join(import.meta.dirname, '../static/gd')

async function iconImage(icon: DefaultSkillset['icon']) {
    if ('sprite' in icon) {
        return readFile(path.join(staticDir, 'picker', icon.sprite + '.png'))
    }

    const manifest = v.parse(
        iconManifestSchema,
        JSON.parse(await readFile(path.join(staticDir, 'icons', 'manifest.json'), 'utf8')),
    )
    const texture = await readFile(path.join(staticDir, 'icons', icon.mode, '1.png'))

    return renderIcon(manifest, icon.mode, 1, defaultIconKit(), texture)
}

// Adds the ones that don't exist yet (by name, ignoring the case) after the existing skillsets.
// Returns the names that were added
export async function addDefaultSkillsets(
    db: BetterSQLite3Database<typeof schema>,
    mediaDir: string,
) {
    const existing = new Set(
        db
            .select({ name: sql<string>`lower(${skillset.name})` })
            .from(skillset)
            .all()
            .map((row) => row.name),
    )
    const missing = defaultSkillsets.filter((row) => !existing.has(row.name.toLowerCase()))
    const icons = await Promise.all(
        missing.map(async (row) =>
            writeImage(mediaDir, MediaKind.SkillsetIcon, await iconImage(row.icon)),
        ),
    )

    db.transaction((tx) => {
        const last = tx.select({ count: count() }).from(skillset).get()?.count ?? 0

        missing.forEach((row, index) => {
            const icon = icons[index]

            if (icon === undefined) {
                throw new Error('Missing icon of ' + row.name)
            }

            tx.insert(skillset)
                .values({
                    name: row.name,
                    description: row.description,
                    icon,
                    position: last + index + 1,
                })
                .run()
        })
    })

    return missing.map((row) => row.name)
}
