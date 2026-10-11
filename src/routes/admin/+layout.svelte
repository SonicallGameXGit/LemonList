<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import GdButton from '#lib/components/GdButton.svelte'
    import type { LayoutProps } from './$types'

    let { data, children }: LayoutProps = $props()

    const tabs = $derived([
        {
            href: resolve('/admin/records'),
            label: 'Records',
            badge: data.user === null ? 0 : data.user.pendingRecords,
        },
        { href: resolve('/admin/players'), label: 'Players', badge: 0 },
        { href: resolve('/admin/difficulties'), label: 'Difficulties', badge: 0 },
        { href: resolve('/admin/levels/new'), label: 'Add level', badge: 0 },
    ])
</script>

<h1 class="gd-gold text-center text-5xl sm:text-6xl">Admin</h1>

<!-- Tabs like the category buttons of the game, the current one is pressed -->
<nav class="mt-8 mb-12 flex flex-wrap justify-center gap-4" aria-label="Admin pages">
    {#each tabs as tab (tab.href)}
        <GdButton
            href={tab.href}
            size="sm"
            color={page.url.pathname.startsWith(tab.href) ? 'green' : 'gray'}
        >
            {tab.label}
            {#if tab.badge > 0}
                <span class="gd-title text-xl text-gd-yellow">({tab.badge})</span>
            {/if}
        </GdButton>
    {/each}
</nav>

{@render children()}
