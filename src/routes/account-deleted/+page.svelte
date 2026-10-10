<script lang="ts">
    import { resolve } from '$app/paths'
</script>

<svelte:head>
    <title>Account deleted - LemonList</title>
</svelte:head>

<h1>Account deleted</h1>
<p>Your account and all of its data have been deleted.</p>
<p><a href={resolve('/')}>Back to the home page</a></p>
