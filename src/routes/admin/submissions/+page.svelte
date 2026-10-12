<script lang="ts">
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import { gameDifficultyRef, sprite } from '#lib/gd.ts'
    import { RecordStatus } from '#lib/list.ts'
    import { formatDate } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import DifficultyFace from '#lib/components/DifficultyFace.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import RecordStatusBadge from '#lib/components/RecordStatusBadge.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const statuses = [
        { status: RecordStatus.Pending, label: 'To review' },
        { status: RecordStatus.Approved, label: 'Accepted' },
        { status: RecordStatus.Rejected, label: 'Rejected' },
    ]

    // Keeps the current tab, a relative "?/action" would drop the query
    const actionUrl = (action: string) => `?status=${data.status}&/${action}`

    // Rejecting takes two clicks, the uploaded preview is deleted
    let rejecting: number | null = $state(null)
</script>

<svelte:head>
    <title>Level submissions - Admin - LemonList</title>
</svelte:head>

<nav class="mb-6 flex flex-wrap justify-center gap-x-8 gap-y-3" aria-label="Submission status">
    {#each statuses as tab (tab.status)}
        <!-- eslint-disable svelte/no-navigation-without-resolve -- resolved, with a query -->
        <a
            href={resolve('/admin/submissions') + '?status=' + tab.status}
            class={[
                'gd-title text-2xl transition-[filter]',
                data.status === tab.status ? 'text-gd-yellow' : 'hover:brightness-90',
            ]}
            aria-current={data.status === tab.status ? 'page' : undefined}
        >
            {tab.label}
        </a>
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {/each}
</nav>

<p class="mb-6 text-center text-ink-200">
    Levels players beat that aren't on the list. Accepting adds the level (you can change anything
    first) and turns the completion into a record.
</p>

{#if form?.action === 'review' && form.error !== null}
    <Alert kind="error">{form.error}</Alert>
{/if}

{#if data.submissions.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">
            {data.status === RecordStatus.Pending ? 'All done!' : 'Nothing here'}
        </p>
        <p class="mt-2 text-ink-200">
            {data.status === RecordStatus.Pending
                ? 'There are no levels waiting for a review.'
                : 'No submissions with this status yet.'}
        </p>
    </div>
{:else}
    <GdList>
        {#each data.submissions as submission (submission.id)}
            <li class="flex flex-col gap-4 px-4 py-4 sm:px-6">
                <div class="flex flex-wrap items-center gap-4">
                    <img
                        src={submission.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        class="hidden aspect-video w-40 shrink-0 rounded-lg border-[3px] border-black object-cover md:block"
                    />
                    <div class="flex shrink-0 items-center gap-1">
                        <DifficultyFace
                            difficulty={gameDifficultyRef(submission.gameDifficulty)}
                            class="w-12"
                        />
                        <img src={sprite('arrow')} alt="" class="h-5 w-auto rotate-180" />
                        <DifficultyFace difficulty={submission.listDifficulty} class="w-12" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="truncate gd-title text-2xl">{submission.name}</p>
                        <p class="truncate gd-gold text-lg">
                            By {submission.creator} · ID {submission.gdId}
                        </p>
                        <p class="flex flex-wrap items-center gap-x-2 text-base text-black/55">
                            <Avatar
                                src={submission.player.avatarUrl}
                                name={submission.player.displayUsername}
                                class="size-7"
                            />
                            <a
                                href={resolve('/players/[username]', {
                                    username: submission.player.username,
                                })}
                                class="gd-title text-lg"
                            >
                                {submission.player.displayUsername}
                            </a>
                            {#if submission.accountVerified}
                                <Sprite name="check" class="h-5" label="Verified account" />
                            {:else}
                                <span class="gd-title text-base text-gd-red">Not verified</span>
                            {/if}
                            · {formatDate(submission.submittedAt)}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <a
                            href={submission.videoUrl}
                            target="_blank"
                            rel="external noopener noreferrer"
                            class="gd-press"
                            title="Completion video"
                            aria-label="Watch the completion"
                        >
                            <img src={sprite('youtube')} alt="" class="h-12" />
                        </a>
                        {#if submission.rawFootageUrl !== null}
                            <a
                                href={submission.rawFootageUrl}
                                target="_blank"
                                rel="external noopener noreferrer"
                                class="gd-press"
                                title="Raw footage"
                                aria-label="Open the raw footage"
                            >
                                <img src={sprite('download')} alt="" class="h-12" />
                            </a>
                        {/if}
                    </div>
                </div>

                {#if submission.notes !== null}
                    <p class="gd-comment text-lg break-words whitespace-pre-line">
                        {submission.notes}
                    </p>
                {/if}

                <form
                    method="POST"
                    action={actionUrl('reject')}
                    class="flex flex-wrap items-center justify-end gap-3"
                    use:enhance={() => {
                        return async ({ update }) => {
                            await update()
                            rejecting = null
                        }
                    }}
                >
                    <input type="hidden" name="submission" value={submission.id} />

                    {#if submission.status !== RecordStatus.Pending}
                        <span class="mr-auto"><RecordStatusBadge status={submission.status} /></span
                        >
                        {#if submission.level !== null}
                            <GdButton
                                href={resolve('/levels/[id]', { id: String(submission.level.id) })}
                                size="sm"
                            >
                                View level
                            </GdButton>
                        {/if}
                    {:else if rejecting === submission.id}
                        <span class="gd-title text-lg">Reject the level?</span>
                        <GdButton color="gray" size="sm" onclick={() => (rejecting = null)}>
                            Cancel
                        </GdButton>
                        <GdButton type="submit" color="red" size="sm">Reject</GdButton>
                    {:else}
                        <GdButton color="red" size="sm" onclick={() => (rejecting = submission.id)}>
                            Reject
                        </GdButton>
                        <GdButton
                            href={resolve('/admin/submissions/[id]', {
                                id: String(submission.id),
                            })}
                            size="sm"
                        >
                            Review
                        </GdButton>
                    {/if}
                </form>
            </li>
        {/each}
    </GdList>

    {#if data.submissions.length === data.limit}
        <p class="text-center text-ink-200">Showing the first {data.limit} submissions.</p>
    {/if}
{/if}
