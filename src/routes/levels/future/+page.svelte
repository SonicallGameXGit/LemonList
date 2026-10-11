<script lang="ts">
    import { refreshAll } from '$app/navigation'
    import { resolve } from '$app/paths'
    import type { Level } from '#lib/list.ts'
    import { sendMove } from '#lib/move-level.ts'
    import { sortable } from '#lib/sortable.ts'
    import Alert from '#lib/components/Alert.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import LevelRow from '#lib/components/LevelRow.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    // Moves show up right away, the next load brings the real order back
    let ordered: Level[] = $derived(data.levels)
    let moving = $state(false)
    let moveError: string | null = $state(null)

    const admin = $derived(data.user !== null && data.user.admin)

    async function move(level: Level, place: number) {
        if (moving || place < 1 || place > ordered.length) {
            return
        }

        const from = ordered.indexOf(level)

        if (from === -1 || from === place - 1) {
            return
        }

        const reordered = ordered.filter((other) => other !== level)
        reordered.splice(place - 1, 0, level)

        ordered = reordered.map((other, index) => ({ ...other, futurePosition: index + 1 }))
        moving = true
        moveError = await sendMove(level.id, place)

        await refreshAll()
        moving = false
    }

    function sorted(from: number, to: number) {
        const level = ordered[from]

        if (level !== undefined) {
            move(level, to + 1)
        }
    }
</script>

<svelte:head>
    <title>Future List - LemonList</title>
</svelte:head>

<PageTitle
    title="Future List"
    subtitle="Levels ready to be verified, from the hardest down. Once verified, they get a place on the Main List."
/>

{#if admin}
    <div
        class="gd-dark mb-4 flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left"
    >
        <p class="flex-1">
            Drag levels by the arrows on the left to put the harder ones higher, or focus the arrows
            and use the arrow keys. New levels join at the bottom.
        </p>
        <GdButton href={resolve('/admin/levels/new')} size="sm">Add level</GdButton>
    </div>
    {#if moveError !== null}
        <div class="mb-4">
            <Alert kind="error">{moveError}</Alert>
        </div>
    {/if}
{/if}

{#if ordered.length === 0}
    <div class="gd-dark p-12 text-center">
        <p class="gd-title text-3xl">Nothing here yet</p>
        <p class="mt-2 text-ink-200">No levels are waiting for verification.</p>
    </div>
{:else}
    <GdList
        attach={admin
            ? sortable({ handle: '.drag-handle', disabled: moving, onsort: sorted })
            : undefined}
    >
        {#each ordered as level (level.id)}
            <LevelRow {level} move={admin ? (place) => move(level, place) : undefined} />
        {/each}
    </GdList>
{/if}

<p class="text-center text-lg text-ink-200">The bar shows the verifier's best progress so far.</p>
