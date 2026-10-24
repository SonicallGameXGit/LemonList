<script lang="ts">
    import type { ClassValue } from 'svelte/elements'
    import type { Skillset } from '#lib/list.ts'

    type Props = {
        // The main skillset of a player, nothing shows without one
        skillset: Skillset | null | undefined
        // Only the icon, next to names in lists. Profiles show the name too
        compact?: boolean
        class?: ClassValue
    }

    let { skillset, compact = false, class: className }: Props = $props()
</script>

{#if skillset !== null && skillset !== undefined}
    {#if compact}
        <img
            src={skillset.iconUrl}
            alt="Main skillset: {skillset.name}"
            title="Main skillset: {skillset.name}"
            class={['inline-block size-7 shrink-0 object-contain', className]}
        />
    {:else}
        <span
            class={[
                'inline-flex items-center gap-2 rounded-full bg-black/30 py-1 pr-4 pl-1.5',
                className,
            ]}
            title={skillset.description ?? undefined}
        >
            <img src={skillset.iconUrl} alt="" class="size-8 shrink-0 object-contain" />
            <span class="gd-title text-xl">
                <span class="sr-only">Main skillset:</span>
                {skillset.name}
            </span>
        </span>
    {/if}
{/if}
