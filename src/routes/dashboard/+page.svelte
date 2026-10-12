<script lang="ts">
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { sprite } from '#lib/gd.ts'
    import { NOTES_MAX_LENGTH, URL_MAX_LENGTH } from '#lib/list-rules.ts'
    import { RecordStatus } from '#lib/list.ts'
    import { formatDate, formatPoints } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import RecordStatusBadge from '#lib/components/RecordStatusBadge.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    // Level pages link here with ?level=<id> to choose the level right away
    const chosenLevel = $derived(page.url.searchParams.get('level') ?? '')

    let submitting = $state(false)
</script>

<svelte:head>
    <title>Dashboard - LemonList</title>
</svelte:head>

{#if data.user !== null}
    <header class="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <Avatar src={data.user.avatarUrl} name={data.user.displayUsername} class="size-24" />
        <div class="min-w-0 flex-1">
            <h1 class="gd-title text-5xl break-all">{data.user.displayUsername}</h1>
            <p class="mt-2 text-lg text-ink-200">
                {data.user.email} · member since {formatDate(data.user.createdAt)}
            </p>
            {#if data.stats !== null}
                <p
                    class="mt-3 flex flex-wrap justify-center gap-x-8 gap-y-2 gd-title text-2xl sm:justify-start"
                >
                    <span class="flex items-center gap-2">
                        #{data.stats.rank}
                        <Sprite name="trophy" class="h-8" label="Rank" />
                    </span>
                    <span class="flex items-center gap-2">
                        {formatPoints(data.stats.points)}
                        <Sprite name="star" class="h-7" label="Points" />
                    </span>
                    <span class="flex items-center gap-2">
                        {data.stats.completions}
                        <Sprite name="demon" class="h-8" label="Completions" />
                    </span>
                </p>
            {/if}
        </div>
        <div class="flex flex-wrap justify-center gap-3">
            {#if data.user.username !== null}
                <GdButton
                    href={resolve('/players/[username]', { username: data.user.username })}
                    color="cyan"
                    size="sm"
                >
                    Profile
                </GdButton>
            {/if}
            <GdButton href={resolve('/dashboard/settings')} color="gray" size="sm">
                Settings
            </GdButton>
        </div>
    </header>

    <div class="mt-8">
        {#if data.user.accountVerified}
            <Alert kind="success">Your account is verified. Your records count on the list.</Alert>
        {:else}
            <Alert kind="info">
                Your account is waiting for manual verification by an admin, to protect players from
                impersonation. You can already submit records, they'll be reviewed after that.
            </Alert>
        {/if}
    </div>

    <div class="mt-14 grid gap-14 lg:grid-cols-[26rem_1fr]">
        <section>
            <h2 class="mb-5 text-center gd-title text-4xl">Submit a record</h2>
            <form
                method="POST"
                action="?/submit"
                class="gd-box flex flex-col gap-5 px-3 py-3"
                use:enhance={() => {
                    submitting = true

                    return async ({ update }) => {
                        await update()
                        submitting = false
                    }
                }}
            >
                <label class="gd-label">
                    Level
                    <select class="gd-input" name="level" required>
                        <option value="" disabled selected={chosenLevel === ''}>
                            Choose a level
                        </option>
                        {#each data.levels as level (level.id)}
                            <option value={level.id} selected={chosenLevel === String(level.id)}>
                                #{level.position}
                                {level.name}
                            </option>
                        {/each}
                    </select>
                </label>
                <label class="gd-label">
                    Progress, %
                    <input
                        type="number"
                        class="gd-input"
                        name="progress"
                        min="1"
                        max="100"
                        value="100"
                        required
                    />
                </label>
                <label class="gd-label">
                    Video link
                    <input
                        type="url"
                        class="gd-input"
                        name="video"
                        placeholder="https://youtube.com/..."
                        maxlength={URL_MAX_LENGTH}
                        required
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
                <label class="gd-label">
                    Notes (optional)
                    <textarea
                        class="gd-input min-h-24 resize-y"
                        name="notes"
                        maxlength={NOTES_MAX_LENGTH}
                        placeholder="Anything the admins should know?"></textarea>
                </label>

                {#if form?.action === 'submit' && form.error !== null}
                    <Alert kind="error">{form.error}</Alert>
                {/if}
                {#if form?.action === 'submit' && form.success !== null}
                    <Alert kind="success">{form.success}</Alert>
                {/if}

                <GdButton type="submit" class="self-center" disabled={submitting}>Submit</GdButton>
            </form>
            <p class="mt-5 text-center text-lg text-ink-200">
                Beat a level that isn't on the list?
                <a href={resolve('/dashboard/submit-level')} class="gd-gold">Submit the level</a>
            </p>
        </section>

        <div class="flex min-w-0 flex-col gap-14">
            <section>
                <h2 class="text-center gd-title text-4xl">Your submissions</h2>
                {#if form?.action === 'withdraw' && form.error !== null}
                    <div class="mt-5">
                        <Alert kind="error">{form.error}</Alert>
                    </div>
                {/if}
                {#if data.submissions.length === 0}
                    <div class="gd-dark mt-5 p-8 text-center text-ink-200">No submissions yet.</div>
                {:else}
                    <GdList>
                        {#each data.submissions as record (record.id)}
                            <li class="flex items-center gap-4 px-5 py-3">
                                <div class="min-w-0 flex-1">
                                    <a
                                        href={resolve('/levels/[id]', {
                                            id: String(record.level.id),
                                        })}
                                        class="block truncate gd-title text-2xl"
                                    >
                                        {record.level.name}
                                    </a>
                                    <p class="text-base text-black/55">
                                        #{record.level.position} · {formatDate(record.submittedAt)}
                                    </p>
                                </div>
                                <span class="w-16 text-right gd-title text-2xl">
                                    {record.progress}%
                                </span>
                                <span class="w-36 text-right">
                                    <RecordStatusBadge status={record.status} />
                                </span>
                                <div class="w-10 shrink-0">
                                    {#if record.status === RecordStatus.Pending}
                                        <form method="POST" action="?/withdraw" use:enhance>
                                            <input type="hidden" name="record" value={record.id} />
                                            <button
                                                type="submit"
                                                class="gd-press"
                                                title="Withdraw"
                                                aria-label="Withdraw the record"
                                            >
                                                <img src={sprite('x')} alt="" class="h-10" />
                                            </button>
                                        </form>
                                    {/if}
                                </div>
                            </li>
                        {/each}
                    </GdList>
                {/if}
            </section>

            <section>
                <h2 class="text-center gd-title text-4xl">Rate your levels</h2>
                <p class="mt-2 mb-5 text-center text-ink-200">
                    You beat these levels, tell everyone how engaging they were.
                </p>
                {#if data.levelsToRate.length === 0}
                    <div class="gd-dark p-8 text-center text-ink-200">
                        Nothing to rate right now. Beat a level to rate it!
                    </div>
                {/if}
                <div class="grid grid-cols-2 gap-5 sm:grid-cols-3">
                    {#each data.levelsToRate as level (level.id)}
                        <a
                            href={resolve('/levels/[id]', { id: String(level.id) })}
                            class="group gd-press"
                        >
                            <img
                                src={level.thumbnailUrl}
                                alt=""
                                class="aspect-video w-full rounded-lg border-[3px] border-black object-cover"
                            />
                            <p class="mt-2 truncate gd-title text-xl">{level.name}</p>
                        </a>
                    {/each}
                </div>
            </section>
        </div>
    </div>
{/if}
