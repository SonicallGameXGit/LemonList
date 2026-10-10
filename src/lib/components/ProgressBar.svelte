<script lang="ts">
    // The normal mode progress bar from the level screen
    let { progress, class: className = 'h-4' }: { progress: number; class?: string } = $props()
</script>

<div
    class={['w-full overflow-hidden rounded-full border-[3px] border-black bg-black/45', className]}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={progress}
>
    <div class="h-full rounded-full bg-gd-bar" style:width="{progress}%"></div>
</div>
