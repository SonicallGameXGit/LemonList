<script lang="ts">
    import { enhance } from '$app/forms'
    import { resolve } from '$app/paths'
    import { sprite } from '#lib/gd.ts'
    import { RecordStatus } from '#lib/list.ts'
    import { formatDate } from '#lib/format.ts'
    import Alert from '#lib/components/Alert.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import LevelForm from '#lib/components/LevelForm.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import RecordStatusBadge from '#lib/components/RecordStatusBadge.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()
</script>

<svelte:head>
    <title>Submit a level - LemonList</title>
</svelte:head>

<div class="mb-2 flex items-center gap-4">
    <a href={resolve('/dashboard')} class="gd-press" aria-label="Back to the dashboard">
        <img src={sprite('back')} alt="" class="h-16 w-auto" />
    </a>
</div>

<PageTitle
    title="Submit a level"
    subtitle="Beat a level that isn't on the list yet? Send it with your completion, the admins place it and your completion becomes a record."
/>

{#if data.user !== null && !data.user.accountVerified}
    <div class="mb-6">
        <Alert kind="info">
            Your account isn't verified yet. The admins can still add your level, your record counts
            once they verify your account.
        </Alert>
    </div>
{/if}

<LevelForm
    level={null}
    action="?/submit"
    submission
    difficulties={data.difficulties}
    mainListSize={data.mainListSize}
    error={form?.action === 'submit' ? form.error : null}
    success={form?.action === 'submit' ? form.success : null}
    submitLabel="Send level"
/>

<section class="mt-14">
    <h2 class="text-center gd-title text-4xl">Your levels</h2>
    {#if form?.action === 'withdraw' && form.error !== null}
        <div class="mt-5">
            <Alert kind="error">{form.error}</Alert>
        </div>
    {/if}
    {#if data.submissions.length === 0}
        <div class="gd-dark mt-5 p-8 text-center text-ink-200">
            You haven't sent any levels yet.
        </div>
    {:else}
        <GdList>
            {#each data.submissions as submission (submission.id)}
                <li class="flex items-center gap-4 px-5 py-3">
                    <img
                        src={submission.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        class="hidden aspect-video w-32 shrink-0 rounded-lg border-[3px] border-black object-cover sm:block"
                    />
                    <div class="min-w-0 flex-1">
                        {#if submission.level !== null}
                            <a
                                href={resolve('/levels/[id]', { id: String(submission.level.id) })}
                                class="block truncate gd-title text-2xl"
                            >
                                {submission.level.name}
                            </a>
                        {:else}
                            <p class="truncate gd-title text-2xl">{submission.name}</p>
                        {/if}
                        <p class="text-base text-black/55">
                            ID {submission.gdId} · by {submission.creator} · {formatDate(
                                submission.submittedAt,
                            )}
                        </p>
                    </div>
                    <span class="w-36 text-right">
                        <RecordStatusBadge status={submission.status} />
                    </span>
                    <div class="w-10 shrink-0">
                        {#if submission.status === RecordStatus.Pending}
                            <form method="POST" action="?/withdraw" use:enhance>
                                <input type="hidden" name="submission" value={submission.id} />
                                <button
                                    type="submit"
                                    class="gd-press"
                                    title="Withdraw"
                                    aria-label="Withdraw the level"
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
