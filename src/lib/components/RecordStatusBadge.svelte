<script lang="ts">
    import { RecordStatus } from '#lib/list.ts'
    import Sprite from './Sprite.svelte'

    let { status }: { status: RecordStatus } = $props()
</script>

<span class="inline-flex items-center gap-2 gd-title text-lg whitespace-nowrap">
    {#if status === RecordStatus.Approved}
        <Sprite name="check" class="h-6" /> <span class="text-gd-lime">Approved</span>
    {:else if status === RecordStatus.Pending}
        <Sprite name="time" class="h-6" /> Pending
    {:else}
        <Sprite name="x" class="h-6" /> <span class="text-gd-red">Rejected</span>
    {/if}
</span>
