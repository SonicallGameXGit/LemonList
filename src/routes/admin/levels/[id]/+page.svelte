<script lang="ts">
    import { resolve } from '$app/paths'
    import { sprite } from '#lib/gd.ts'
    import GdButton from '#lib/components/GdButton.svelte'
    import LevelForm from '#lib/components/LevelForm.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    // Deleting takes two clicks
    let deleting = $state(false)
</script>

<svelte:head>
    <title>Edit {data.level.name} - Admin - LemonList</title>
</svelte:head>

<div class="mb-6 flex items-center gap-4">
    <a
        href={resolve('/levels/[id]', { id: String(data.level.id) })}
        class="gd-press"
        aria-label="Back to the level"
    >
        <img src={sprite('back')} alt="" class="h-16 w-auto" />
    </a>
    <h2 class="min-w-0 flex-1 truncate text-center gd-title text-4xl">{data.level.name}</h2>
    <div class="w-16"></div>
</div>

<LevelForm
    level={data.level}
    action="?/save"
    players={data.players}
    mainListSize={data.mainListSize}
    error={form?.action === 'save' ? form.error : null}
    submitLabel="Save"
>
    {#snippet actions()}
        {#if deleting}
            <span class="gd-title text-lg">Delete the level with its records and ratings?</span>
            <GdButton color="gray" onclick={() => (deleting = false)}>Cancel</GdButton>
            <GdButton type="submit" formaction="?/delete" formnovalidate color="red">
                Delete
            </GdButton>
        {:else}
            <GdButton color="red" onclick={() => (deleting = true)}>Delete</GdButton>
        {/if}
    {/snippet}
</LevelForm>
