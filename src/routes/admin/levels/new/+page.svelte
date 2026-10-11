<script lang="ts">
    import LevelForm from '#lib/components/LevelForm.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()
</script>

<svelte:head>
    <title>Add level - Admin - LemonList</title>
</svelte:head>

<h2 class="mb-6 text-center gd-title text-4xl">Add a level</h2>

<LevelForm
    level={null}
    action="?/create"
    players={data.players}
    difficulties={data.difficulties}
    mainListSize={data.mainListSize}
    error={form?.action === 'create' ? form.error : null}
    submitLabel="Add level"
/>
