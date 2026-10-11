<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { ClassValue } from 'svelte/elements'

    type Props = {
        href?: string
        type?: 'button' | 'submit'
        color?: 'green' | 'cyan' | 'pink' | 'gray' | 'slate' | 'red'
        size?: 'sm' | 'md'
        // White "bigFont" label instead of the gold one
        white?: boolean
        disabled?: boolean
        title?: string
        pressed?: boolean
        // Submit buttons: another action of the form and the value they send
        formaction?: string
        formnovalidate?: boolean
        name?: string
        value?: string
        class?: ClassValue
        onclick?: (event: MouseEvent) => void
        children: Snippet
    }

    let {
        href,
        type = 'button',
        color = 'green',
        size = 'md',
        white = false,
        disabled = false,
        title,
        pressed,
        formaction,
        formnovalidate,
        name,
        value,
        class: className,
        onclick,
        children,
    }: Props = $props()

    const classes = $derived([
        'gd-btn',
        size === 'sm' && 'gd-btn-sm',
        color !== 'green' && `gd-btn-${color}`,
        className,
    ])
</script>

{#snippet label()}
    <span class={white ? 'gd-title' : 'gd-gold'}>{@render children()}</span>
{/snippet}

{#if href === undefined}
    <button
        {type}
        class={classes}
        {disabled}
        {title}
        aria-pressed={pressed}
        {formaction}
        {formnovalidate}
        {name}
        {value}
        {onclick}
    >
        {@render label()}
    </button>
{:else}
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is resolved by the caller -->
    <a {href} class={classes} {title} aria-disabled={disabled ? 'true' : undefined} {onclick}>
        {@render label()}
    </a>
{/if}
