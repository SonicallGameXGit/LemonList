<script lang="ts">
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
</script>

<svelte:head>
    <title>{data.player.displayUsername} - LemonList</title>
</svelte:head>

<h1>{data.player.displayUsername}</h1>
<p>Member since {data.player.createdAt.toLocaleDateString()}</p>
<p>Records will be shown here.</p>
