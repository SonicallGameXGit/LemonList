<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import GdButton from '#lib/components/GdButton.svelte'
    import ProgressBar from '#lib/components/ProgressBar.svelte'
</script>

<svelte:head>
    <title>{page.status} - LemonList</title>
</svelte:head>

<div class="mx-auto flex max-w-xl flex-col items-center py-10 text-center">
    <p class="gd-gold text-9xl">{page.status}</p>
    <h1 class="mt-5 gd-title text-4xl">
        {page.status === 404 ? 'You crashed at 0%' : 'Something went wrong'}
    </h1>
    <div class="mt-6 w-full max-w-sm">
        <ProgressBar progress={0} class="h-6" />
    </div>
    <p class="mt-5 text-xl text-ink-200">{page.error?.message ?? 'Unexpected error'}</p>
    <div class="mt-8 flex gap-4">
        <GdButton href={resolve('/')}>Home</GdButton>
        <GdButton href={resolve('/levels')} color="gray">Main List</GdButton>
    </div>
</div>
