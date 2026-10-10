<script lang="ts">
    import { asset } from '$app/paths'
    import { sprite, type SpriteName } from '#lib/gd.ts'

    type Props = {
        href: string
        label: string
        icon: SpriteName
    }

    // Square menu button, like the categories on the "Online levels" screen
    let { href, label, icon }: Props = $props()
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- href is resolved by the caller -->
<a {href} class="relative block size-36 gd-press sm:size-44">
    <img src={asset('gd/button-01.png')} alt="" class="absolute inset-0 size-full" />
    <img src={sprite(icon)} alt="" class="absolute top-[17%] left-1/2 h-[44%] -translate-x-1/2" />
    <span
        class="absolute inset-x-0 bottom-[14%] text-center gd-title text-lg leading-none sm:text-xl"
    >
        {label}
    </span>
</a>
