<script lang="ts">
    import { goto, refreshAll } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import type { DifficultyChange, Level } from '#lib/list.ts'
    import { naDifficultyRef } from '#lib/gd.ts'
    import { applyDifficultyChanges, moveDifficultyChanges, sendMove } from '#lib/move-level.ts'
    import { pageHref, pageParam, paginate } from '#lib/pagination.ts'
    import { sortable } from '#lib/sortable.ts'
    import Alert from '#lib/components/Alert.svelte'
    import CollapsibleRows from '#lib/components/CollapsibleRows.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import LevelRow from '#lib/components/LevelRow.svelte'
    import ListLegend from '#lib/components/ListLegend.svelte'
    import MoveDialog from '#lib/components/MoveDialog.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import Pagination from '#lib/components/Pagination.svelte'
    import RequestLevel from '#lib/components/RequestLevel.svelte'
    import SearchBox from '#lib/components/SearchBox.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    const PAGE_SIZE = 25

    let query = $state('')
    // Like the difficulty filter of the search screen, no selection shows everything. Filters by
    // the id of our own difficulty, 'na' are the levels without one
    let difficulty: number | 'na' | null = $state(null)

    // Moves show up right away, the next load brings the real order back
    let ordered: Level[] = $derived(data.levels)
    let moving = $state(false)
    let moveError: string | null = $state(null)
    // A move that would change difficulties waits for the dialog. Raw, a deep proxy would wrap the
    // level and it wouldn't be found in `ordered` anymore
    let pendingMove: { level: Level; position: number; changes: DifficultyChange[] } | null =
        $state.raw(null)

    const admin = $derived(data.user !== null && data.user.admin)
    const filtered = $derived(query.trim() !== '' || difficulty !== null)

    // Only the difficulties the list has, in the order of the meter
    const difficultyOptions = $derived.by(() => {
        const used = new Set(
            data.levels.map((level) =>
                level.listDifficulty === null ? 'na' : level.listDifficulty.id,
            ),
        )
        const options = data.difficulties
            .filter((option) => used.has(option.id))
            .map((option) => ({ value: option.id, difficulty: option }))

        return used.has('na')
            ? [{ value: 'na' as const, difficulty: naDifficultyRef() }, ...options]
            : options
    })

    function matchesDifficulty(level: Level) {
        if (difficulty === null) {
            return true
        }

        if (level.listDifficulty === null) {
            return difficulty === 'na'
        }

        return level.listDifficulty.id === difficulty
    }

    const levels = $derived.by(() => {
        const search = query.trim().toLowerCase()

        return ordered.filter(
            (level) =>
                matchesDifficulty(level) &&
                (search === '' ||
                    level.name.toLowerCase().includes(search) ||
                    level.creator.toLowerCase().includes(search)),
        )
    })

    // Pages of the found levels
    const pages = $derived(paginate(page.url, levels.length, PAGE_SIZE))
    const shown = $derived(levels.slice(pages.offset, pages.offset + PAGE_SIZE))

    // Another search starts from the first page
    function firstPage() {
        if (pageParam(page.url) !== 1) {
            // eslint-disable-next-line svelte/no-navigation-without-resolve -- the current path
            goto(pageHref(page.url, 1), { replace: true, reset: false })
        }
    }

    function search(value: string) {
        query = value
        firstPage()
    }

    function toggleDifficulty(option: number | 'na') {
        difficulty = difficulty === option ? null : option
        firstPage()
    }

    function move(level: Level, position: number) {
        if (
            moving ||
            pendingMove !== null ||
            level.position === null ||
            position < 1 ||
            position > ordered.length
        ) {
            return
        }

        const from = ordered.indexOf(level)

        if (from === -1 || from === position - 1) {
            return
        }

        const changes = moveDifficultyChanges(ordered, level, position - 1)

        if (changes.length === 0) {
            send(level, position, [])
        } else {
            pendingMove = { level, position, changes }
        }
    }

    async function send(level: Level, position: number, changes: DifficultyChange[]) {
        const updated = applyDifficultyChanges(ordered, changes)
        const moved = updated.find((other) => other.id === level.id)

        if (moved === undefined) {
            return
        }

        const reordered = updated.filter((other) => other !== moved)
        reordered.splice(position - 1, 0, moved)

        ordered = reordered.map((other, index) => ({ ...other, position: index + 1 }))
        moving = true
        moveError = await sendMove(level.id, position, changes.length > 0)

        await refreshAll()
        moving = false
    }

    function confirmMove(withDifficulties: boolean) {
        if (pendingMove === null) {
            return
        }

        const { level, position, changes } = pendingMove
        pendingMove = null
        send(level, position, withDifficulties ? changes : [])
    }

    // Indexes of the current page, sorting is off while the list is filtered
    function sorted(from: number, to: number) {
        const level = ordered[pages.offset + from]
        const target = ordered[pages.offset + to]

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
                : 'Drag levels by the arrows on the left to move them, or focus the arrows and use the arrow keys. Edit a level to move it to another page.'}
        </p>
        <GdButton href={resolve('/admin/levels/new')} size="sm">Add level</GdButton>
    </div>
    {#if moveError !== null}
        <div class="mb-4">
            <Alert kind="error">{moveError}</Alert>
        </div>
    {/if}
{:else}
    <RequestLevel />
{/if}

<SearchBox
    label="Search levels"
    placeholder="Search levels..."
    class="mb-4"
    bind:value={() => query, search}
/>

{#if difficultyOptions.length > 1}
    <div class="gd-dark mb-4 p-5">
        <CollapsibleRows
            label="Difficulty"
            class="flex flex-wrap justify-center gap-x-2 gap-y-3 sm:gap-x-3"
        >
            {#each difficultyOptions as option (option.value)}
                <button
                    type="button"
                    class={[
                        'flex w-20 gd-press flex-col items-center gap-1 transition-[filter] sm:w-24',
                        difficulty !== option.value && 'brightness-50 hover:brightness-75',
                    ]}
                    aria-pressed={difficulty === option.value}
                    title={option.difficulty.name}
                    onclick={() => toggleDifficulty(option.value)}
                >
                    <img
                        src={option.difficulty.faceUrl}
                        alt=""
                        class="size-14 object-contain sm:size-16"
                    />
                    <span class="text-center gd-title text-sm leading-tight"
                        >{option.difficulty.name}</span
                    >
                </button>
            {/each}
        </CollapsibleRows>
    </div>
{/if}

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
        id="levels"
        attach={admin
            ? sortable({
                  handle: '.drag-handle',
                  disabled: filtered || moving || pendingMove !== null,
                  onsort: sorted,
              })
            : undefined}
    >
        {#each shown as level (level.id)}
            <LevelRow
                {level}
                move={admin && !filtered ? (position) => move(level, position) : undefined}
            />
        {/each}
    </GdList>

    <Pagination current={pages.page} count={pages.pages} anchor="levels" />
{/if}

<ListLegend />

{#if pendingMove !== null}
    <MoveDialog
        levelName={pendingMove.level.name}
        place={'#' + pendingMove.position}
        changes={pendingMove.changes}
        onchoose={confirmMove}
        oncancel={() => (pendingMove = null)}
    />
{/if}
