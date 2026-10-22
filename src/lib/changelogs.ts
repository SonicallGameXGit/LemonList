// Changelogs from /changelogs, read by src/lib/server/changelogs.ts
export type Update = {
    version: string
    title: string
    date: Date
    // Rendered from our own Markdown files
    html: string
}

export type MajorUpdate = Update & {
    // The minor updates that followed it, the newest first
    minors: Update[]
}
