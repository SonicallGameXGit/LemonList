<script lang="ts">
    type Props = {
        title: string
        subtitle?: string
    }

    let { title, subtitle }: Props = $props()
</script>

<header class="mb-10 text-center">
    <h1 class="gd-gold text-5xl sm:text-6xl">{title}</h1>
    {#if subtitle !== undefined}
        <p class="mt-4 text-xl text-ink-200">{subtitle}</p>
    {/if}
</header>
