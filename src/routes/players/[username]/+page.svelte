<script lang="ts">
    import { resolve } from '$app/paths'
    import { sprite } from '#lib/gd.ts'
    import { formatDate, formatPoints } from '#lib/format.ts'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdIcon from '#lib/components/GdIcon.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    const player = $derived(data.player)
    const profile = $derived(data.profile)
</script>

<svelte:head>
    <title>{player.displayUsername} - LemonList</title>
</svelte:head>

<header class="flex flex-col items-center text-center">
    <Avatar src={player.avatarUrl} name={player.displayUsername} class="size-28" />
    <h1 class="mt-5 flex items-center gap-3 gd-title text-5xl break-all sm:text-7xl">
        {player.displayUsername}
        {#if profile.accountVerified}
            <Sprite name="check" class="h-10" label="Verified account" />
        {/if}
    </h1>
    <p class="mt-3 text-lg text-ink-200">
        @{player.username} · member since {formatDate(player.createdAt)}
    </p>

    <!-- The icon kit, like the row of icons on game profiles -->
    {#if data.icons.length > 0}
        <ul class="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-3" aria-label="Icon kit">
            {#each data.icons as icon (icon.name)}
                <li>
                    <GdIcon svg={icon.svg} label={icon.name} class="size-12 sm:size-14" />
                </li>
            {/each}
        </ul>
    {/if}

    <!-- Stats row, like on game profiles -->
    <dl class="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-4 gd-title text-3xl">
        <div class="flex items-center gap-2.5">
            <dd>#{profile.rank}</dd>
            <dt><Sprite name="trophy" class="h-10" label="Rank" /></dt>
        </div>
        <div class="flex items-center gap-2.5">
            <dd>{formatPoints(profile.points)}</dd>
            <dt><Sprite name="star" class="h-9" label="Points" /></dt>
        </div>
        <div class="flex items-center gap-2.5">
            <dd>{profile.completions}</dd>
            <dt><Sprite name="demon" class="h-10" label="Completions" /></dt>
        </div>
        <div class="flex items-center gap-2.5">
            <dd>{profile.verified.length}</dd>
            <dt><Sprite name="check" class="h-9" label="Verified levels" /></dt>
        </div>
    </dl>

    {#if profile.hardest !== null}
        <p class="mt-6 flex items-center gap-2 text-lg">
            Hardest demon:
            <a
                href={resolve('/levels/[id]', { id: String(profile.hardest.id) })}
                class="gd-gold text-2xl"
            >
                {profile.hardest.name}
            </a>
        </p>
    {/if}
</header>

<div class="mt-14 grid gap-14 lg:grid-cols-[1fr_22rem]">
    <section>
        <h2 class="text-center gd-title text-4xl">Completions</h2>
        {#if profile.completed.length === 0}
            <div class="gd-dark mt-5 p-8 text-center text-ink-200">No completions yet.</div>
        {:else}
            <GdList>
                {#each profile.completed as record (record.id)}
                    {@const href = resolve('/levels/[id]', { id: String(record.level.id) })}
                    <!-- Phones show the preview first and let the name wrap -->
                    <li class="flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-3">
                        <a {href} class="sm:hidden" tabindex="-1">
                            <img
                                src={record.level.thumbnailUrl}
                                alt=""
                                loading="lazy"
                                class="aspect-video w-full rounded-lg border-[3px] border-black object-cover"
                            />
                        </a>
                        <div class="flex items-center gap-4">
                            <span class="w-14 shrink-0 text-center gd-title text-xl text-gd-yellow">
                                #{record.level.position}
                            </span>
                            <div
                                class="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
                            >
                                <a
                                    {href}
                                    class="min-w-0 gd-title text-2xl break-words sm:flex-1 sm:truncate"
                                >
                                    {record.level.name}
                                </a>
                                <span class="text-base text-black/55">
                                    {formatDate(record.submittedAt)}
                                </span>
                            </div>
                            <a
                                href={record.videoUrl}
                                target="_blank"
                                rel="external noopener noreferrer"
                                class="shrink-0 gd-press"
                                aria-label="Watch the video"
                            >
                                <img src={sprite('youtube')} alt="" class="h-11" />
                            </a>
                        </div>
                    </li>
                {/each}
            </GdList>
        {/if}
    </section>

    <aside class="flex flex-col gap-12">
        <section>
            <h2 class="mb-4 text-center gd-title text-3xl">In progress</h2>
            <ul class="gd-dark flex flex-col gap-3 p-5">
                {#each profile.progress as record (record.id)}
                    <li class="flex items-center gap-3">
                        <a
                            href={resolve('/levels/[id]', { id: String(record.level.id) })}
                            class="min-w-0 flex-1 truncate font-bold hover:underline"
                        >
                            {record.level.name}
                        </a>
                        <span class="gd-title text-xl">{record.progress}%</span>
                    </li>
                {:else}
                    <li class="text-center text-ink-200">No progress records.</li>
                {/each}
            </ul>
        </section>

        <section>
            <h2 class="mb-4 text-center gd-title text-3xl">Verified</h2>
            <ul class="gd-dark flex flex-col gap-3 p-5">
                {#each profile.verified as level (level.id)}
                    <li class="flex items-center gap-3">
                        <span class="w-12 gd-title text-xl text-gd-yellow">#{level.position}</span>
                        <a
                            href={resolve('/levels/[id]', { id: String(level.id) })}
                            class="truncate font-bold hover:underline"
                        >
                            {level.name}
                        </a>
                    </li>
                {:else}
                    <li class="text-center text-ink-200">Hasn't verified any levels.</li>
                {/each}
            </ul>
        </section>
    </aside>
</div>
