<script lang="ts">
    import type { ClassValue } from 'svelte/elements'

    type Props = {
        // From kitIconSvg, null while the manifest loads
        svg: string | null
        // Without a label the icon is decorative (e.g. inside a labelled button)
        label?: string
        class?: ClassValue
    }

    // A player icon of the kit, scaled into the box like an image with object-contain
    let { svg, label, class: className = 'size-10' }: Props = $props()
</script>

<span
    role={label === undefined ? undefined : 'img'}
    aria-label={label}
    aria-hidden={label === undefined ? 'true' : undefined}
    class={['inline-flex shrink-0 items-center justify-center [&>svg]:size-full', className]}
>
    {#if svg !== null}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- built by iconSvg from numbers and our own URLs -->
        {@html svg}
    {/if}
</span>
