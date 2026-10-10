<script lang="ts">
    type Props = {
        src: string
        name: string
        class?: string
    }

    let { src, name, class: className = 'size-10' }: Props = $props()
</script>

<img {src} alt="{name}'s icon" loading="lazy" class={['shrink-0 object-contain', className]} />
