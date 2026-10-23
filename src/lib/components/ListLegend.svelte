<script lang="ts">
    import Sprite from './Sprite.svelte'
</script>

<p class="flex flex-wrap justify-center gap-x-8 gap-y-2 text-lg text-ink-200">
    <span class="flex items-center gap-2"><Sprite name="diamond" class="h-6" /> List points</span>
    <span class="flex items-center gap-2"><Sprite name="check" class="h-6" /> Records</span>
    <span class="flex items-center gap-2">
        <Sprite name="star" class="h-6" /> Engagement, rated by players who beat the level
    </span>
</p>
