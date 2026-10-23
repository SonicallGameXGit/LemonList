<script lang="ts">
    import { enhance } from '$app/forms'
    import { refreshAll } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import { ADMIN_ROLE, USER_ROLE } from '#lib/auth-rules.ts'
    import { BAN_REASON_MAX_LENGTH } from '#lib/list-rules.ts'
    import { PlayerFilter, type AdminPlayer } from '#lib/list.ts'
    import { formatDate } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import SearchBox from '#lib/components/SearchBox.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const filters = [
        { filter: PlayerFilter.Unverified, label: 'To verify' },
        { filter: PlayerFilter.All, label: 'All' },
        { filter: PlayerFilter.Admins, label: 'Admins' },
        { filter: PlayerFilter.Banned, label: 'Banned' },
    ]

    function filterUrl(filter: PlayerFilter) {
        const query: Record<string, string> =
            data.search === '' ? { filter } : { filter, q: data.search }

        return resolve('/admin/players') + '?' + new URLSearchParams(query).toString()
    }

    // Keeps the current tab and search, a relative "?/action" would drop the query
    const actionUrl = (action: string) =>
        '?' +
        new URLSearchParams({ filter: data.filter, q: data.search }).toString() +
        '&/' +
        action

    // Roles and bans go through Better Auth's admin plugin, it also signs banned players out
    let busy: string | null = $state(null)
    let authError: string | null = $state(null)
    let banning: string | null = $state(null)
    let banReason = $state('')

    async function run(
        player: AdminPlayer,
        request: () => Promise<{ error: { message?: string; statusText?: string } | null }>,
    ) {
        busy = player.id
        authError = null

        const result = await request()

        authError = errorMessage(result.error)
        busy = null

        if (result.error === null) {
            banning = null
            banReason = ''
            await refreshAll()
        }
    }

    function setAdmin(player: AdminPlayer, admin: boolean) {
        return run(player, () =>
            authClient.admin.setRole({ userId: player.id, role: admin ? ADMIN_ROLE : USER_ROLE }),
        )
    }

    function ban(event: SubmitEvent, player: AdminPlayer) {
        event.preventDefault()

        const reason = banReason.trim()

        return run(player, () =>
            authClient.admin.banUser({
                userId: player.id,
                banReason: reason === '' ? undefined : reason,
            }),
        )
    }

    function unban(player: AdminPlayer) {
        return run(player, () => authClient.admin.unbanUser({ userId: player.id }))
    }

    function startBan(player: AdminPlayer) {
        banning = player.id
        banReason = ''
    }
</script>

<svelte:head>
    <title>Players - Admin - LemonList</title>
</svelte:head>

<SearchBox
    label="Search players"
    placeholder="Username or email..."
    name="q"
    value={data.search}
    class="mb-6"
>
    <input type="hidden" name="filter" value={data.filter} />
</SearchBox>

<nav class="mb-6 flex flex-wrap justify-center gap-x-8 gap-y-3" aria-label="Players filter">
    {#each filters as tab (tab.filter)}
        <!-- eslint-disable svelte/no-navigation-without-resolve -- resolved in filterUrl -->
        <a
            href={filterUrl(tab.filter)}
            class={[
                'gd-title text-2xl transition-[filter]',
                data.filter === tab.filter ? 'text-gd-yellow' : 'hover:brightness-90',
            ]}
            aria-current={data.filter === tab.filter ? 'page' : undefined}
        >
            {tab.label}
        </a>
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {/each}
</nav>

{#if form?.action === 'player' && form.error !== null}
    <Alert kind="error">{form.error}</Alert>
{/if}
{#if authError !== null}
    <Alert kind="error">{authError}</Alert>
{/if}

{#if data.players.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">Nobody here</p>
        <p class="mt-2 text-ink-200">
            {data.filter === PlayerFilter.Unverified && data.search === ''
                ? 'Every player is verified.'
                : 'No players match.'}
        </p>
    </div>
{:else}
    <GdList>
        {#each data.players as player (player.id)}
            {@const self = data.user !== null && player.id === data.user.id}
            <li class="flex flex-col gap-4 px-4 py-4 sm:px-6">
                <div class="flex flex-wrap items-center gap-4">
                    <Avatar src={player.avatarUrl} name={player.displayUsername} class="size-14" />
                    <div class="min-w-0 flex-1">
                        <p class="flex flex-wrap items-center gap-x-3">
                            {#if player.username !== null && !player.banned}
                                <a
                                    href={resolve('/players/[username]', {
                                        username: player.username,
                                    })}
                                    class="truncate gd-gold text-2xl"
                                >
                                    {player.displayUsername}
                                </a>
                            {:else}
                                <span class="truncate gd-gold text-2xl">
                                    {player.displayUsername}
                                </span>
                            {/if}
                            {#if player.accountVerified}
                                <Sprite name="check" class="h-6" label="Verified account" />
                            {/if}
                            {#if player.admin}
                                <span class="gd-title text-lg text-gd-blue">Admin</span>
                            {/if}
                            {#if player.banned}
                                <span class="gd-title text-lg text-gd-red">Banned</span>
                            {/if}
                        </p>
                        <p class="truncate text-base">
                            {player.email}
                            {#if !player.emailVerified}
                                <span class="text-black/55">(email not verified)</span>
                            {/if}
                        </p>
                        <p class="text-base text-black/55">
                            Joined {formatDate(player.createdAt)}
                        </p>
                        {#if player.banned && player.banReason !== null}
                            <p class="text-base">Ban reason: {player.banReason}</p>
                        {/if}
                    </div>
                </div>

                {#if banning === player.id}
                    <form
                        class="flex flex-wrap items-center justify-end gap-3"
                        onsubmit={(event) => ban(event, player)}
                    >
                        <label class="min-w-48 flex-1">
                            <span class="sr-only">Ban reason</span>
                            <input
                                type="text"
                                class="gd-input"
                                placeholder="Reason (optional)"
                                maxlength={BAN_REASON_MAX_LENGTH}
                                bind:value={banReason}
                            />
                        </label>
                        <GdButton color="gray" size="sm" onclick={() => (banning = null)}>
                            Cancel
                        </GdButton>
                        <GdButton type="submit" color="red" size="sm" disabled={busy !== null}>
                            Ban
                        </GdButton>
                    </form>
                {:else}
                    <form
                        method="POST"
                        action={actionUrl('verify')}
                        class="flex flex-wrap items-center justify-end gap-3"
                        use:enhance
                    >
                        <input type="hidden" name="player" value={player.id} />

                        {#if player.hasAvatar}
                            <GdButton
                                type="submit"
                                formaction={actionUrl('removeAvatar')}
                                color="gray"
                                size="sm"
                            >
                                Remove avatar
                            </GdButton>
                        {/if}
                        {#if !self}
                            {#if player.banned}
                                <GdButton
                                    color="slate"
                                    size="sm"
                                    disabled={busy !== null}
                                    onclick={() => unban(player)}
                                >
                                    Unban
                                </GdButton>
                            {:else}
                                <GdButton
                                    color="red"
                                    size="sm"
                                    disabled={busy !== null}
                                    onclick={() => startBan(player)}
                                >
                                    Ban
                                </GdButton>
                            {/if}
                            <GdButton
                                color={player.admin ? 'gray' : 'pink'}
                                size="sm"
                                disabled={busy !== null}
                                onclick={() => setAdmin(player, !player.admin)}
                            >
                                {player.admin ? 'Remove admin' : 'Make admin'}
                            </GdButton>
                        {/if}
                        {#if player.accountVerified}
                            <GdButton type="submit" color="gray" size="sm">Unverify</GdButton>
                        {:else}
                            <GdButton type="submit" name="verified" value="on" size="sm">
                                Verify
                            </GdButton>
                        {/if}
                    </form>
                {/if}
            </li>
        {/each}
    </GdList>

    {#if data.players.length === data.limit}
        <p class="text-center text-ink-200">
            Showing the newest {data.limit} players, search to find others.
        </p>
    {/if}
{/if}
