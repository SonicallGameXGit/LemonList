<script lang="ts">
    import { sprite, type SpriteName } from '#lib/gd.ts'

    type Props = {
        name: SpriteName
        class?: string
        label?: string
    }

    let { name, class: className = 'h-5', label }: Props = $props()
</script>

<img
    src={sprite(name)}
    alt={label ?? ''}
    title={label}
    class={['inline-block w-auto shrink-0 align-middle', className]}
/>
