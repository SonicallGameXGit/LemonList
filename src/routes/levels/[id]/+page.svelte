<script lang="ts">
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import {
        garageSprite,
        gameDifficultyRef,
        levelDifficultyRef,
        naDifficultyRef,
        sprite,
    } from '#lib/gd.ts'
    import { ENGAGEMENT_MAX, type Skillset } from '#lib/list.ts'
    import { formatDate, formatEngagement, formatPoints } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import DifficultyFace from '#lib/components/DifficultyFace.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import ProgressBar from '#lib/components/ProgressBar.svelte'
    import SkillsetScores from '#lib/components/SkillsetScores.svelte'
    import SkillsetTag from '#lib/components/SkillsetTag.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const level = $derived(data.level)
    const gameDifficulty = $derived(gameDifficultyRef(level.gameDifficulty))
    const maxVotes = $derived(Math.max(1, ...data.distribution))
    const listName = $derived(level.position === null ? 'Future List' : 'Main List')

    let copied = $state(false)
    // Starts from the stored rating of the viewer, clicking a score overrides it
    let selectedRating: number | null = $derived(data.viewerRating.rating)
    let rating = $state(false)

    // Starts from the stored votes of the viewer, the checkboxes change it
    let selectedSkillsets: number[] = $derived(data.viewerSkillsets.votes)
    let voting = $state(false)
    // The last skillset touched, its description shows under the checkboxes (works on phones too)
    let hintedSkillset: Skillset | null = $state(null)

    const skillsetsChanged = $derived(
        selectedSkillsets.length !== data.viewerSkillsets.votes.length ||
            selectedSkillsets.some((id) => !data.viewerSkillsets.votes.includes(id)),
    )

    function toggleSkillset(skillset: Skillset) {
        selectedSkillsets = selectedSkillsets.includes(skillset.id)
            ? selectedSkillsets.filter((id) => id !== skillset.id)
            : [...selectedSkillsets, skillset.id]
        hintedSkillset = skillset
    }

    async function copyId() {
        await navigator.clipboard.writeText(String(level.gdId))
        copied = true
        setTimeout(() => (copied = false), 1500)
    }
</script>

<svelte:head>
    <title>{level.name} - LemonList</title>
</svelte:head>

<nav class="mb-6 flex items-center justify-between gap-2">
    <a
        href={level.position === null ? resolve('/levels/future') : resolve('/levels')}
        class="gd-press"
        title="Back to the {listName}"
        aria-label="Back to the {listName}"
    >
        <img src={sprite('back')} alt="" class="h-16 w-auto" />
    </a>
    <div class="flex items-center gap-4">
        {#if data.neighbours.previous !== null}
            <a
                href={resolve('/levels/[id]', { id: String(data.neighbours.previous.id) })}
                class="flex gd-press items-center gap-2"
                title={data.neighbours.previous.name}
            >
                <img src={sprite('arrow')} alt="" class="h-12 w-auto" />
                <span class="gd-title text-xl">#{data.neighbours.previous.position}</span>
            </a>
        {/if}
        {#if data.neighbours.next !== null}
            <a
                href={resolve('/levels/[id]', { id: String(data.neighbours.next.id) })}
                class="flex gd-press items-center gap-2"
                title={data.neighbours.next.name}
            >
                <span class="gd-title text-xl">#{data.neighbours.next.position}</span>
                <img src={sprite('arrow')} alt="" class="h-12 w-auto -scale-x-100" />
            </a>
        {/if}
    </div>
</nav>

<header class="text-center">
    <h1 class="gd-title text-5xl break-words sm:text-7xl">{level.name}</h1>
    <p class="mt-3 gd-gold text-2xl sm:text-3xl">By {level.creator}</p>
</header>

<section class="mt-12 grid items-center gap-10 md:grid-cols-[11rem_1fr_12rem]">
    <div class="flex items-center justify-center gap-5 md:flex-col md:gap-3">
        <DifficultyFace difficulty={levelDifficultyRef(level)} class="w-28 md:w-36" />
        <div class="text-left md:text-center">
            <p class="gd-title text-3xl text-gd-yellow">
                {level.position === null ? 'Future' : `#${level.position}`}
            </p>
            {#if level.position !== null}
                <p class="flex items-center gap-2 gd-title text-2xl md:justify-center">
                    {formatPoints(level.points)}
                    <Sprite name="diamond" class="h-7" />
                </p>
            {/if}
        </div>
    </div>

    <div class="relative aspect-video overflow-hidden rounded-2xl border-4 border-black">
        <img src={level.thumbnailUrl} alt="{level.name} preview" class="size-full object-cover" />
        {#if level.videoUrl !== null}
            <a
                href={level.videoUrl}
                target="_blank"
                rel="external noopener noreferrer"
                class="absolute inset-0 grid place-items-center bg-black/20"
                aria-label="Watch the verification video"
            >
                <img src={sprite('play')} alt="" class="size-28 gd-press sm:size-36" />
            </a>
        {/if}
    </div>

    <!-- One row under the preview on phones, the date wraps below when it doesn't fit -->
    <ul
        class="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 gd-title text-2xl md:flex-col md:items-start"
    >
        <li class="flex items-center gap-3" title="Records">
            <Sprite name="check" class="h-9" />
            {level.recordsCount}
        </li>
        <li class="flex items-center gap-3" title="Engagement">
            <Sprite name="star" class="h-9" />
            {level.engagement === null ? '-' : formatEngagement(level.engagement)}
        </li>
        <li class="flex items-center gap-3" title="Added">
            <Sprite name="time" class="h-9" />
            <span class="text-lg">{formatDate(level.addedAt)}</span>
        </li>
    </ul>
</section>

<!-- Like the song box on the level screen -->
<section
    class="gd-light mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-4"
>
    <div class="flex items-center gap-3">
        <DifficultyFace difficulty={gameDifficulty} class="w-14" />
        <div>
            <p class="text-base">In-game</p>
            <p class="gd-title text-xl text-gd-blue">{gameDifficulty.name}</p>
        </div>
    </div>
    <div class="flex items-center gap-3">
        <DifficultyFace difficulty={level.listDifficulty} class="w-14" />
        <div>
            <p class="text-base">On LemonList</p>
            <p class="gd-title text-xl text-gd-yellow">
                {level.listDifficulty === null ? naDifficultyRef().name : level.listDifficulty.name}
            </p>
        </div>
    </div>
</section>

<section class="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-lg">
    <p class="flex items-center gap-2">
        Verified by
        {#if level.verifier === null}
            <span class="gd-title text-xl">nobody yet</span>
        {:else}
            <a
                href={resolve('/players/[username]', { username: level.verifier.username })}
                class="gd-gold text-xl"
            >
                {level.verifier.displayUsername}
            </a>
            <SkillsetTag skillset={data.skillsetTags[level.verifier.username]} compact />
        {/if}
    </p>
    <p class="flex items-center gap-2">
        ID: <span class="gd-title text-xl">{level.gdId}</span>
        <button type="button" class="gd-press" onclick={copyId} aria-label="Copy level ID">
            <img src={sprite('copy')} alt="" class="h-12" />
        </button>
        {#if copied}
            <span class="text-gd-lime">Copied!</span>
        {/if}
    </p>
</section>

{#if data.user !== null && (level.position !== null || data.user.admin)}
    <div class="mt-6 flex flex-wrap justify-center gap-4">
        {#if level.position !== null}
            <GdButton href={resolve('/dashboard') + '?level=' + level.id} color="cyan" size="sm">
                Submit a record
            </GdButton>
        {/if}
        {#if data.user.admin}
            <GdButton
                href={resolve('/admin/levels/[id]', { id: String(level.id) })}
                color="gray"
                size="sm"
            >
                Edit level
            </GdButton>
        {/if}
    </div>
{/if}

<div class="mt-16 grid gap-14 lg:grid-cols-[1fr_24rem]">
    <section class="min-w-0">
        {#if level.position === null}
            <h2 class="mb-5 text-center gd-title text-4xl">Verification</h2>
            <div class="gd-dark flex flex-col gap-5 p-6 text-center">
                <p class="gd-title text-2xl">
                    {level.verifier === null
                        ? 'Looking for a verifier'
                        : `${level.verifier.displayUsername}'s best: ${level.verificationProgress}%`}
                </p>
                <ProgressBar progress={level.verificationProgress} class="h-7" />
                <p class="text-ink-200">
                    Records open once the level is verified and placed on the Main List.
                </p>
            </div>
        {:else}
            <h2 class="text-center gd-title text-4xl">Records</h2>
            {#if data.records.length === 0}
                <div class="gd-dark mt-5 p-8 text-center text-ink-200">
                    Nobody has a record here yet.
                </div>
            {:else}
                <GdList>
                    {#each data.records as record, index (record.id)}
                        <li class="flex items-center gap-4 px-5 py-3">
                            <span class="w-8 text-center gd-title text-2xl">{index + 1}</span>
                            <Avatar
                                src={record.player.avatarUrl}
                                name={record.player.displayUsername}
                                class="size-12"
                            />
                            <div class="min-w-0 flex-1">
                                <a
                                    href={resolve('/players/[username]', {
                                        username: record.player.username,
                                    })}
                                    class="flex items-center gap-2 gd-title text-2xl"
                                >
                                    <span class="truncate">{record.player.displayUsername}</span>
                                    <SkillsetTag
                                        skillset={data.skillsetTags[record.player.username]}
                                        compact
                                    />
                                </a>
                                <p class="text-base text-black/55">
                                    {formatDate(record.submittedAt)}
                                </p>
                            </div>
                            <span
                                class={[
                                    'gd-title text-2xl',
                                    record.progress === 100 ? 'text-gd-lime' : 'text-white',
                                ]}
                            >
                                {record.progress}%
                            </span>
                            <a
                                href={record.videoUrl}
                                target="_blank"
                                rel="external noopener noreferrer"
                                class="gd-press"
                                aria-label="Watch the video"
                            >
                                <img src={sprite('youtube')} alt="" class="h-12" />
                            </a>
                        </li>
                    {/each}
                </GdList>
            {/if}
        {/if}
    </section>

    <!-- min-w-0: the skillset checkboxes would stretch the column past the screen on phones -->
    <div class="flex min-w-0 flex-col gap-14">
        <section>
            <h2 class="mb-5 text-center gd-title text-4xl">Engagement</h2>
            <div class="gd-box flex flex-col gap-5 px-3 py-2">
                {#if level.engagement === null}
                    <p class="text-center">Nobody has rated this level yet.</p>
                {:else}
                    <div class="text-center">
                        <span class="gd-gold text-6xl">{formatEngagement(level.engagement)}</span>
                        <p>from {level.ratingsCount} players</p>
                    </div>
                    <div class="flex items-end gap-1.5" aria-label="Ratings distribution">
                        {#each data.distribution as votes, index (index)}
                            <div class="flex flex-1 flex-col items-center gap-1">
                                <div class="flex h-20 w-full items-end">
                                    <div
                                        class="w-full rounded-t border-2 border-b-0 border-black bg-gd-yellow"
                                        style:height="{Math.max(6, (votes / maxVotes) * 100)}%"
                                        title="{votes} players rated it {index + 1}"
                                    ></div>
                                </div>
                                <span class="gd-title text-sm">{index + 1}</span>
                            </div>
                        {/each}
                    </div>
                {/if}

                <div class="border-t-2 border-black/20 pt-5">
                    {#if level.position === null}
                        <p class="text-center">Ratings open after the level is placed.</p>
                    {:else if data.viewerRating.canRate}
                        <form
                            method="POST"
                            action="?/rate"
                            class="flex flex-col items-center gap-4"
                            use:enhance={() => {
                                rating = true

                                return async ({ update }) => {
                                    await update({ reset: false })
                                    rating = false
                                }
                            }}
                        >
                            <p class="gd-title text-xl">
                                {data.viewerRating.rating === null
                                    ? 'Rate engagement'
                                    : 'Your rating'}
                            </p>
                            <input type="hidden" name="score" value={selectedRating ?? ''} />
                            <div class="grid grid-cols-5 gap-2">
                                {#each { length: ENGAGEMENT_MAX }, index (index)}
                                    <GdButton
                                        size="sm"
                                        white
                                        color={selectedRating === index + 1 ? 'green' : 'gray'}
                                        pressed={selectedRating === index + 1}
                                        class="w-14 px-0"
                                        onclick={() => (selectedRating = index + 1)}
                                    >
                                        {index + 1}
                                    </GdButton>
                                {/each}
                            </div>
                            {#if form?.action === 'rate' && form.error !== null}
                                <Alert kind="error">{form.error}</Alert>
                            {/if}
                            {#if form?.action === 'rate' && form.success !== null}
                                <Alert kind="success">{form.success}</Alert>
                            {/if}
                            <GdButton
                                type="submit"
                                disabled={selectedRating === null ||
                                    selectedRating === data.viewerRating.rating ||
                                    rating}
                            >
                                {data.viewerRating.rating === null ? 'Submit' : 'Change'}
                            </GdButton>
                        </form>
                    {:else}
                        <p class="text-center">
                            Only players who beat this level can rate it.
                            {#if data.user === null}
                                <a href={resolve('/(guest)/login')} class="gd-link">Log in</a>
                            {/if}
                        </p>
                    {/if}
                </div>
            </div>
        </section>

        <!-- Only levels of the Main List have skillsets -->
        {#if level.position !== null && data.allSkillsets.length > 0}
            <section>
                <h2 class="mb-5 text-center gd-title text-4xl">Skillsets</h2>
                <div class="gd-box flex flex-col gap-5 px-3 py-2">
                    {#if data.skillsets.scores.length === 0}
                        <p class="text-center">Nobody has voted for its skillsets yet.</p>
                    {:else}
                        <SkillsetScores scores={data.skillsets.scores} />
                        <p class="text-center">
                            {data.skillsets.voters === 1
                                ? 'from 1 player'
                                : `from ${data.skillsets.voters} players`}
                        </p>
                    {/if}

                    <div class="border-t-2 border-black/20 pt-5">
                        {#if data.viewerSkillsets.canVote}
                            <form
                                method="POST"
                                action="?/skillsets"
                                class="flex flex-col items-center gap-4"
                                use:enhance={() => {
                                    voting = true

                                    return async ({ update }) => {
                                        await update({ reset: false })
                                        voting = false
                                    }
                                }}
                            >
                                <p class="gd-title text-xl">
                                    {data.viewerSkillsets.votes.length === 0
                                        ? 'Vote for skillsets'
                                        : 'Your skillsets'}
                                </p>
                                <div
                                    class="grid w-full grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2"
                                    role="group"
                                    aria-label="Skillsets this level tests"
                                >
                                    {#each data.allSkillsets as skillset (skillset.id)}
                                        {@const checked = selectedSkillsets.includes(skillset.id)}
                                        <label
                                            class={[
                                                'relative flex gd-press cursor-pointer flex-col items-center gap-1 rounded-xl px-1 pt-2.5 pb-2 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white',
                                                checked
                                                    ? 'bg-black/40 ring-2 ring-gd-lime'
                                                    : 'bg-black/15 hover:bg-black/25',
                                            ]}
                                            title={skillset.description ?? undefined}
                                        >
                                            <input
                                                type="checkbox"
                                                name="skillset"
                                                value={skillset.id}
                                                class="sr-only"
                                                {checked}
                                                onchange={() => toggleSkillset(skillset)}
                                            />
                                            <img
                                                src={skillset.iconUrl}
                                                alt=""
                                                class="size-10 object-contain"
                                            />
                                            <span
                                                class="gd-title text-sm leading-tight break-words"
                                            >
                                                {skillset.name}
                                            </span>
                                            <img
                                                src={garageSprite(
                                                    checked ? 'check-on' : 'check-off',
                                                )}
                                                alt=""
                                                class="absolute top-1 right-1 size-5 object-contain"
                                            />
                                        </label>
                                    {/each}
                                </div>
                                <p class="min-h-12 text-center text-base">
                                    {#if hintedSkillset !== null && hintedSkillset.description !== null}
                                        <span class="gd-title">{hintedSkillset.name}:</span>
                                        {hintedSkillset.description}
                                    {:else}
                                        Check every skillset this level tests, then send your vote.
                                    {/if}
                                </p>
                                {#if form?.action === 'skillsets' && form.error !== null}
                                    <Alert kind="error">{form.error}</Alert>
                                {/if}
                                {#if form?.action === 'skillsets' && form.success !== null}
                                    <Alert kind="success">{form.success}</Alert>
                                {/if}
                                <GdButton type="submit" disabled={!skillsetsChanged || voting}>
                                    {#if data.viewerSkillsets.votes.length === 0}
                                        Submit
                                    {:else if selectedSkillsets.length === 0}
                                        Remove vote
                                    {:else}
                                        Change
                                    {/if}
                                </GdButton>
                            </form>
                        {:else}
                            <p class="text-center">
                                Only players who beat this level can vote for its skillsets.
                                {#if data.user === null}
                                    <a href={resolve('/(guest)/login')} class="gd-link">Log in</a>
                                {/if}
                            </p>
                        {/if}
                    </div>
                </div>
            </section>
        {/if}
    </div>
</div>
