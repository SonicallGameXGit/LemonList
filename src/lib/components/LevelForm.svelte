<script lang="ts">
    import type { Snippet } from 'svelte'
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import { gameDifficultyRef, naDifficultyRef } from '#lib/gd.ts'
    import {
        lookupLevel,
        searchLevels,
        type LevelLookup,
        type LevelSearchResult,
    } from '#lib/level-lookup.ts'
    import {
        CREATOR_MAX_LENGTH,
        GD_ID_MAX,
        LEVEL_NAME_MAX_LENGTH,
        NOTES_MAX_LENGTH,
        URL_MAX_LENGTH,
    } from '#lib/list-rules.ts'
    import {
        GameDifficulty,
        gameDifficultyNames,
        type DifficultyRef,
        type LevelFormValues,
        type ListDifficulty,
    } from '#lib/list.ts'
    import Alert from './Alert.svelte'
    import GdButton from './GdButton.svelte'

    type Props = {
        // Null for a new level
        level: LevelFormValues | null
        action: string
        // A player suggests a level they beat: a completion video instead of the verification,
        // no verifier and no place on the list
        submission?: boolean
        // Usernames for the verifier suggestions
        players?: string[]
        // Our own meter, from the easiest
        difficulties: ListDifficulty[]
        mainListSize: number
        error: string | null
        // Successful submissions stay on the page and clear the form
        success?: string | null
        submitLabel: string
        // Extra buttons next to the submit one
        actions?: Snippet
    }

    let {
        level,
        action,
        submission = false,
        players = [],
        difficulties,
        mainListSize,
        error,
        success = null,
        submitLabel,
        actions,
    }: Props = $props()

    type DifficultyOption = {
        value: string
        difficulty: DifficultyRef
    }

    const gameOptions: DifficultyOption[] = Object.values(GameDifficulty).map((difficulty) => ({
        value: difficulty,
        difficulty: gameDifficultyRef(difficulty),
    }))

    // N/A first, it's the empty value
    const listOptions: DifficultyOption[] = $derived([
        { value: '', difficulty: naDifficultyRef() },
        ...difficulties.map((difficulty) => ({ value: String(difficulty.id), difficulty })),
    ])

    // Fields the lookup can fill in, they start from the level and go back to it on a reset. The ID
    // field also takes a name to search, picking a found level puts its ID there
    let query = $derived(level === null ? '' : String(level.gdId))
    let name = $derived(level === null ? '' : level.name)
    let creator = $derived(level === null ? '' : level.creator)
    let gameDifficulty: string = $derived(level === null ? '' : level.gameDifficulty)
    let listDifficulty = $derived(
        level === null || level.listDifficultyId === null ? '' : String(level.listDifficultyId),
    )
    let gameThumbnail = $state(false)

    let lookup: LevelLookup | null = $state(null)
    let lookupError: string | null = $state(null)
    let lookingUp = $state(false)
    let saving = $state(false)

    // Levels found by the name, null before a search (and once the name changes)
    let searchResults: LevelSearchResult[] | null = $state(null)
    let searchOpen = $state(false)
    let searchBox: HTMLElement | undefined = $state()
    let queryInput: HTMLInputElement | undefined = $state()

    const isGdId = $derived(/^\d+$/.test(query.trim()))

    // A level from the Future List can also go right below the last one
    const maxPosition = $derived(
        level === null || level.position === null ? mainListSize + 1 : mainListSize,
    )

    // The in-game thumbnail once it's chosen, otherwise the current preview
    const shownThumbnail = $derived.by(() => {
        if (gameThumbnail && lookup !== null && lookup.thumbnailUrl !== null) {
            return lookup.thumbnailUrl
        }

        return level === null ? null : level.thumbnailUrl
    })

    // An ID is looked up, anything else is searched by the name
    function findLevel() {
        const text = query.trim()

        if (text === '') {
            lookupError = 'Enter the level ID or name first'
            return
        }

        if (isGdId) {
            fetchLevel(Number(text))
        } else {
            searchLevel(text)
        }
    }

    async function searchLevel(text: string) {
        lookingUp = true
        lookupError = null

        const result = await searchLevels(text)

        lookingUp = false
        lookupError = result.error
        searchResults = result.levels
        searchOpen = result.levels !== null
    }

    // Keyboard picks go back to the field, taps don't (it would open the keyboard of the phone)
    function pickLevel(found: LevelSearchResult, refocus: boolean) {
        query = String(found.gdId)
        searchResults = null
        searchOpen = false

        if (refocus) {
            queryInput?.focus()
        }

        fetchLevel(found.gdId)
    }

    // Clicks and focus outside the search close the found levels
    function closeSearchOutside(event: Event) {
        if (
            searchOpen &&
            searchBox !== undefined &&
            event.target instanceof Node &&
            !searchBox.contains(event.target)
        ) {
            searchOpen = false
        }
    }

    // The arrow keys go through the found levels, Escape goes back to the field
    function moveInResults(event: KeyboardEvent) {
        if (searchBox === undefined) {
            return
        }

        const buttons = [...searchBox.querySelectorAll<HTMLButtonElement>('[data-search-result]')]
        const index = buttons.findIndex((button) => button === document.activeElement)

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            // Closed found levels open first
            if (!searchOpen && searchResults !== null) {
                event.preventDefault()
                searchOpen = true
                return
            }

            if (buttons.length === 0) {
                return
            }

            event.preventDefault()

            const step = event.key === 'ArrowDown' ? 1 : -1
            const next = index === -1 ? (step === 1 ? 0 : buttons.length - 1) : index + step

            if (next < 0 || next >= buttons.length) {
                queryInput?.focus()
            } else {
                buttons[next].focus()
            }
        }

        if (event.key === 'Escape' && searchOpen) {
            event.preventDefault()
            searchOpen = false
            queryInput?.focus()
        }
    }

    async function fetchLevel(gdId: number) {
        if (!Number.isInteger(gdId) || gdId < 1 || gdId > GD_ID_MAX) {
            lookupError = 'Enter a level ID from 1 to ' + GD_ID_MAX
            return
        }

        lookingUp = true
        lookupError = null

        const result = await lookupLevel(gdId)

        lookingUp = false
        lookup = result.lookup
        lookupError = result.error

        if (result.lookup === null) {
            return
        }

        const found = result.lookup

        if (found.game !== null) {
            name = found.game.name
            gameDifficulty = found.game.gameDifficulty

            if (found.game.creator !== '') {
                creator = found.game.creator
            }
        }

        if (found.listDifficultyId !== null) {
            listDifficulty = String(found.listDifficultyId)
        }

        gameThumbnail = found.thumbnailUrl !== null
    }

    function reset() {
        query = level === null ? '' : String(level.gdId)
        name = level === null ? '' : level.name
        creator = level === null ? '' : level.creator
        gameDifficulty = level === null ? '' : level.gameDifficulty
        listDifficulty =
            level === null || level.listDifficultyId === null ? '' : String(level.listDifficultyId)
        gameThumbnail = false
        lookup = null
        lookupError = null
        searchResults = null
        searchOpen = false
    }
</script>

<svelte:window onpointerdown={closeSearchOutside} onfocusin={closeSearchOutside} />

<form
    method="POST"
    {action}
    enctype="multipart/form-data"
    class="gd-box flex flex-col gap-6 px-3 py-3"
    use:enhance={() => {
        saving = true

        return async ({ result, update }) => {
            // Keeps the fields after a failure. Admin pages redirect on success, submissions
            // stay here with an empty form
            const sent = result.type === 'success'

            await update({ reset: sent })

            if (sent) {
                reset()
            }

            saving = false
        }
    }}
>
    <div class="flex flex-col gap-3">
        <div class="flex items-end gap-3">
            <div class="relative min-w-0 flex-1" bind:this={searchBox}>
                <label class="gd-label">
                    Level ID or name
                    <input
                        type="text"
                        class="gd-input"
                        name="gdId"
                        required
                        pattern="[0-9]+"
                        title="Search the level by its name and pick it, or enter its ID"
                        maxlength={LEVEL_NAME_MAX_LENGTH}
                        autocomplete="off"
                        enterkeyhint={isGdId ? 'go' : 'search'}
                        bind:value={query}
                        bind:this={queryInput}
                        oninput={() => {
                            // The found levels are for the old name
                            searchResults = null
                            searchOpen = false
                        }}
                        onfocus={() => (searchOpen = searchResults !== null)}
                        onkeydown={(event) => {
                            // Enter looks the level up instead of sending the form
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                findLevel()
                            } else {
                                moveInResults(event)
                            }
                        }}
                    />
                </label>
                {#if searchOpen && searchResults !== null}
                    {@render searchList(searchResults)}
                {/if}
            </div>
            <GdButton color="cyan" disabled={lookingUp} onclick={findLevel}>
                {#if lookingUp}
                    {isGdId ? 'Fetching...' : 'Searching...'}
                {:else}
                    {isGdId ? 'Fetch' : 'Search'}
                {/if}
            </GdButton>
        </div>
        <p class="text-base text-ink-200">
            Don't know the ID? Search the level by its name and pick it from the online levels.
            Fetch fills in the name, creator and in-game difficulty from the Geometry Dash servers,
            the LemonList difficulty from the
            <a href="https://gdladder.com" target="_blank" rel="external noopener" class="gd-link"
                >Demon Ladder</a
            > tier like Demons In Between does, and the in-game thumbnail as the preview.
        </p>
        {#if lookupError !== null}
            <Alert kind="error">{lookupError}</Alert>
        {/if}
        {#if lookup !== null}
            {@render lookupReport(lookup)}
        {/if}
    </div>

    <div class="grid gap-5 sm:grid-cols-2">
        <label class="gd-label">
            Name
            <input
                type="text"
                class="gd-input"
                name="name"
                required
                maxlength={LEVEL_NAME_MAX_LENGTH}
                bind:value={name}
            />
        </label>
        <label class="gd-label">
            Creator
            <input
                type="text"
                class="gd-input"
                name="creator"
                required
                maxlength={CREATOR_MAX_LENGTH}
                bind:value={creator}
            />
        </label>
    </div>

    {#if submission}
        <div class="grid gap-5 sm:grid-cols-2">
            <label class="gd-label">
                Completion video
                <input
                    type="url"
                    class="gd-input"
                    name="video"
                    required
                    placeholder="https://youtube.com/..."
                    maxlength={URL_MAX_LENGTH}
                />
            </label>
            <label class="gd-label">
                Raw footage (optional)
                <input
                    type="url"
                    class="gd-input"
                    name="raw"
                    placeholder="https://..."
                    maxlength={URL_MAX_LENGTH}
                />
            </label>
        </div>
    {:else}
        <label class="gd-label">
            Verification video (optional)
            <input
                type="url"
                class="gd-input"
                name="video"
                placeholder="https://youtube.com/..."
                maxlength={URL_MAX_LENGTH}
                value={level?.videoUrl ?? ''}
            />
        </label>
    {/if}

    {@render difficultyPicker(
        'In-game difficulty',
        'gameDifficulty',
        gameOptions,
        gameDifficulty,
        (value) => (gameDifficulty = value),
    )}
    {@render difficultyPicker(
        submission ? 'LemonList difficulty (your guess)' : 'LemonList difficulty',
        'listDifficulty',
        listOptions,
        listDifficulty,
        (value) => (listDifficulty = value),
    )}
    {#if !submission}
        <p class="-mt-4 text-center text-base text-ink-200">
            {difficulties.length === 0
                ? 'There are no LemonList difficulties yet, '
                : 'Missing one? '}
            <a href={resolve('/admin/difficulties')} class="gd-gold">manage the difficulties</a>.
        </p>

        <div class="grid gap-5 sm:grid-cols-2">
            <label class="gd-label">
                Verifier (optional)
                <input
                    type="text"
                    class="gd-input"
                    name="verifier"
                    list="level-form-players"
                    placeholder="Username"
                    autocomplete="off"
                    value={level?.verifier ?? ''}
                />
                <datalist id="level-form-players">
                    {#each players as player (player)}
                        <option value={player}></option>
                    {/each}
                </datalist>
            </label>
            <label class="gd-label">
                Verification progress, %
                <input
                    type="number"
                    class="gd-input"
                    name="verificationProgress"
                    required
                    min="0"
                    max="100"
                    value={level?.verificationProgress ?? 0}
                />
            </label>
        </div>

        <label class="gd-label">
            Place on the Main List
            <input
                type="number"
                class="gd-input"
                name="position"
                min="1"
                max={maxPosition}
                placeholder="Empty keeps it on the Future List"
                value={level?.position ?? ''}
            />
            <span class="font-sans text-base text-ink-200 [-webkit-text-stroke:0]">
                1 is the top, the levels from this place move one down. Only verified levels (100%)
                can be placed. On the Main List you can also drag levels to move them.
            </span>
        </label>
    {/if}

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        {#if shownThumbnail !== null}
            <img
                src={shownThumbnail}
                alt=""
                class="aspect-video w-full rounded-lg border-[3px] border-black object-cover sm:w-56"
            />
        {/if}
        <div class="flex flex-1 flex-col gap-3">
            <label class="gd-label">
                Preview (optional)
                <input
                    type="file"
                    name="preview"
                    accept="image/png, image/jpeg, image/webp"
                    class="gd-input p-2 font-sans text-base [-webkit-text-stroke:0] file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-black file:bg-gd-light file:px-3 file:py-1 file:font-gd file:text-white"
                />
                <span class="font-sans text-base text-ink-200 [-webkit-text-stroke:0]">
                    PNG, JPEG or WebP, up to 8 MB. Without a preview the thumbnail of the YouTube
                    video is shown.
                </span>
            </label>
            {#if lookup !== null && lookup.thumbnailUrl !== null}
                <label class="flex items-center gap-3 text-lg">
                    <input
                        type="checkbox"
                        name="gameThumbnail"
                        class="size-5 accent-gd-lime"
                        bind:checked={gameThumbnail}
                    />
                    Use the in-game thumbnail (an uploaded preview goes first)
                </label>
            {/if}
            {#if level !== null && level.hasPreview}
                <label class="flex items-center gap-3 text-lg">
                    <input type="checkbox" name="removePreview" class="size-5 accent-gd-lime" />
                    Remove the uploaded preview
                </label>
            {/if}
        </div>
    </div>

    {#if submission}
        <label class="gd-label">
            Notes (optional)
            <textarea
                class="gd-input min-h-24 resize-y"
                name="notes"
                maxlength={NOTES_MAX_LENGTH}
                placeholder="Anything the admins should know? Where would you place it?"></textarea>
        </label>
    {/if}

    {#if error !== null}
        <Alert kind="error">{error}</Alert>
    {/if}
    {#if success !== null}
        <Alert kind="success">{success}</Alert>
    {/if}

    <div class="flex flex-wrap items-center justify-center gap-4">
        {@render actions?.()}
        <GdButton type="submit" disabled={saving}>{saving ? 'Saving...' : submitLabel}</GdButton>
    </div>
</form>

<!-- Online levels found by the name, like the search screen of the game -->
{#snippet searchList(found: LevelSearchResult[])}
    <div
        id="level-form-search"
        class="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border-[3px] border-black bg-gd-row shadow-[0_6px_16px_rgb(0_0_0/0.5)]"
    >
        {#if found.length === 0}
            <p class="px-4 py-3 text-lg">No online levels with this name.</p>
        {:else}
            <ul>
                {#each found as result (result.gdId)}
                    <li class="odd:bg-gd-row even:bg-gd-row-alt">
                        <button
                            type="button"
                            class="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left outline-none hover:bg-black/15 focus-visible:bg-black/25"
                            data-search-result
                            onclick={(event) => pickLevel(result, event.detail === 0)}
                            onkeydown={moveInResults}
                        >
                            <img
                                src={gameDifficultyRef(result.gameDifficulty).faceUrl}
                                alt={gameDifficultyNames[result.gameDifficulty]}
                                class="size-10 shrink-0 object-contain"
                            />
                            <span class="flex min-w-0 flex-1 flex-col">
                                <span class="truncate gd-title text-lg">{result.name}</span>
                                <span class="truncate text-base">
                                    {#if result.creator !== ''}
                                        <span class="gd-gold">by {result.creator}</span>
                                    {/if}
                                    <span class="font-sans text-ink-200">ID {result.gdId}</span>
                                </span>
                            </span>
                            {#if result.existing !== null}
                                <span class="shrink-0 gd-title text-sm text-gd-lime"
                                    >On the list</span
                                >
                            {/if}
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
{/snippet}

<!-- What the lookup found, it already filled in the fields -->
{#snippet lookupReport(found: LevelLookup)}
    <div class="gd-dark flex flex-col gap-1.5 px-4 py-3 text-lg leading-snug">
        {#if found.existing !== null}
            <p class="text-gd-yellow">
                This level is on the list already:
                <a href={resolve('/levels/[id]', { id: String(found.existing.id) })} class="gd-link"
                    >{found.existing.name}</a
                >
            </p>
        {/if}
        {#if found.game === null}
            <p>The Geometry Dash servers don't have a level with this ID.</p>
        {:else}
            <p>
                Found <span class="gd-title">{found.game.name}</span>{found.game.creator === ''
                    ? ''
                    : ' by ' + found.game.creator}, {found.game.gameDifficulty === GameDifficulty.NA
                    ? 'not rated'
                    : 'rated ' + gameDifficultyNames[found.game.gameDifficulty]}.
            </p>
        {/if}
        {#if found.tier === null}
            <p>It isn't on the Demon Ladder, choose the LemonList difficulty yourself.</p>
        {:else if found.dibDifficulty === null}
            <p>Demon Ladder tier {Math.round(found.tier)}, too low for Demons In Between.</p>
        {:else if found.listDifficultyId === null}
            <p>
                Demon Ladder tier {Math.round(found.tier)} is {found.dibDifficulty}, but the
                LemonList meter doesn't have it.
            </p>
        {:else}
            <p>Demon Ladder tier {Math.round(found.tier)} is {found.dibDifficulty}.</p>
        {/if}
        <p>
            {found.thumbnailUrl === null
                ? 'Nobody made an in-game thumbnail for it yet.'
                : 'Got the in-game thumbnail for the preview.'}
        </p>
        {#each found.problems as problem (problem)}
            <p class="text-gd-red">{problem} didn't answer, try again later.</p>
        {/each}
    </div>
{/snippet}

<!-- Like the difficulty filter of the search screen, the chosen face is lit -->
{#snippet difficultyPicker(
    label: string,
    name: string,
    options: DifficultyOption[],
    current: string,
    pick: (value: string) => void,
)}
    <fieldset>
        <legend class="mb-2 gd-title text-lg">{label}</legend>
        <div class="flex flex-wrap justify-center gap-x-2 gap-y-3 sm:gap-x-3">
            {#each options as option (option.value)}
                <label
                    class="flex w-20 cursor-pointer flex-col items-center gap-1 brightness-50 transition-[filter] hover:brightness-75 has-checked:brightness-100 has-focus-visible:brightness-100 sm:w-24"
                    title={option.difficulty.name}
                >
                    <input
                        type="radio"
                        {name}
                        value={option.value}
                        class="sr-only"
                        required
                        checked={current === option.value}
                        onchange={() => pick(option.value)}
                    />
                    <img
                        src={option.difficulty.faceUrl}
                        alt=""
                        class="size-14 object-contain sm:size-16"
                    />
                    <span class="text-center gd-title text-sm leading-tight"
                        >{option.difficulty.name}</span
                    >
                </label>
            {/each}
        </div>
    </fieldset>
{/snippet}
