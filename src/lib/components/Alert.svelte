<script lang="ts">
    import type { Snippet } from 'svelte'
    import Sprite from './Sprite.svelte'

    type Props = {
        kind: 'error' | 'success' | 'info'
        children: Snippet
    }

    let { kind, children }: Props = $props()
</script>

<div
    role={kind === 'error' ? 'alert' : 'status'}
    class="gd-dark flex items-start gap-3 px-4 py-3 text-lg leading-snug"
>
    <Sprite name={kind === 'error' ? 'x' : kind === 'success' ? 'check' : 'info'} class="h-7" />
    <div>{@render children()}</div>
</div>
