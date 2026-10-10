<script lang="ts">
    import { resolve } from '$app/paths'
</script>

<svelte:head>
    <title>Main List - LemonList</title>
</svelte:head>

<h1>Main List</h1>
<p>Verified levels will be listed here.</p>
<p><a href={resolve('/levels/future')}>Go to the Future List</a></p>
