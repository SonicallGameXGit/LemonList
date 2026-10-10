<script lang="ts">
    import { difficultySprite } from '#lib/gd.ts'
    import { difficultyNames, type Difficulty } from '#lib/list.ts'

    type Props = {
        difficulty: Difficulty | null
        class?: string
    }

    let { difficulty, class: className = 'w-14' }: Props = $props()

    const name = $derived(difficulty === null ? 'Not rated yet' : difficultyNames[difficulty])
</script>

<img
    src={difficultySprite(difficulty)}
    alt={name}
    title={name}
    class={['h-auto shrink-0', className]}
/>
