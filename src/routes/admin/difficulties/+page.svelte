<script lang="ts">
    import { deserialize, enhance } from '$app/forms'
    import { refreshAll } from '$app/navigation'
    import { sprite } from '#lib/gd.ts'
    import { DIFFICULTY_NAME_MAX_LENGTH } from '#lib/list-rules.ts'
    import type { AdminDifficulty } from '#lib/list.ts'
    import { sortable } from '#lib/sortable.ts'
    import Alert from '#lib/components/Alert.svelte'
    import DifficultyFace from '#lib/components/DifficultyFace.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const faceTypes = 'image/png, image/jpeg, image/webp'

    let adding = $state(false)
    // Id of the difficulty being edited or about to be deleted
    let editing: number | null = $state(null)
    let deleting: number | null = $state(null)

    // Moves show up right away, the next load brings the real order back
    let ordered: AdminDifficulty[] = $derived(data.difficulties)
    let moving = $state(false)
    let moveError: string | null = $state(null)

    async function move(difficulty: AdminDifficulty, position: number) {
        if (moving || position < 1 || position > ordered.length) {
            return
        }

        const from = ordered.indexOf(difficulty)

        if (from === -1 || from === position - 1) {
            return
        }

        const reordered = ordered.filter((other) => other !== difficulty)
        reordered.splice(position - 1, 0, difficulty)

        ordered = reordered.map((other, index) => ({ ...other, position: index + 1 }))
        moving = true
        moveError = null

        const body = new FormData()
        body.set('difficulty', String(difficulty.id))
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
                moveError = typeof error === 'string' ? error : "Couldn't move the difficulty"
            } else if (result.type === 'error') {
                moveError = "Couldn't move the difficulty"
            }
        } catch {
            moveError = "Couldn't reach the server"
        }

        await refreshAll()
        moving = false
    }

    function sorted(from: number, to: number) {
        const difficulty = ordered[from]

        if (difficulty !== undefined) {
            move(difficulty, to + 1)
        }
    }

    function startEdit(difficulty: AdminDifficulty) {
        editing = difficulty.id
        deleting = null
    }

    function startDelete(difficulty: AdminDifficulty) {
        deleting = difficulty.id
        editing = null
    }
</script>

<svelte:head>
    <title>Difficulties - Admin - LemonList</title>
</svelte:head>

<form
    method="POST"
    action="?/create"
    enctype="multipart/form-data"
    class="gd-box flex flex-col gap-5 px-3 py-3"
    use:enhance={() => {
        adding = true

        return async ({ result, update }) => {
            // Keeps the fields after a failure, clears them for the next difficulty
            await update({ reset: result.type === 'success' })
            adding = false
        }
    }}
>
    <h2 class="text-center gd-title text-3xl">New difficulty</h2>
    <div class="grid gap-5 sm:grid-cols-2">
        <label class="gd-label">
            Name
            <input
                type="text"
                class="gd-input"
                name="name"
                required
                maxlength={DIFFICULTY_NAME_MAX_LENGTH}
                placeholder="Easy Demon"
            />
        </label>
        <label class="gd-label">
            Place on the meter
            <input
                type="number"
                class="gd-input"
                name="position"
                min="1"
                max={data.difficulties.length + 1}
                placeholder="Empty puts it at the end"
            />
        </label>
    </div>
    <label class="gd-label">
        Face
        <input
            type="file"
            name="face"
            required
            accept={faceTypes}
            class="gd-input p-2 font-sans text-base [-webkit-text-stroke:0] file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-black file:bg-gd-light file:px-3 file:py-1 file:font-gd file:text-white"
        />
        <span class="font-sans text-base text-ink-200 [-webkit-text-stroke:0]">
            PNG, JPEG or WebP with a transparent background, up to 2 MB. It's scaled down to 256
            pixels.
        </span>
    </label>

    {#if form?.action === 'create'}
        {#if form.error !== null}
            <Alert kind="error">{form.error}</Alert>
        {:else if form.success !== null}
            <Alert kind="success">{form.success}</Alert>
        {/if}
    {/if}

    <div class="flex justify-center">
        <GdButton type="submit" disabled={adding}>{adding ? 'Adding...' : 'Add'}</GdButton>
    </div>
</form>

<div class="gd-dark mt-8 mb-4 p-5 text-center">
    <p>
        From the easiest to the hardest. Drag difficulties by the arrows on the left to move them,
        or focus the arrows and use the arrow keys. Levels of a deleted difficulty become N/A.
    </p>
</div>

{#if moveError !== null}
    <div class="mb-4">
        <Alert kind="error">{moveError}</Alert>
    </div>
{/if}
{#if (form?.action === 'difficulty' || form?.action === 'move') && form.error !== null}
    <div class="mb-4">
        <Alert kind="error">{form.error}</Alert>
    </div>
{/if}

{#if ordered.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">No difficulties yet</p>
        <p class="mt-2 text-ink-200">
            Add them above, or run <code>pnpm difficulties</code> on the server to add the Demons In Between
            set.
        </p>
    </div>
{:else}
    <GdList attach={sortable({ handle: '.drag-handle', disabled: moving, onsort: sorted })}>
        {#each ordered as difficulty (difficulty.id)}
            <li class="flex flex-col gap-4 px-4 py-4 sm:px-6">
                <div class="flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-6">
                    <!-- Up and down arrows, like the move buttons of the editor -->
                    <button
                        type="button"
                        class="drag-handle -mr-1 flex shrink-0 cursor-grab touch-none flex-col items-center active:cursor-grabbing sm:-mr-2"
                        title="Drag to move, or use the arrow keys"
                        aria-label="Move {difficulty.name}, now at #{difficulty.position}"
                        onkeydown={(event) => {
                            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                                event.preventDefault()
                                move(
                                    difficulty,
                                    event.key === 'ArrowUp'
                                        ? difficulty.position - 1
                                        : difficulty.position + 1,
                                )
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

                    <div class="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-20">
                        <DifficultyFace {difficulty} class="w-full" />
                        <span class="gd-title text-xl text-gd-yellow">#{difficulty.position}</span>
                    </div>

                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <p class="truncate gd-title text-2xl sm:text-3xl">{difficulty.name}</p>
                        <p class="text-base text-black/55">
                            {difficulty.levelsCount === 1
                                ? '1 level'
                                : difficulty.levelsCount + ' levels'}
                        </p>
                    </div>

                    {#if editing !== difficulty.id && deleting !== difficulty.id}
                        <div class="flex w-full shrink-0 justify-end gap-3 sm:w-auto">
                            <GdButton size="sm" color="cyan" onclick={() => startEdit(difficulty)}>
                                Edit
                            </GdButton>
                            <GdButton size="sm" color="red" onclick={() => startDelete(difficulty)}>
                                Delete
                            </GdButton>
                        </div>
                    {/if}
                </div>

                {#if editing === difficulty.id}
                    <form
                        method="POST"
                        action="?/save"
                        enctype="multipart/form-data"
                        class="flex flex-wrap items-end justify-end gap-3"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                await update({ reset: false })

                                if (result.type === 'success') {
                                    editing = null
                                }
                            }
                        }}
                    >
                        <input type="hidden" name="difficulty" value={difficulty.id} />
                        <label class="min-w-48 flex-1">
                            <span class="sr-only">Name</span>
                            <input
                                type="text"
                                class="gd-input"
                                name="name"
                                required
                                maxlength={DIFFICULTY_NAME_MAX_LENGTH}
                                value={difficulty.name}
                            />
                        </label>
                        <label class="min-w-48 flex-1">
                            <span class="sr-only">New face (optional)</span>
                            <input
                                type="file"
                                name="face"
                                accept={faceTypes}
                                title="New face (optional)"
                                class="gd-input p-2 font-sans text-base [-webkit-text-stroke:0] file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-black file:bg-gd-light file:px-3 file:py-1 file:font-gd file:text-white"
                            />
                        </label>
                        <GdButton color="gray" size="sm" onclick={() => (editing = null)}>
                            Cancel
                        </GdButton>
                        <GdButton type="submit" size="sm">Save</GdButton>
                    </form>
                {:else if deleting === difficulty.id}
                    <form
                        method="POST"
                        action="?/delete"
                        class="flex flex-wrap items-center justify-end gap-3"
                        use:enhance={() => {
                            return async ({ update }) => {
                                await update()
                                deleting = null
                            }
                        }}
                    >
                        <input type="hidden" name="difficulty" value={difficulty.id} />
                        <span class="gd-title text-lg">
                            {difficulty.levelsCount === 0
                                ? `Delete ${difficulty.name}?`
                                : `Delete ${difficulty.name}? Its levels become N/A.`}
                        </span>
                        <GdButton color="gray" size="sm" onclick={() => (deleting = null)}>
                            Cancel
                        </GdButton>
                        <GdButton type="submit" color="red" size="sm">Delete</GdButton>
                    </form>
                {/if}
            </li>
        {/each}
    </GdList>
{/if}
