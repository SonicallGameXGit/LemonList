<script lang="ts">
    import { Difficulty, difficultyNames } from '#lib/list.ts'
    import { difficultyFilterSprite } from '#lib/gd.ts'
    import GdList from '#lib/components/GdList.svelte'
    import LevelRow from '#lib/components/LevelRow.svelte'
    import ListLegend from '#lib/components/ListLegend.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    let query = $state('')
    // Like the difficulty filter of the search screen, no selection shows everything
    let difficulty: Difficulty | null = $state(null)

    const levels = $derived.by(() => {
        const search = query.trim().toLowerCase()

        return data.levels.filter(
            (level) =>
                (difficulty === null || level.listDifficulty === difficulty) &&
                (search === '' ||
                    level.name.toLowerCase().includes(search) ||
                    level.creator.toLowerCase().includes(search)),
        )
    })

    function toggleDifficulty(option: Difficulty) {
        difficulty = difficulty === option ? null : option
    }
</script>

<svelte:head>
    <title>Main List - LemonList</title>
</svelte:head>

<PageTitle title="Main List" subtitle="Verified demons, from the hardest down to the Easy ones." />

<div class="gd-dark mb-4 flex flex-col gap-5 p-5">
    <label class="flex items-center gap-3">
        <Sprite name="magnify" class="h-14" />
        <span class="sr-only">Search levels</span>
        <input type="search" class="gd-input" placeholder="Search levels..." bind:value={query} />
    </label>
    <div class="flex flex-wrap justify-center gap-3 sm:gap-6" role="group" aria-label="Difficulty">
        {#each Object.values(Difficulty) as option (option)}
            <button
                type="button"
                class={[
                    'flex w-20 gd-press flex-col items-center gap-1 transition-[filter] sm:w-24',
                    difficulty !== option && 'brightness-50 hover:brightness-75',
                ]}
                aria-pressed={difficulty === option}
                title={difficultyNames[option]}
                onclick={() => toggleDifficulty(option)}
            >
                <img src={difficultyFilterSprite(option)} alt="" class="w-full" />
                <span class="gd-title text-sm">{difficultyNames[option].replace(' Demon', '')}</span
                >
            </button>
        {/each}
    </div>
</div>

{#if data.levels.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">Nothing here yet</p>
        <p class="mt-2 text-ink-200">No levels are placed on the list yet.</p>
    </div>
{:else if levels.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">No levels found</p>
        <p class="mt-2 text-ink-200">Try another name or difficulty.</p>
    </div>
{:else}
    <GdList>
        {#each levels as level (level.id)}
            <LevelRow {level} />
        {/each}
    </GdList>
{/if}

<ListLegend />
