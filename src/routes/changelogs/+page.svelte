<script lang="ts">
    import ChangelogMajor from '#lib/components/ChangelogMajor.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
</script>

<svelte:head>
    <title>Changelogs · LemonList</title>
</svelte:head>

<PageTitle title="Changelogs" subtitle="Everything new on LemonList, the newest first." />

{#if data.changelogs.length === 0}
    <div class="gd-dark p-8 text-center text-ink-200">No updates yet.</div>
{:else}
    <div class="flex flex-col gap-8">
        {#each data.changelogs as update (update.version)}
            <ChangelogMajor {update} />
        {/each}
    </div>
{/if}
