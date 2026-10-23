<script lang="ts">
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import { sprite } from '#lib/gd.ts'
    import { RecordStatus } from '#lib/list.ts'
    import { formatDate } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import Pagination from '#lib/components/Pagination.svelte'
    import RecordStatusBadge from '#lib/components/RecordStatusBadge.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const statuses = [
        { status: RecordStatus.Pending, label: 'To review' },
        { status: RecordStatus.Approved, label: 'Approved' },
        { status: RecordStatus.Rejected, label: 'Rejected' },
    ]

    // Keeps the current tab and page, a relative "?/action" would drop the query
    const actionUrl = (action: string) => `?status=${data.status}&page=${data.page}&/${action}`

    // Deleting takes two clicks
    let deleting: number | null = $state(null)
</script>

<svelte:head>
    <title>Records - Admin - LemonList</title>
</svelte:head>

<nav class="mb-6 flex flex-wrap justify-center gap-x-8 gap-y-3" aria-label="Record status">
    {#each statuses as tab (tab.status)}
        <!-- eslint-disable svelte/no-navigation-without-resolve -- resolved, with a query -->
        <a
            href={resolve('/admin/records') + '?status=' + tab.status}
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

{#if form?.action === 'review' && form.error !== null}
    <Alert kind="error">{form.error}</Alert>
{/if}

{#if data.records.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">
            {data.status === RecordStatus.Pending ? 'All done!' : 'Nothing here'}
        </p>
        <p class="mt-2 text-ink-200">
            {data.status === RecordStatus.Pending
                ? 'There are no records waiting for a review.'
                : 'No records with this status yet.'}
        </p>
    </div>
{:else}
    <GdList id="records">
        {#each data.records as record (record.id)}
            <li class="flex flex-col gap-4 px-4 py-4 sm:px-6">
                <div class="flex flex-wrap items-center gap-4">
                    <Avatar
                        src={record.player.avatarUrl}
                        name={record.player.displayUsername}
                        class="size-14"
                    />
                    <div class="min-w-0 flex-1">
                        <p class="flex flex-wrap items-center gap-x-3">
                            <a
                                href={resolve('/players/[username]', {
                                    username: record.player.username,
                                })}
                                class="truncate gd-gold text-2xl"
                            >
                                {record.player.displayUsername}
                            </a>
                            {#if record.accountVerified}
                                <Sprite name="check" class="h-6" label="Verified account" />
                            {:else}
                                <span class="gd-title text-base text-gd-red">Not verified</span>
                            {/if}
                        </p>
                        <p class="truncate gd-title text-xl">
                            <span class="text-gd-yellow">
                                {record.level.position === null
                                    ? 'Future'
                                    : `#${record.level.position}`}
                            </span>
                            <a
                                href={resolve('/levels/[id]', { id: String(record.level.id) })}
                                class="hover:brightness-110"
                            >
                                {record.level.name}
                            </a>
                        </p>
                        <p class="text-base text-black/55">{formatDate(record.submittedAt)}</p>
                    </div>
                    <span
                        class={[
                            'gd-title text-4xl',
                            record.progress === 100 ? 'text-gd-lime' : 'text-white',
                        ]}
                    >
                        {record.progress}%
                    </span>
                    <div class="flex items-center gap-2">
                        <a
                            href={record.videoUrl}
                            target="_blank"
                            rel="external noopener noreferrer"
                            class="gd-press"
                            title="Video"
                            aria-label="Watch the video"
                        >
                            <img src={sprite('youtube')} alt="" class="h-12" />
                        </a>
                        {#if record.rawFootageUrl !== null}
                            <a
                                href={record.rawFootageUrl}
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

                {#if record.notes !== null}
                    <p class="gd-comment text-lg break-words whitespace-pre-line">
                        {record.notes}
                    </p>
                {/if}

                <form
                    method="POST"
                    action={actionUrl('review')}
                    class="flex flex-wrap items-center justify-end gap-3"
                    use:enhance
                >
                    <input type="hidden" name="record" value={record.id} />
                    <input type="hidden" name="player" value={record.playerId} />

                    {#if record.status !== RecordStatus.Pending}
                        <span class="mr-auto"><RecordStatusBadge status={record.status} /></span>
                    {:else if !record.accountVerified}
                        <span class="mr-auto text-base">
                            Verify the account before approving its records.
                        </span>
                    {/if}

                    {#if deleting === record.id}
                        <span class="gd-title text-lg">Delete for good?</span>
                        <GdButton
                            type="submit"
                            formaction={actionUrl('delete')}
                            color="red"
                            size="sm"
                        >
                            Delete
                        </GdButton>
                        <GdButton color="gray" size="sm" onclick={() => (deleting = null)}>
                            Cancel
                        </GdButton>
                    {:else}
                        <GdButton color="gray" size="sm" onclick={() => (deleting = record.id)}>
                            Delete
                        </GdButton>
                        {#if record.status !== RecordStatus.Pending}
                            <GdButton
                                type="submit"
                                name="status"
                                value={RecordStatus.Pending}
                                color="slate"
                                size="sm"
                            >
                                Back to review
                            </GdButton>
                        {/if}
                        {#if record.status !== RecordStatus.Rejected}
                            <GdButton
                                type="submit"
                                name="status"
                                value={RecordStatus.Rejected}
                                color="red"
                                size="sm"
                            >
                                Reject
                            </GdButton>
                        {/if}
                        {#if record.status !== RecordStatus.Approved}
                            {#if record.accountVerified}
                                <GdButton
                                    type="submit"
                                    name="status"
                                    value={RecordStatus.Approved}
                                    size="sm"
                                >
                                    Approve
                                </GdButton>
                            {:else}
                                <GdButton
                                    type="submit"
                                    formaction={actionUrl('verify')}
                                    color="cyan"
                                    size="sm"
                                >
                                    Verify player
                                </GdButton>
                            {/if}
                        {/if}
                    {/if}
                </form>
            </li>
        {/each}
    </GdList>

    <Pagination current={data.page} count={data.pages} anchor="records" />
{/if}
