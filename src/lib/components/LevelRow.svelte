<script lang="ts">
    import type { Snippet } from 'svelte'
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
        // Replace the stats (or the verification progress) under the name
        details?: Snippet
        // Replace the View button
        actions?: Snippet
    }

    // A cell of the level list, render it inside <GdList>
    let { level, move, details, actions }: Props = $props()

    const href = $derived(resolve('/levels/[id]', { id: String(level.id) }))
    const difficulty = $derived(levelDifficultyRef(level))
    // Place on the list the level is on
    const place = $derived(level.position ?? level.futurePosition)
</script>

<!-- The cell lays out by its own width (a container), not the screen's, so it also fits narrow
 columns like the one of the dashboard -->
<li class="@container">
    <!-- Narrow cells stack (preview, then the name, then the stats), wider ones are one row -->
    <div class="level-row px-4 py-4 @xl:px-6">
        <div class="flex items-center gap-4 [grid-area:lead] @xl:gap-6">
            {#if move !== undefined && place !== null}
                {@const position = place}
                <!-- Up and down arrows, like the move buttons of the editor -->
                <button
                    type="button"
                    class="drag-handle -mr-1 flex shrink-0 cursor-grab touch-none flex-col items-center select-none active:cursor-grabbing @xl:-mr-2"
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

            <div class="flex w-16 shrink-0 flex-col items-center gap-1 @xl:w-20">
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
                class="aspect-video w-full rounded-lg border-[3px] border-black object-cover"
            />
        </a>

        <div class="flex min-w-0 flex-col gap-1.5 self-center [grid-area:title] @xl:self-end">
            <a
                {href}
                class="gd-title text-2xl break-words hover:brightness-110 @xl:truncate @xl:text-3xl"
            >
                {level.name}
            </a>
            <!-- Every piece of text is its own gold gradient: nesting the link inside a clipped
                 gradient left a white outline around some names -->
            <p class="text-lg break-words text-gd-yellow @xl:truncate @xl:text-xl">
                <span class="gd-gold">By {level.creator}</span>
                {#if level.verifier !== null}
                    <span class="gd-gold">
                        · {level.position === null ? 'Verifier' : 'Verified by'}
                    </span>
                    <a
                        href={resolve('/players/[username]', {
                            username: level.verifier.username,
                        })}
                        class="gd-gold hover:bg-[linear-gradient(#ffc23d,#fff3a0)]"
                    >
                        {level.verifier.displayUsername}
                    </a>
                {/if}
            </p>
        </div>

        {#if details !== undefined}
            <div class="min-w-0 self-center [grid-area:details] @xl:self-start">
                {@render details()}
            </div>
        {:else if level.position === null}
            <div
                class="flex max-w-sm items-center gap-3 self-center [grid-area:details] @xl:self-start"
            >
                <ProgressBar progress={level.verificationProgress} class="h-5" />
                <span class="gd-title text-lg">{level.verificationProgress}%</span>
            </div>
        {:else}
            <div
                class="flex min-w-0 flex-col gap-1.5 self-center [grid-area:details] @xl:self-start"
            >
                <p class="gd-title text-lg text-gd-blue @xl:truncate">{difficulty.name}</p>
                <p class="flex flex-wrap items-center gap-x-5 gap-y-1 gd-title text-lg">
                    <span class="flex items-center gap-2" title="List points">
                        <Sprite name="diamond" class="h-6" />
                        {formatPoints(level.points)}
                    </span>
                    <span class="flex items-center gap-2" title="Records">
                        <Sprite name="check" class="h-6" />
                        {level.recordsCount}
                    </span>
                    <span class="flex items-center gap-2" title="Engagement">
                        <Sprite name="star" class="h-6" />
                        {level.engagement === null ? '-' : formatEngagement(level.engagement)}
                    </span>
                    {#if level.skillset !== null}
                        <img
                            src={level.skillset.iconUrl}
                            alt="Main skillset: {level.skillset.name}"
                            title="Main skillset: {level.skillset.name}"
                            class="size-7 shrink-0 object-contain"
                        />
                    {/if}
                </p>
            </div>
        {/if}

        <div class="self-end justify-self-end [grid-area:view] @xl:self-center">
            {#if actions !== undefined}
                {@render actions()}
            {:else}
                <GdButton {href} white>View</GdButton>
            {/if}
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

    /* The widths of the cell on 40rem and 48rem wide screens, where it used to change */
    @container (width >= 36rem) {
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

    @container (width >= 44rem) {
        .level-row {
            grid-template-columns: auto auto minmax(0, 1fr) auto;
            grid-template-areas:
                'lead thumb title view'
                'lead thumb details view';
        }

        .thumbnail {
            display: block;
            align-self: center;
            width: 11rem;
        }
    }
</style>
