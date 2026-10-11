<script lang="ts">
    import { deserialize } from '$app/forms'
    import { refreshAll } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { Difficulty, difficultyNames, type Level } from '#lib/list.ts'
    import { difficultyFilterSprite } from '#lib/gd.ts'
    import { sortable } from '#lib/sortable.ts'
    import Alert from '#lib/components/Alert.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
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

    // Moves show up right away, the next load brings the real order back
    let ordered: Level[] = $derived(data.levels)
    let moving = $state(false)
    let moveError: string | null = $state(null)

    const admin = $derived(data.user !== null && data.user.admin)
    const filtered = $derived(query.trim() !== '' || difficulty !== null)

    const levels = $derived.by(() => {
        const search = query.trim().toLowerCase()

        return ordered.filter(
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

    async function move(level: Level, position: number) {
        if (moving || level.position === null || position < 1 || position > ordered.length) {
            return
        }

        const from = ordered.indexOf(level)
        const reordered = ordered.filter((other) => other !== level)
        reordered.splice(position - 1, 0, level)

        if (from === -1 || from === position - 1) {
            return
        }

        ordered = reordered.map((other, index) => ({ ...other, position: index + 1 }))
        moving = true
        moveError = null

        const body = new FormData()
        body.set('level', String(level.id))
        body.set('position', String(position))

        try {
            const response = await fetch('?/move', {
                method: 'POST',
                body,
                headers: { 'x-sveltekit-action': 'true' },
            })
            const result = deserialize(await response.text())

            if (result.type === 'failure') {
                const error = result.data?.error
                moveError = typeof error === 'string' ? error : "Couldn't move the level"
            } else if (result.type === 'error') {
                moveError = "Couldn't move the level"
            }
        } catch {
            moveError = "Couldn't reach the server"
        }

        await refreshAll()
        moving = false
    }

    // Indexes of the whole list, sorting is off while it's filtered
    function sorted(from: number, to: number) {
        const level = ordered[from]
        const target = ordered[to]

        if (level !== undefined && target !== undefined && target.position !== null) {
            move(level, target.position)
        }
    }
</script>

<svelte:head>
    <title>Main List - LemonList</title>
</svelte:head>

<PageTitle title="Main List" subtitle="Verified demons, from the hardest down to the Easy ones." />

{#if admin}
    <div
        class="gd-dark mb-4 flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left"
    >
        <p class="flex-1">
            {filtered
                ? 'Clear the search and the difficulty filter to move levels.'
                : 'Drag levels by the arrows on the left to move them, or focus the arrows and use the arrow keys.'}
        </p>
        <GdButton href={resolve('/admin/levels/new')} size="sm">Add level</GdButton>
    </div>
    {#if moveError !== null}
        <div class="mb-4">
            <Alert kind="error">{moveError}</Alert>
        </div>
    {/if}
{/if}

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
    <GdList
        attach={admin
            ? sortable({ handle: '.drag-handle', disabled: filtered || moving, onsort: sorted })
            : undefined}
    >
        {#each levels as level (level.id)}
            <LevelRow
                {level}
                move={admin && !filtered ? (position) => move(level, position) : undefined}
            />
        {/each}
    </GdList>
{/if}

<ListLegend />
