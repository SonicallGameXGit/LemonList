<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { ClassValue } from 'svelte/elements'
    import GdButton from './GdButton.svelte'

    type Props = {
        label: string
        placeholder: string
        value?: string
        // Sends the form to the page with the text in this query parameter (hidden fields go in
        // children). Without it the page filters as you type and the button only closes the keyboard
        name?: string
        class?: ClassValue
        children?: Snippet
    }

    // Search field with the Search button of the game search screen
    let {
        label,
        placeholder,
        value = $bindable(''),
        name,
        class: className,
        children,
    }: Props = $props()

    function submit(event: SubmitEvent) {
        if (name !== undefined) {
            return
        }

        event.preventDefault()

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
    }
</script>

<form method="GET" class={['gd-dark flex items-center gap-3 p-4', className]} onsubmit={submit}>
    {@render children?.()}
    <label class="min-w-0 flex-1">
        <span class="sr-only">{label}</span>
        <input type="search" class="gd-input" {name} {placeholder} bind:value />
    </label>
    <GdButton type="submit" size="sm" color="cyan">Search</GdButton>
</form>
