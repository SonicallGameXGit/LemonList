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
        // Shows the drag handle (admins on the Main or Future List), the arrow keys on it move the
        // level by one place of its list. Drag and drop itself is done by the list
        move?: (position: number) => void
    }

    // A cell of the level list, render it inside <GdList>
    let { level, move }: Props = $props()

    const href = $derived(resolve('/levels/[id]', { id: String(level.id) }))
    const difficulty = $derived(levelDifficultyRef(level))
    // Place on the list the level is on
    const place = $derived(level.position ?? level.futurePosition)
</script>

<li>
    <!-- Phones stack the cell (preview, then the name, then the stats), wider screens put it in one row -->
    <div class="level-row px-4 py-4 sm:px-6">
        <div class="flex items-center gap-4 [grid-area:lead] sm:gap-6">
            {#if move !== undefined && place !== null}
                {@const position = place}
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
                    <img
                        src={sprite('arrow')}
                        alt=""
                        class="h-7 w-auto rotate-90"
                        draggable="false"
                    />
                    <img
                        src={sprite('arrow')}
                        alt=""
                        class="h-7 w-auto -rotate-90"
                        draggable="false"
                    />
                </button>
            {/if}

            <div class="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-20">
                <DifficultyFace {difficulty} class="w-full" />
                <span class="gd-title text-xl text-gd-yellow">
                    {level.position === null ? 'Future' : `#${level.position}`}
                </span>
            </div>
        </div>

        <a {href} class="thumbnail [grid-area:thumb]" tabindex="-1">
            <img
                src={level.thumbnailUrl}
                alt=""
                loading="lazy"
                class="aspect-video w-full rounded-lg border-[3px] border-black object-cover md:w-44"
            />
        </a>

        <div class="flex min-w-0 flex-col gap-1.5 self-center [grid-area:title] sm:self-end">
            <a
                {href}
                class="gd-title text-2xl break-words hover:brightness-110 sm:truncate sm:text-3xl"
            >
                {level.name}
            </a>
            <p class="gd-gold text-lg break-words sm:truncate sm:text-xl">By {level.creator}</p>
        </div>

        {#if level.position === null}
            <div
                class="flex max-w-sm items-center gap-3 self-center [grid-area:details] sm:self-start"
            >
                <ProgressBar progress={level.verificationProgress} class="h-5" />
                <span class="gd-title text-lg">{level.verificationProgress}%</span>
            </div>
        {:else}
            <div
                class="flex min-w-0 flex-col gap-1.5 self-center [grid-area:details] sm:self-start"
            >
                <p class="gd-title text-lg text-gd-blue sm:truncate">{difficulty.name}</p>
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
            </div>
        {/if}

        <div class="self-end justify-self-end [grid-area:view] sm:self-center">
            <GdButton {href} white>View</GdButton>
        </div>
    </div>
</li>

<style>
    .level-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas:
            'thumb thumb thumb'
            'lead title title'
            'details details view';
        gap: 0.75rem 1rem;
    }

    @media (width >= 40rem) {
        .level-row {
            grid-template-columns: auto minmax(0, 1fr) auto;
            grid-template-areas:
                'lead title view'
                'lead details view';
            gap: 0.375rem 1.5rem;
        }

        .thumbnail {
            display: none;
        }
    }

    @media (width >= 48rem) {
        .level-row {
            grid-template-columns: auto auto minmax(0, 1fr) auto;
            grid-template-areas:
                'lead thumb title view'
                'lead thumb details view';
        }

        .thumbnail {
            display: block;
            align-self: center;
        }
    }
</style>
