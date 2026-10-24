<script lang="ts">
    import { formatSkillsetScore } from '#lib/format.ts'
    import { SKILLSET_SCORE_MAX, type SkillsetScore } from '#lib/list.ts'
    import GdButton from './GdButton.svelte'

    type Props = {
        // From the best score
        scores: (SkillsetScore & { votes?: number })[]
        // Shown before "Show all"
        initial?: number
    }

    // Skillsets with their scores as bars, like the engagement distribution
    let { scores, initial = 6 }: Props = $props()

    const uid = $props.id()

    let expanded = $state(false)

    const shown = $derived(expanded ? scores : scores.slice(0, initial))
</script>

<ul id="{uid}-scores" class="flex flex-col gap-2.5">
    {#each shown as item (item.skillset.id)}
        <li
            class="flex items-center gap-3"
            title={item.votes === undefined
                ? (item.skillset.description ?? undefined)
                : item.votes === 1
                  ? '1 player voted for it'
                  : `${item.votes} players voted for it`}
        >
            <img src={item.skillset.iconUrl} alt="" class="size-10 shrink-0 object-contain" />
            <div class="min-w-0 flex-1">
                <p class="truncate gd-title text-lg">{item.skillset.name}</p>
                <div
                    class="mt-1 h-3.5 overflow-hidden rounded-full border-2 border-black bg-black/30"
                >
                    <div
                        class="h-full bg-gd-yellow"
                        style:width="{(item.score / SKILLSET_SCORE_MAX) * 100}%"
                    ></div>
                </div>
            </div>
            <span class="w-10 shrink-0 text-right gd-title text-xl">
                {formatSkillsetScore(item.score)}
            </span>
        </li>
    {/each}
</ul>

{#if scores.length > initial}
    <div class="mt-4 flex justify-center">
        <GdButton
            size="sm"
            color="gray"
            {expanded}
            controls="{uid}-scores"
            onclick={() => (expanded = !expanded)}
        >
            {expanded ? 'Show less' : `Show all (${scores.length})`}
        </GdButton>
    </div>
{/if}
