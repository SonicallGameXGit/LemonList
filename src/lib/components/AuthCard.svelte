<script lang="ts">
    import type { Snippet } from 'svelte'

    type Props = {
        title: string
        subtitle?: string
        children: Snippet
        footer?: Snippet
    }

    let { title, subtitle, children, footer }: Props = $props()
</script>

<!-- A popup box from the game -->
<div class="mx-auto w-full max-w-lg py-4">
    <div class="gd-box px-3 py-3 sm:px-6">
        <div class="mb-6 text-center">
            <h1 class="gd-gold text-4xl">{title}</h1>
            {#if subtitle !== undefined}
                <p class="mt-3 text-lg">{subtitle}</p>
            {/if}
        </div>
        <div class="flex flex-col gap-5">
            {@render children()}
        </div>
    </div>
    {#if footer !== undefined}
        <div class="mt-6 flex flex-col items-center gap-1 text-lg text-ink-200">
            {@render footer()}
        </div>
    {/if}
</div>
