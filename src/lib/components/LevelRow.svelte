<script lang="ts">
    import { resolve } from '$app/paths'
    import type { Level } from '#lib/list.ts'
    import { formatEngagement, formatPoints } from '#lib/format.ts'
    import { levelDifficultyRef, sprite } from '#lib/gd.ts'
    import DifficultyFace from './DifficultyFace.svelte'
    import GdButton from './GdButton.svelte'
    import ProgressBar from './ProgressBar.svelte'
    import Sprite from './Sprite.svelte'

    type Props = {
        level: Level
        compact?: boolean
        // Shows the drag handle (admins on the Main List), the arrow keys on it move the level
        // by one place. Drag and drop itself is done by the list
        move?: (position: number) => void
    }

    // A cell of the level list, render it inside <GdList>
    let { level, compact = false, move }: Props = $props()

    const href = $derived(resolve('/levels/[id]', { id: String(level.id) }))
    const difficulty = $derived(levelDifficultyRef(level))
</script>

<li>
    <div class="flex items-center gap-4 px-4 py-4 sm:gap-6 sm:px-6">
        {#if move !== undefined && level.position !== null}
            {@const position = level.position}
            <!-- Up and down arrows, like the move buttons of the editor -->
            <button
                type="button"
                class="drag-handle -mr-1 flex shrink-0 cursor-grab touch-none flex-col items-center active:cursor-grabbing sm:-mr-2"
                title="Drag to move, or use the arrow keys"
                aria-label="Move {level.name}, now at #{position}"
                onkeydown={(event) => {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        event.preventDefault()
                        move(event.key === 'ArrowUp' ? position - 1 : position + 1)
                    }
                }}
            >
                <img src={sprite('arrow')} alt="" class="h-7 w-auto rotate-90" draggable="false" />
                <img src={sprite('arrow')} alt="" class="h-7 w-auto -rotate-90" draggable="false" />
            </button>
        {/if}

        <div class="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-20">
            <DifficultyFace {difficulty} class="w-full" />
            <span class="gd-title text-xl text-gd-yellow">
                {level.position === null ? 'Future' : `#${level.position}`}
            </span>
        </div>

        {#if !compact}
            <a {href} class="hidden shrink-0 md:block" tabindex="-1">
                <img
                    src={level.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    class="aspect-video w-44 rounded-lg border-[3px] border-black object-cover"
                />
            </a>
        {/if}

        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <a {href} class="truncate gd-title text-2xl hover:brightness-110 sm:text-3xl">
                {level.name}
            </a>
            <p class="truncate gd-gold text-lg sm:text-xl">By {level.creator}</p>

            {#if level.position === null}
                <div class="flex max-w-sm items-center gap-3">
                    <ProgressBar progress={level.verificationProgress} class="h-5" />
                    <span class="gd-title text-lg">{level.verificationProgress}%</span>
                </div>
            {:else if !compact}
                <p class="truncate gd-title text-lg text-gd-blue">{difficulty.name}</p>
                <p class="flex flex-wrap items-center gap-x-5 gap-y-1 gd-title text-lg">
                    <span class="flex items-center gap-2" title="List points">
                        <Sprite name="star" class="h-6" />
                        {formatPoints(level.points)}
                    </span>
                    <span class="flex items-center gap-2" title="Records">
                        <Sprite name="check" class="h-6" />
                        {level.recordsCount}
                    </span>
                    <span class="flex items-center gap-2" title="Engagement">
                        <Sprite name="like" class="h-6" />
                        {level.engagement === null ? '-' : formatEngagement(level.engagement)}
                    </span>
                </p>
            {/if}
        </div>

        <GdButton {href} white>View</GdButton>
    </div>
</li>
