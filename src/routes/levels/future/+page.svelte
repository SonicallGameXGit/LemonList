<script lang="ts">
    import { resolve } from '$app/paths'
</script>

<svelte:head>
    <title>Future List - LemonList</title>
</svelte:head>

<h1>Future List</h1>
<p>Levels that are ready to be verified but not placed yet will be listed here.</p>
<p><a href={resolve('/levels')}>Go to the Main List</a></p>
