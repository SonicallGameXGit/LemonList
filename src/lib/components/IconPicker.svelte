<script lang="ts">
    import { garageSprite, sprite } from '#lib/gd.ts'
    import { kitIconSvg, loadIconManifest } from '#lib/icon-kit.ts'
    import {
        loadPickerManifest,
        parsePickedIcon,
        pickedIconValue,
        pickerSpriteUrl,
        type PickedIcon,
        type PickerManifest,
    } from '#lib/icon-picker.ts'
    import {
        IconMode,
        defaultIconKit,
        iconCount,
        iconModeNames,
        iconModes,
        type IconManifest,
    } from '#lib/icons.ts'
    import Alert from './Alert.svelte'
    import GdButton from './GdButton.svelte'
    import GdIcon from './GdIcon.svelte'

    type Props = {
        // Name of the hidden input with the picked icon (pickedIconValue)
        name: string
        // Empty until an icon is picked
        value?: string
        // Shown until an icon is picked, like the current icon of a skillset
        currentUrl?: string | null
    }

    // Like an emoji picker, with the sprites of the game (static/gd/picker) and every player icon
    let { name, value = $bindable(''), currentUrl = null }: Props = $props()

    const uid = $props.id()

    // Tab of the player icons, the others are the categories of the manifest
    const PLAYER_TAB = 'player'
    const PAGE_SIZE = 48
    // Player icons get the colors new players have in the game
    const colors = defaultIconKit()

    let open = $state(false)
    let pickerManifest = $state.raw<PickerManifest | null>(null)
    let iconManifest = $state.raw<IconManifest | null>(null)
    let loadFailed = $state(false)
    let tab: string | null = $state(null)
    let mode: IconMode = $state(IconMode.Cube)
    let page = $state(0)
    let query = $state('')

    const picked = $derived(parsePickedIcon(value))
    const categories = $derived(pickerManifest === null ? [] : pickerManifest.categories)
    // The first category until another tab is chosen
    const currentTab = $derived(tab ?? categories[0]?.id ?? PLAYER_TAB)
    const category = $derived(categories.find((other) => other.id === currentTab))

    const results = $derived.by(() => {
        const search = query.trim().toLowerCase()

        if (search === '') {
            return null
        }

        return categories.flatMap((other) =>
            other.icons.filter((icon) => icon.name.toLowerCase().includes(search)),
        )
    })

    const count = $derived(iconManifest === null ? 0 : iconCount(iconManifest, mode))
    const pageCount = $derived(Math.max(1, Math.ceil(count / PAGE_SIZE)))
    const pageIds = $derived(
        Array.from(
            { length: Math.max(0, Math.min(PAGE_SIZE, count - page * PAGE_SIZE)) },
            (_, index) => page * PAGE_SIZE + index + 1,
        ),
    )

    const pickedName = $derived.by(() => {
        if (picked === null) {
            return null
        }

        if (picked.kind === 'player') {
            return `${iconModeNames[picked.mode]} ${picked.id}`
        }

        const icon = categories
            .flatMap((other) => other.icons)
            .find((other) => other.id === picked.id)

        return icon === undefined ? null : icon.name
    })

    function playerSvg(iconMode: IconMode, id: number, key: string) {
        if (iconManifest === null) {
            return null
        }

        return kitIconSvg(iconManifest, iconMode, id, colors, uid + '-' + key)
    }

    // Both manifests are cached by the browser and loaded once per tab
    async function load() {
        if (pickerManifest !== null && iconManifest !== null) {
            return
        }

        loadFailed = false

        try {
            const [sprites, icons] = await Promise.all([
                loadPickerManifest(fetch),
                loadIconManifest(fetch),
            ])

            pickerManifest = sprites
            iconManifest = icons
        } catch {
            loadFailed = true
        }
    }

    // Opens on the tab of the picked icon
    function show() {
        open = true
        query = ''

        if (picked?.kind === 'player') {
            tab = PLAYER_TAB
            showMode(picked.mode, picked.id)
        } else if (picked?.kind === 'sprite') {
            tab = picked.id.split('/')[0]
        }

        load()
    }

    function showMode(iconMode: IconMode, id = 1) {
        mode = iconMode
        page = Math.floor((id - 1) / PAGE_SIZE)
    }

    function pick(icon: PickedIcon) {
        value = pickedIconValue(icon)
        open = false
    }

    // Pages wrap around, like in the garage
    function turnPage(step: number) {
        page = (page + step + pageCount) % pageCount
    }
</script>

<div class="flex items-center gap-4">
    <button
        type="button"
        class="flex size-20 shrink-0 gd-press items-center justify-center rounded-2xl bg-black/30 p-2"
        aria-label="Choose an icon"
        onclick={show}
    >
        {#if picked?.kind === 'sprite'}
            <img src={pickerSpriteUrl(picked.id)} alt="" class="size-full object-contain" />
        {:else if picked?.kind === 'player'}
            <GdIcon svg={playerSvg(picked.mode, picked.id, 'picked')} class="size-full" />
        {:else if currentUrl !== null}
            <img src={currentUrl} alt="" class="size-full object-contain" />
        {:else}
            <span class="gd-title text-4xl">?</span>
        {/if}
    </button>
    <div class="flex min-w-0 flex-col items-start gap-2">
        <GdButton size="sm" color="cyan" onclick={show}>
            {picked === null && currentUrl === null ? 'Pick an icon' : 'Change icon'}
        </GdButton>
        {#if pickedName !== null}
            <span class="truncate text-base text-ink-200">{pickedName}</span>
        {/if}
    </div>
</div>
<input type="hidden" {name} {value} />

{#if open}
    <dialog
        class="m-auto w-[min(46rem,calc(100%-1rem))] bg-transparent p-0 text-white backdrop:bg-black/60"
        aria-labelledby="{uid}-title"
        {@attach (dialog) => {
            dialog.showModal()
        }}
        oncancel={(event) => {
            event.preventDefault()
            open = false
        }}
        onclick={(event) => {
            // A click on the backdrop closes it
            if (event.target === event.currentTarget) {
                open = false
            }
        }}
    >
        <div class="gd-box flex flex-col gap-4 px-1 py-2 sm:px-3 sm:py-3">
            <div class="flex items-center justify-between gap-3">
                <h2 id="{uid}-title" class="gd-gold text-3xl">Choose an icon</h2>
                <button
                    type="button"
                    class="shrink-0 gd-press"
                    aria-label="Close"
                    onclick={() => (open = false)}
                >
                    <img src={sprite('close')} alt="" class="h-12 w-auto" />
                </button>
            </div>

            <label>
                <span class="sr-only">Search icons</span>
                <input
                    type="search"
                    class="gd-input"
                    placeholder="Search icons..."
                    bind:value={query}
                    onkeydown={(event) => {
                        // The picker sits inside the form of the page, Enter would send it
                        if (event.key === 'Enter') {
                            event.preventDefault()
                        }
                    }}
                />
            </label>

            {#if loadFailed}
                <Alert kind="error">Couldn't load the icons, close this and try again.</Alert>
            {:else if pickerManifest === null || iconManifest === null}
                <p class="py-16 text-center gd-title text-2xl">Loading...</p>
            {:else}
                {#if results === null}
                    <!-- Category tabs, like the ones of an emoji picker -->
                    <div
                        class="flex flex-wrap justify-center gap-1.5"
                        role="group"
                        aria-label="Categories"
                    >
                        {#each categories as other (other.id)}
                            {@const first = other.icons[0]}
                            <button
                                type="button"
                                class={[
                                    'flex size-12 gd-press items-center justify-center rounded-xl p-1.5',
                                    currentTab === other.id
                                        ? 'bg-black/40 ring-2 ring-gd-yellow'
                                        : 'hover:bg-black/20',
                                ]}
                                title={other.name}
                                aria-label={other.name}
                                aria-pressed={currentTab === other.id}
                                onclick={() => (tab = other.id)}
                            >
                                {#if first !== undefined}
                                    <img
                                        src={pickerSpriteUrl(first.id)}
                                        alt=""
                                        class="size-full object-contain"
                                    />
                                {/if}
                            </button>
                        {/each}
                        <button
                            type="button"
                            class={[
                                'flex size-12 gd-press items-center justify-center rounded-xl p-1',
                                currentTab === PLAYER_TAB
                                    ? 'bg-black/40 ring-2 ring-gd-yellow'
                                    : 'hover:bg-black/20',
                            ]}
                            title="Player icons"
                            aria-label="Player icons"
                            aria-pressed={currentTab === PLAYER_TAB}
                            onclick={() => (tab = PLAYER_TAB)}
                        >
                            <img
                                src={garageSprite('cube-on')}
                                alt=""
                                class="size-full object-contain"
                            />
                        </button>
                    </div>
                {/if}

                <p class="text-center gd-title text-xl">
                    {#if results !== null}
                        {results.length === 1 ? '1 icon found' : `${results.length} icons found`}
                    {:else if currentTab === PLAYER_TAB}
                        {iconModeNames[mode]} · page {page + 1} of {pageCount}
                    {:else if category !== undefined}
                        {category.name}
                    {/if}
                </p>

                {#if results !== null || currentTab !== PLAYER_TAB}
                    <ul
                        class="gd-dark grid max-h-[45dvh] grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1 overflow-y-auto p-2"
                    >
                        {#each results ?? category?.icons ?? [] as icon (icon.id)}
                            {@const selected = picked?.kind === 'sprite' && picked.id === icon.id}
                            <li>
                                <button
                                    type="button"
                                    class="relative flex aspect-square w-full gd-press items-center justify-center rounded-lg hover:bg-black/20"
                                    title={icon.name}
                                    aria-label={icon.name}
                                    aria-pressed={selected}
                                    onclick={() => pick({ kind: 'sprite', id: icon.id })}
                                >
                                    <img
                                        src={pickerSpriteUrl(icon.id)}
                                        alt=""
                                        loading="lazy"
                                        class="size-4/5 object-contain"
                                    />
                                    {#if selected}
                                        <img
                                            src={garageSprite('select')}
                                            alt=""
                                            class="absolute inset-0 size-full"
                                        />
                                    {/if}
                                </button>
                            </li>
                        {:else}
                            <li class="col-span-full py-10 text-center text-ink-200">
                                No icons called like that.
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <div class="flex items-center gap-1 sm:gap-2">
                        <button
                            type="button"
                            class="shrink-0 gd-press"
                            aria-label="Previous page"
                            disabled={pageCount === 1}
                            onclick={() => turnPage(-1)}
                        >
                            <img src={sprite('arrow')} alt="" class="h-10 w-auto" />
                        </button>
                        <ul
                            class="gd-dark grid max-h-[45dvh] min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1 overflow-y-auto p-2"
                        >
                            {#each pageIds as id (id)}
                                {@const selected =
                                    picked?.kind === 'player' &&
                                    picked.mode === mode &&
                                    picked.id === id}
                                <li>
                                    <button
                                        type="button"
                                        class="relative flex aspect-square w-full gd-press items-center justify-center rounded-lg hover:bg-black/20"
                                        aria-label="{iconModeNames[mode]} {id}"
                                        aria-pressed={selected}
                                        onclick={() => pick({ kind: 'player', mode, id })}
                                    >
                                        <GdIcon
                                            svg={playerSvg(mode, id, `${mode}-${id}`)}
                                            class="size-4/5"
                                        />
                                        {#if selected}
                                            <img
                                                src={garageSprite('select')}
                                                alt=""
                                                class="absolute inset-0 size-full"
                                            />
                                        {/if}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                        <button
                            type="button"
                            class="shrink-0 gd-press"
                            aria-label="Next page"
                            disabled={pageCount === 1}
                            onclick={() => turnPage(1)}
                        >
                            <img src={sprite('arrow')} alt="" class="h-10 w-auto -scale-x-100" />
                        </button>
                    </div>

                    <div
                        class="flex flex-wrap justify-center gap-1"
                        role="group"
                        aria-label="Icon modes"
                    >
                        {#each iconModes as other (other)}
                            <button
                                type="button"
                                class="gd-press"
                                aria-pressed={mode === other}
                                title={iconModeNames[other]}
                                onclick={() => showMode(other)}
                            >
                                <img
                                    src={garageSprite(`${other}-${mode === other ? 'on' : 'off'}`)}
                                    alt={iconModeNames[other]}
                                    class="size-11"
                                />
                            </button>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    </dialog>
{/if}
