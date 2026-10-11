<script lang="ts">
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import { onMount, untrack } from 'svelte'
    import { garageSprite, sprite } from '#lib/gd.ts'
    import { kitIconSvg, loadIconManifest } from '#lib/icon-kit.ts'
    import {
        iconColors,
        iconCount,
        iconModeNames,
        iconModes,
        type IconColors,
        type IconKit,
        type IconManifest,
        type IconMode,
    } from '#lib/icons.ts'
    import Alert from '#lib/components/Alert.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdIcon from '#lib/components/GdIcon.svelte'
    import { GD_USERNAME_MAX_LENGTH } from '#lib/list-rules.ts'
    import type { PageProps, SubmitFunction } from './$types'

    let { data, form }: PageProps = $props()

    const uid = $props.id()

    // Icons on a page of the garage: 12 x 3 like the game, 9 x 4 or 6 x 6 on smaller screens
    const PAGE_SIZE = 36

    // Icons to pick are gray, like in the game
    const grayColors: IconColors = { color1: 17, color2: 12, glowColor: 12, glow: false }

    const channels = [
        { channel: 'color1', label: 'Col 1', mark: '1' },
        { channel: 'color2', label: 'Col 2', mark: '2' },
        { channel: 'glowColor', label: 'Glow', mark: 'G' },
    ] as const

    type Channel = (typeof channels)[number]['channel']

    function pageOf(id: number) {
        return Math.floor((id - 1) / PAGE_SIZE)
    }

    // The kit being edited (a copy made once), the saved one stays in data.kit
    const kit: IconKit = $state(untrack(() => structuredClone(data.kit)))
    let tab: IconMode = $state(kit.mode)
    let page = $state(pageOf(kit.icons[kit.mode]))
    let channel: Channel = $state('color1')
    let manifest: IconManifest | null = $state.raw(null)
    let loadFailed = $state(false)
    let saving = $state(false)
    let copying = $state(false)

    const count = $derived(manifest === null ? 0 : iconCount(manifest, tab))
    const pageCount = $derived(Math.max(1, Math.ceil(count / PAGE_SIZE)))
    const pageIds = $derived(
        Array.from(
            { length: Math.max(0, Math.min(PAGE_SIZE, count - page * PAGE_SIZE)) },
            (_, index) => page * PAGE_SIZE + index + 1,
        ),
    )

    // The manifest is big, so it isn't part of the page data. Browsers cache it
    onMount(() => {
        loadIconManifest(fetch)
            .then((loaded) => {
                manifest = loaded
            })
            .catch(() => {
                loadFailed = true
            })
    })

    function iconSvg(mode: IconMode, id: number, colors: IconColors, key: string) {
        if (manifest === null) {
            return null
        }

        return kitIconSvg(manifest, mode, id, colors, uid + '-' + key)
    }

    function showMode(mode: IconMode) {
        tab = mode
        page = pageOf(kit.icons[mode])
    }

    // Like in the game, the last picked icon is the one others see
    function pick(id: number) {
        kit.icons[tab] = id
        kit.mode = tab
    }

    function choose(mode: IconMode) {
        kit.mode = mode
        showMode(mode)
    }

    // Fills the garage with the kit of a game account, saving it is up to the player
    const copyFromGame: SubmitFunction = () => {
        copying = true

        return async ({ result, update }) => {
            if (result.type === 'success' && result.data !== undefined && 'kit' in result.data) {
                Object.assign(kit, result.data.kit)
                showMode(kit.mode)
            }

            await update({ reset: false })
            copying = false
        }
    }

    // Pages wrap around, like in the game
    function turnPage(step: number) {
        page = (page + step + pageCount) % pageCount
    }
</script>

<svelte:head>
    <title>Icon Kit - LemonList</title>
</svelte:head>

<a
    href={resolve('/dashboard/settings')}
    class="mb-6 inline-block gd-press"
    aria-label="Back to the settings"
>
    <img src={sprite('back')} alt="" class="h-16 w-auto" />
</a>

<h1 class="mb-10 gd-gold text-center text-5xl sm:text-6xl">Icon Kit</h1>

{#if loadFailed}
    <div class="mb-8">
        <Alert kind="error">Couldn't load the icons, reload the page to try again.</Alert>
    </div>
{/if}

<!-- The player standing on the floor, like at the top of the garage -->
<section class="flex flex-col items-center">
    {#if data.user !== null}
        <p class="gd-gold text-3xl break-all">{data.user.displayUsername}</p>
    {/if}
    <GdIcon
        svg={iconSvg(kit.mode, kit.icons[kit.mode], kit, 'player')}
        label="Your {iconModeNames[kit.mode]}"
        class="mt-5 size-32"
    />
    <div class="mt-4 floor-line w-full max-w-md"></div>

    <!-- The whole kit, like on game profiles. The chosen icon is the avatar -->
    <ul class="mt-6 flex flex-wrap justify-center gap-2">
        {#each iconModes as mode (mode)}
            <li>
                <button
                    type="button"
                    class={[
                        'flex size-16 gd-press items-center justify-center rounded-xl',
                        kit.mode === mode
                            ? 'bg-black/40 ring-2 ring-gd-yellow'
                            : 'hover:bg-black/20',
                    ]}
                    aria-pressed={kit.mode === mode}
                    title="Show the {iconModeNames[mode]} as your avatar"
                    onclick={() => choose(mode)}
                >
                    <GdIcon
                        svg={iconSvg(mode, kit.icons[mode], kit, 'kit-' + mode)}
                        label={iconModeNames[mode]}
                        class="size-12"
                    />
                </button>
            </li>
        {/each}
    </ul>
</section>

<!-- The kit of a game account, from the Geometry Dash servers -->
<form
    method="POST"
    action="?/fromGame"
    class="gd-box mx-auto mt-10 flex max-w-xl flex-col gap-3 p-4 sm:p-5"
    use:enhance={copyFromGame}
>
    <label for="{uid}-gd-username" class="gd-label">Copy from Geometry Dash</label>
    <div class="flex flex-wrap gap-3">
        <input
            id="{uid}-gd-username"
            type="text"
            class="gd-input min-w-0 flex-1"
            name="gdUsername"
            required
            maxlength={GD_USERNAME_MAX_LENGTH}
            autocomplete="off"
            spellcheck="false"
            placeholder="Your username in the game"
            value={data.user === null ? '' : data.user.displayUsername}
        />
        <GdButton type="submit" size="sm" color="cyan" disabled={copying || manifest === null}>
            {copying ? 'Loading...' : 'Auto-Apply'}
        </GdButton>
    </div>

    {#if form?.action === 'fromGame' && form.error !== null}
        <Alert kind="error">{form.error}</Alert>
    {/if}
    {#if form?.action === 'fromGame' && form.success !== null}
        <Alert kind="success">{form.success}</Alert>
    {/if}

    <p class="text-base text-ink-200">
        Takes your icons, colors and glow from your game profile. Nothing changes until you save.
    </p>
</form>

<!-- Icons of the chosen mode -->
<section class="mt-10" aria-label="{iconModeNames[tab]} icons">
    <div class="flex items-center gap-1 sm:gap-3">
        <button
            type="button"
            class="shrink-0 gd-press"
            aria-label="Previous page"
            disabled={pageCount === 1}
            onclick={() => turnPage(-1)}
        >
            <img src={sprite('arrow')} alt="" class="h-10 w-auto sm:h-14" />
        </button>

        <div class="gd-box min-w-0 flex-1 p-1 sm:p-2">
            {#if manifest === null}
                <p class="py-24 text-center gd-title text-2xl">
                    {loadFailed ? 'No icons' : 'Loading...'}
                </p>
            {:else}
                <ul class="grid grid-cols-6 gap-1 sm:grid-cols-9 lg:grid-cols-12">
                    {#each pageIds as id (id)}
                        <li>
                            <button
                                type="button"
                                class="relative flex aspect-square w-full gd-press items-center justify-center"
                                aria-label="{iconModeNames[tab]} {id}"
                                aria-pressed={kit.icons[tab] === id}
                                onclick={() => pick(id)}
                            >
                                <GdIcon
                                    svg={iconSvg(tab, id, grayColors, 'icon-' + id)}
                                    class="size-4/5"
                                />
                                {#if kit.icons[tab] === id}
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
            {/if}
        </div>

        <button
            type="button"
            class="shrink-0 gd-press"
            aria-label="Next page"
            disabled={pageCount === 1}
            onclick={() => turnPage(1)}
        >
            <img src={sprite('arrow')} alt="" class="h-10 w-auto -scale-x-100 sm:h-14" />
        </button>
    </div>

    {#if manifest !== null}
        <p class="mt-3 text-center gd-title text-xl">
            {iconModeNames[tab]} · page {page + 1} of {pageCount}
        </p>
    {/if}

    <!-- Mode buttons under the icons, like the game -->
    <div class="mt-4 flex flex-wrap justify-center gap-1.5" role="group" aria-label="Icon modes">
        {#each iconModes as mode (mode)}
            <button
                type="button"
                class="gd-press"
                aria-pressed={tab === mode}
                title={iconModeNames[mode]}
                onclick={() => showMode(mode)}
            >
                <img
                    src={garageSprite(`${mode}-${tab === mode ? 'on' : 'off'}`)}
                    alt={iconModeNames[mode]}
                    class="size-12 sm:size-14"
                />
            </button>
        {/each}
    </div>
</section>

<!-- Colors, like the color popup of the game -->
<section class="gd-box mt-12 p-3 sm:p-5" aria-labelledby="{uid}-colors">
    <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        <h2 id="{uid}-colors" class="flex items-center gap-3 gd-title text-3xl">
            <img src={garageSprite('paint')} alt="" class="h-10 w-auto" />
            Colors
        </h2>
        <div class="flex flex-wrap justify-center gap-2" role="group" aria-label="Color to change">
            {#each channels as item (item.channel)}
                <GdButton
                    size="sm"
                    color={channel === item.channel ? 'green' : 'gray'}
                    pressed={channel === item.channel}
                    onclick={() => (channel = item.channel)}
                >
                    {item.label}
                </GdButton>
            {/each}
        </div>
        <button
            type="button"
            class="flex gd-press items-center gap-2 gd-title text-2xl"
            aria-pressed={kit.glow}
            onclick={() => (kit.glow = !kit.glow)}
        >
            <img
                src={garageSprite(kit.glow ? 'check-on' : 'check-off')}
                alt=""
                class="size-10 object-contain"
            />
            Glow
        </button>
    </div>

    <ul class="mt-5 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
        {#each iconColors as color, id (id)}
            <li>
                <button
                    type="button"
                    class="relative block aspect-square w-full gd-press"
                    aria-label="Color {id + 1}"
                    aria-pressed={kit[channel] === id}
                    onclick={() => (kit[channel] = id)}
                >
                    <span class="gd-swatch absolute inset-0" style:--color={color}></span>
                    {#if kit[channel] === id}
                        <img
                            src={garageSprite('select')}
                            alt=""
                            class="absolute -inset-1 size-[calc(100%+0.5rem)] max-w-none"
                        />
                    {/if}
                    <!-- Where the other colors are used -->
                    <span class="absolute right-0.5 bottom-0 flex gd-title text-sm">
                        {#each channels as item (item.channel)}
                            {#if item.channel !== channel && kit[item.channel] === id}
                                <span>{item.mark}</span>
                            {/if}
                        {/each}
                    </span>
                </button>
            </li>
        {/each}
    </ul>
</section>

<form
    method="POST"
    action="?/save"
    class="mt-10 flex flex-col items-center gap-4 text-center"
    use:enhance={() => {
        saving = true

        return async ({ update }) => {
            await update({ reset: false })
            saving = false
        }
    }}
>
    <input type="hidden" name="kit" value={JSON.stringify(kit)} />

    {#if form?.action === 'save' && form.error !== null}
        <Alert kind="error">{form.error}</Alert>
    {/if}
    {#if form?.action === 'save' && form.success !== null}
        <Alert kind="success">{form.success}</Alert>
    {/if}

    <GdButton type="submit" disabled={saving || manifest === null}>
        {saving ? 'Saving...' : 'Save'}
    </GdButton>
    <p class="max-w-xl text-base text-ink-200">
        The highlighted icon of your kit becomes your avatar. An image uploaded in
        <a href={resolve('/dashboard/settings')} class="gd-link">Settings</a> replaces it, your kit stays
        here.
    </p>
</form>
