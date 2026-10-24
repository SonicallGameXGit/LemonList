<script lang="ts">
    import { resolve } from '$app/paths'
    import { formatPoints } from '#lib/format.ts'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import SearchBox from '#lib/components/SearchBox.svelte'
    import SkillsetTag from '#lib/components/SkillsetTag.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    let query = $state('')

    const entries = $derived.by(() => {
        const search = query.trim().toLowerCase()

        return data.leaderboard.filter(
            (entry) => search === '' || entry.player.username.includes(search),
        )
    })
</script>

<svelte:head>
    <title>Players - LemonList</title>
</svelte:head>

<PageTitle title="Leaderboard" subtitle="Players ranked by the points of the demons they beat." />

<SearchBox label="Search players" placeholder="Search players..." class="mb-4" bind:value={query} />

{#if data.leaderboard.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">Nothing here yet</p>
        <p class="mt-2 text-ink-200">Nobody has joined the list yet.</p>
    </div>
{:else if entries.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">No players found</p>
    </div>
{:else}
    <GdList>
        {#each entries as entry (entry.player.username)}
            <li class="flex items-center gap-4 px-4 py-4 sm:gap-6 sm:px-6">
                <span class="w-12 shrink-0 gd-gold text-center text-3xl sm:w-14 sm:text-4xl">
                    {entry.rank}
                </span>
                <Avatar
                    src={entry.player.avatarUrl}
                    name={entry.player.displayUsername}
                    class="size-14"
                />
                <div class="min-w-0 flex-1">
                    <a
                        href={resolve('/players/[username]', { username: entry.player.username })}
                        class="flex items-center gap-2 gd-title text-2xl sm:text-3xl"
                    >
                        <span class="truncate">{entry.player.displayUsername}</span>
                        {#if entry.accountVerified}
                            <Sprite name="check" class="h-7" label="Verified account" />
                        {/if}
                        <SkillsetTag skillset={entry.skillset} compact class="size-8" />
                    </a>
                    <p class="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 gd-title text-lg">
                        <span class="flex items-center gap-2" title="Points">
                            {formatPoints(entry.points)}
                            <Sprite name="diamond" class="h-6" />
                        </span>
                        <span class="flex items-center gap-2" title="Completions">
                            {entry.completions}
                            <Sprite name="demon" class="h-6" />
                        </span>
                        {#if entry.hardest !== null}
                            <span class="hidden truncate text-gd-yellow sm:inline">
                                Hardest: {entry.hardest.name}
                            </span>
                        {/if}
                    </p>
                </div>
            </li>
        {/each}
    </GdList>
{/if}

<p class="flex items-center justify-center gap-2 text-lg text-ink-200">
    <Sprite name="check" class="h-6" /> means the account is verified by admins.
</p>
