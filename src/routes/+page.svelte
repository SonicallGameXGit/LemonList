<script lang="ts">
    import { resolve } from '$app/paths'
    import { ListChangeKind } from '#lib/list.ts'
    import { formatDate } from '#lib/format.ts'
    import Avatar from '#lib/components/Avatar.svelte'
    import ChangelogMajor from '#lib/components/ChangelogMajor.svelte'
    import CategoryButton from '#lib/components/CategoryButton.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import LevelRow from '#lib/components/LevelRow.svelte'
    import SkillsetTag from '#lib/components/SkillsetTag.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
</script>

<svelte:head>
    <title>LemonList</title>
</svelte:head>

<section class="text-center">
    <h1 class="gd-gold text-6xl sm:text-8xl">LemonList</h1>
    <p class="mx-auto mt-6 max-w-2xl text-xl text-ink-200">
        The demon list of our Geometry Dash community. Every demon counts, starting from Easy
        Demons. Beat levels, submit your records and climb the leaderboard!
    </p>
    <nav class="mt-12 flex flex-wrap justify-center gap-6 sm:gap-10">
        <CategoryButton href={resolve('/levels')} label="Main List" icon="demon" />
        <CategoryButton href={resolve('/levels/future')} label="Future List" icon="time" />
        <CategoryButton href={resolve('/players')} label="Players" icon="trophy" />
    </nav>
    <p class="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 gd-title text-xl">
        <span>{data.stats.levels} levels</span>
        <span>{data.stats.futureLevels} upcoming</span>
        <span>{data.stats.players} players</span>
        <span>{data.stats.records} records</span>
    </p>
</section>

<section class="mt-20">
    <h2 class="text-center gd-title text-4xl">Top of the list</h2>
    {#if data.topLevels.length === 0}
        <div class="gd-dark mt-5 p-8 text-center text-ink-200">
            No levels are placed yet. Check the
            <a href={resolve('/levels/future')} class="gd-link">Future List</a>.
        </div>
    {:else}
        <GdList>
            {#each data.topLevels as level (level.id)}
                <LevelRow {level} />
            {/each}
        </GdList>
        <div class="text-center">
            <GdButton href={resolve('/levels')}>Full list</GdButton>
        </div>
    {/if}
</section>

<div class="mt-20 grid gap-14 lg:grid-cols-2">
    <section>
        <h2 class="text-center gd-title text-3xl">Latest completions</h2>
        {#if data.recentRecords.length === 0}
            <div class="gd-dark mt-5 p-8 text-center text-ink-200">
                Nobody has beaten a level yet.
            </div>
        {:else}
            <GdList variant="comments">
                {#each data.recentRecords as record (record.id)}
                    <li>
                        <div class="gd-comment flex items-center gap-4">
                            <Avatar
                                src={record.player.avatarUrl}
                                name={record.player.displayUsername}
                                class="size-12"
                            />
                            <div class="min-w-0 flex-1">
                                <p class="flex items-center gap-2">
                                    <a
                                        href={resolve('/players/[username]', {
                                            username: record.player.username,
                                        })}
                                        class="truncate gd-gold text-xl"
                                    >
                                        {record.player.displayUsername}
                                    </a>
                                    <SkillsetTag
                                        skillset={data.skillsetTags[record.player.username]}
                                        compact
                                        class="size-6"
                                    />
                                </p>
                                <p class="truncate text-lg">
                                    beat
                                    <a
                                        href={resolve('/levels/[id]', {
                                            id: String(record.level.id),
                                        })}
                                        class="font-bold hover:underline"
                                    >
                                        {record.level.name}
                                    </a>
                                    <span class="text-gd-yellow">#{record.level.position}</span>
                                </p>
                            </div>
                            <span class="self-start text-sm text-black/50">
                                {formatDate(record.submittedAt)}
                            </span>
                        </div>
                    </li>
                {/each}
            </GdList>
        {/if}
    </section>

    <section>
        <h2 class="text-center gd-title text-3xl">List changes</h2>
        {#if data.changes.length === 0}
            <div class="gd-dark mt-5 p-8 text-center text-ink-200">
                The list hasn't changed yet.
            </div>
        {:else}
            <GdList variant="comments">
                {#each data.changes as change (change.id)}
                    <li>
                        <div class="gd-comment flex items-start gap-4">
                            <div class="min-w-0 flex-1">
                                {#if change.level === null}
                                    <span class="gd-gold text-xl">{change.levelName}</span>
                                {:else}
                                    <a
                                        href={resolve('/levels/[id]', {
                                            id: String(change.level.id),
                                        })}
                                        class="gd-gold text-xl"
                                    >
                                        {change.level.name}
                                    </a>
                                {/if}
                                <p class="text-lg">
                                    {#if change.kind === ListChangeKind.Placed}
                                        was placed at <span class="text-gd-yellow"
                                            >#{change.to}</span
                                        >
                                    {:else if change.kind === ListChangeKind.Removed}
                                        was removed from <span class="text-gd-red"
                                            >#{change.from}</span
                                        >
                                    {:else if change.kind === ListChangeKind.MovedUp}
                                        moved up from #{change.from} to
                                        <span class="text-gd-lime">#{change.to}</span>
                                    {:else}
                                        moved down from #{change.from} to
                                        <span class="text-gd-red">#{change.to}</span>
                                    {/if}
                                </p>
                            </div>
                            <span class="text-sm text-black/50">{formatDate(change.date)}</span>
                        </div>
                    </li>
                {/each}
            </GdList>
        {/if}
    </section>
</div>

{#if data.changelogs.length > 0}
    <section class="mt-20">
        <h2 class="text-center gd-title text-4xl">What's new</h2>
        <div class="mt-6 flex flex-col gap-8">
            {#each data.changelogs as update (update.version)}
                <ChangelogMajor {update} />
            {/each}
        </div>
        <div class="mt-6 text-center">
            <GdButton href={resolve('/changelogs')}>All changelogs</GdButton>
        </div>
    </section>
{/if}
