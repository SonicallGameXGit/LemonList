<script lang="ts">
    import { resolve } from '$app/paths'
    import type { PageProps } from './$types'

    let { params }: PageProps = $props()
</script>

<svelte:head>
    <title>Level {params.id} - LemonList</title>
</svelte:head>

<h1>Level {params.id}</h1>
<p>Level details, records and engagement ratings will be shown here.</p>
<p><a href={resolve('/levels')}>Back to the Main List</a></p>
