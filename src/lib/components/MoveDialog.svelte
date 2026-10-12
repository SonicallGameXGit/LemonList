<script lang="ts">
    import { sprite } from '#lib/gd.ts'
    import type { DifficultyChange } from '#lib/list.ts'
    import DifficultyFace from './DifficultyFace.svelte'
    import GdButton from './GdButton.svelte'

    type Props = {
        levelName: string
        // Where the level goes, like "#3"
        place: string
        // What the move would change, from #lib/move-level.ts
        changes: DifficultyChange[]
        onchoose: (withDifficulties: boolean) => void
        oncancel: () => void
    }

    // Asks before a move takes our difficulties along. Render it only while there is a move to
    // confirm, it opens as a modal right away
    let { levelName, place, changes, onchoose, oncancel }: Props = $props()
</script>

<dialog
    class="m-auto w-[min(40rem,calc(100%-2rem))] bg-transparent p-0 text-white backdrop:bg-black/60"
    aria-labelledby="move-dialog-title"
    {@attach (dialog) => {
        dialog.showModal()
    }}
    oncancel={(event) => {
        // Escape closes it through the page state, like the Cancel button
        event.preventDefault()
        oncancel()
    }}
>
    <div class="gd-box flex flex-col gap-5 px-3 py-3">
        <h2 id="move-dialog-title" class="gd-gold text-center text-3xl">Change difficulties?</h2>
        <p class="text-center text-lg">
            Moving <span class="gd-title">{levelName}</span> to
            <span class="gd-title text-gd-yellow">{place}</span>
            can take the difficulties along: the faces stay at their places and the levels move through
            them. {changes.length === 1
                ? 'This changes 1 level'
                : `This changes ${changes.length} levels`}:
        </p>

        <ul class="gd-dark flex max-h-[45dvh] flex-col gap-1 overflow-y-auto p-3">
            {#each changes as change (change.levelId)}
                <li class="flex items-center gap-3 sm:gap-4">
                    <span class="min-w-0 flex-1 truncate gd-title text-xl">{change.levelName}</span>
                    <DifficultyFace difficulty={change.from} class="w-11" />
                    <img src={sprite('arrow')} alt="to" class="h-6 w-auto rotate-180" />
                    <DifficultyFace difficulty={change.to} class="w-11" />
                    <span class="hidden w-40 text-base leading-tight sm:block">
                        {change.from.name}<br /><span class="text-gd-lime">{change.to.name}</span>
                    </span>
                </li>
            {/each}
        </ul>

        <div class="flex flex-wrap items-center justify-center gap-3">
            <GdButton color="gray" size="sm" onclick={oncancel}>Cancel</GdButton>
            <GdButton color="cyan" size="sm" onclick={() => onchoose(false)}>Move only</GdButton>
            <GdButton size="sm" onclick={() => onchoose(true)}>Move and change</GdButton>
        </div>
    </div>
</dialog>
