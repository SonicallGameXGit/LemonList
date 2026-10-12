<script lang="ts">
    import { resolve } from '$app/paths'
    import { sprite } from '#lib/gd.ts'
    import { RecordStatus } from '#lib/list.ts'
    import { formatDate } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import LevelForm from '#lib/components/LevelForm.svelte'
    import RecordStatusBadge from '#lib/components/RecordStatusBadge.svelte'
    import Sprite from '#lib/components/Sprite.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const submission = $derived(data.submission)

    // Rejecting takes two clicks
    let rejecting = $state(false)
</script>

<svelte:head>
    <title>Review {submission.name} - Admin - LemonList</title>
</svelte:head>

<div class="mb-6 flex items-center gap-4">
    <a href={resolve('/admin/submissions')} class="gd-press" aria-label="Back to the submissions">
        <img src={sprite('back')} alt="" class="h-16 w-auto" />
    </a>
    <h2 class="min-w-0 flex-1 truncate text-center gd-title text-4xl">{submission.name}</h2>
    <div class="w-16"></div>
</div>

<!-- What the player sent, the form below starts from it -->
<div class="gd-dark mb-8 flex flex-col gap-4 p-5">
    <div class="flex flex-wrap items-center gap-4">
        <Avatar
            src={submission.player.avatarUrl}
            name={submission.player.displayUsername}
            class="size-14"
        />
        <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-x-3">
                <a
                    href={resolve('/players/[username]', { username: submission.player.username })}
                    class="truncate gd-gold text-2xl"
                >
                    {submission.player.displayUsername}
                </a>
                {#if submission.accountVerified}
                    <Sprite name="check" class="h-6" label="Verified account" />
                {:else}
                    <span class="gd-title text-base text-gd-red">Not verified</span>
                {/if}
            </p>
            <p class="text-base text-ink-200">
                Sent {formatDate(submission.submittedAt)}.
                {submission.accountVerified
                    ? 'Accepting approves their completion as a record.'
                    : 'Their completion becomes a record waiting for a review until the account is verified.'}
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
        <p class="gd-comment text-lg break-words whitespace-pre-line">{submission.notes}</p>
    {/if}
    <p class="text-base text-ink-200">
        If the player verified the level, make them the verifier: the verification counts as their
        completion, no record is added then.
    </p>
</div>

{#if submission.status !== RecordStatus.Pending}
    <div class="flex flex-col items-center gap-4">
        <RecordStatusBadge status={submission.status} />
        <Alert kind="info">This submission was reviewed already.</Alert>
        {#if submission.level !== null}
            <GdButton href={resolve('/levels/[id]', { id: String(submission.level.id) })}>
                View level
            </GdButton>
        {/if}
    </div>
{:else}
    <LevelForm
        level={data.level}
        action="?/accept"
        players={data.players}
        difficulties={data.difficulties}
        mainListSize={data.mainListSize}
        error={form?.action === 'accept' ? form.error : null}
        submitLabel="Accept and add"
    >
        {#snippet actions()}
            {#if rejecting}
                <span class="gd-title text-lg">Reject the level?</span>
                <GdButton color="gray" onclick={() => (rejecting = false)}>Cancel</GdButton>
                <GdButton type="submit" formaction="?/reject" formnovalidate color="red">
                    Reject
                </GdButton>
            {:else}
                <GdButton color="red" onclick={() => (rejecting = true)}>Reject</GdButton>
            {/if}
        {/snippet}
    </LevelForm>
{/if}
