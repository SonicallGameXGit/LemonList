<script lang="ts">
    import { resolve } from '$app/paths'
    import AuthCard from '#lib/components/AuthCard.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
</script>

<svelte:head>
    <title>Account deleted - LemonList</title>
</svelte:head>

<AuthCard title="Account deleted" subtitle="Your account and all of its data have been deleted.">
    <p class="text-center text-white">Thanks for playing with us. Come back any time!</p>
    <GdButton href={resolve('/')} class="self-center">Back to the home page</GdButton>
</AuthCard>
