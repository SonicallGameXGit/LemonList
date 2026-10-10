<script lang="ts">
    import GdList from '#lib/components/GdList.svelte'
    import LevelRow from '#lib/components/LevelRow.svelte'
    import PageTitle from '#lib/components/PageTitle.svelte'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
</script>

<svelte:head>
    <title>Future List - LemonList</title>
</svelte:head>

<PageTitle
    title="Future List"
    subtitle="Levels ready to be verified. Once verified, they get a place on the Main List."
/>

{#if data.levels.length === 0}
    <div class="gd-dark p-12 text-center">
        <p class="gd-title text-3xl">Nothing here yet</p>
        <p class="mt-2 text-ink-200">No levels are waiting for verification.</p>
    </div>
{:else}
    <GdList>
        {#each data.levels as level (level.id)}
            <LevelRow {level} />
        {/each}
    </GdList>
{/if}

<p class="text-center text-lg text-ink-200">The bar shows the verifier's best progress so far.</p>
