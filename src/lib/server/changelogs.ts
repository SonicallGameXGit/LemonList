// Changelogs are Markdown files in /changelogs named by their version: `2.0.md` is a major update,
// `2.1.md`, `2.2.md`... are the minor updates that followed it. The file starts with a front matter
// holding the title and the date
import { marked } from 'marked'
import * as v from 'valibot'
import { parse as parseYaml } from 'yaml'
import type { MajorUpdate, Update } from '#lib/changelogs.ts'

const files = import.meta.glob<string>('/changelogs/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
})

const fileNamePattern = /^(?<major>\d+)\.(?<minor>\d+)\.md$/
const frontMatterPattern = /^---\r?\n(?<meta>[\s\S]*?)\r?\n---\r?\n(?<body>[\s\S]*)$/

const frontMatterSchema = v.object({
    title: v.pipe(v.string(), v.trim(), v.nonEmpty()),
    // Unquoted YAML dates stay strings
    date: v.pipe(v.string(), v.isoDate()),
})

type ParsedUpdate = Update & { major: number; minor: number }

function parseFile(path: string, source: string): ParsedUpdate {
    const name = path.split('/').at(-1) ?? path
    const version = fileNamePattern.exec(name)?.groups

    if (version === undefined || version.major === undefined || version.minor === undefined) {
        throw new Error(`Changelog ${path}: the name must be a version, like 2.0.md or 2.1.md`)
    }

    const parts = frontMatterPattern.exec(source)?.groups

    if (parts === undefined || parts.meta === undefined || parts.body === undefined) {
        throw new Error(`Changelog ${path}: the front matter with the title and date is missing`)
    }

    const meta = v.safeParse(frontMatterSchema, parseYaml(parts.meta))

    if (!meta.success) {
        throw new Error(`Changelog ${path}: ` + v.summarize(meta.issues))
    }

    const major = Number(version.major)
    const minor = Number(version.minor)

    return {
        major,
        minor,
        version: `${major}.${minor}`,
        title: meta.output.title,
        date: new Date(meta.output.date),
        html: marked.parse(parts.body, { async: false }),
    }
}

function toUpdate(update: ParsedUpdate): Update {
    return { version: update.version, title: update.title, date: update.date, html: update.html }
}

function newestFirst(a: ParsedUpdate, b: ParsedUpdate) {
    return b.major - a.major || b.minor - a.minor
}

function buildChangelogs(): MajorUpdate[] {
    const updates = Object.entries(files)
        .map(([path, source]) => parseFile(path, source))
        .sort(newestFirst)
    const majors = updates.filter((update) => update.minor === 0)

    for (const update of updates) {
        if (!majors.some((major) => major.major === update.major)) {
            throw new Error(
                `Changelog ${update.version}: the major update ${update.major}.0 is missing`,
            )
        }
    }

    return majors.map((major) => ({
        ...toUpdate(major),
        minors: updates
            .filter((update) => update.major === major.major && update.minor !== 0)
            .map(toUpdate),
    }))
}

// The files are bundled, so they are read once
const changelogs = buildChangelogs()

// Major updates with their minor ones, the newest first
export function getChangelogs(limit?: number) {
    return limit === undefined ? changelogs : changelogs.slice(0, limit)
}
