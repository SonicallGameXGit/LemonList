<script lang="ts">
    import { naDifficultyRef } from '#lib/gd.ts'
    import type { DifficultyRef } from '#lib/list.ts'

    type Props = {
        // Null shows N/A
        difficulty: DifficultyRef | null
        class?: string
    }

    let { difficulty, class: className = 'w-14' }: Props = $props()

    const shown = $derived(difficulty ?? naDifficultyRef())
</script>

<img
    src={shown.faceUrl}
    alt={shown.name}
    title={shown.name}
    class={['h-auto shrink-0', className]}
/>
