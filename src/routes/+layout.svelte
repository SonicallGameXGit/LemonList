<script lang="ts">
    import './layout.css'
    import { goto } from '$app/navigation'
    import { asset, resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient } from '#lib/auth-client.ts'
    import { sprite } from '#lib/gd.ts'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import type { LayoutProps } from './$types'

    let { data, children }: LayoutProps = $props()

    let menuOpen = $state(false)

    type NavLink = { href: string; label: string; badge: number }

    const links: NavLink[] = $derived([
        { href: resolve('/levels'), label: 'Main List', badge: 0 },
        { href: resolve('/levels/future'), label: 'Future List', badge: 0 },
        { href: resolve('/players'), label: 'Players', badge: 0 },
        ...(data.user !== null && data.user.admin
            ? [
                  {
                      href: resolve('/admin'),
                      label: 'Admin',
                      badge: data.user.pendingRecords + data.user.pendingSubmissions,
                  },
              ]
            : []),
    ])

    function isActive(href: string) {
        const path = page.url.pathname

        if (href === resolve('/levels')) {
            return (
                path === href || (path.startsWith(href + '/') && !path.startsWith(href + '/future'))
            )
        }

        return path === href || path.startsWith(href + '/')
    }

    function closeMenu() {
        menuOpen = false
    }

    async function signOut() {
        menuOpen = false
        await authClient.signOut()
        await goto(resolve('/'), { refreshAll: true })
    }
</script>

{#snippet badge(link: NavLink)}
    {#if link.badge > 0}
        <span
            class="ml-1 inline-grid min-w-7 place-items-center rounded-full border-2 border-black bg-gd-red px-1.5 align-middle text-base"
            title="{link.badge} records and levels to review"
        >
            {link.badge}
        </span>
    {/if}
{/snippet}

<svelte:head>
    <link rel="icon" href={asset('gd/cube-lemon.png')} />
    <link
        rel="preload"
        href={asset('gd/Pusab.ttf')}
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
    <title>LemonList</title>
</svelte:head>

<div class="relative flex min-h-dvh flex-col overflow-x-clip">
    <header class="relative z-30">
        <nav class="mx-auto flex h-24 max-w-6xl items-center gap-8 px-4">
            <a href={resolve('/')} class="flex shrink-0 gd-press items-center gap-3">
                <img src={sprite('cube-lemon')} alt="" class="size-11" />
                <span class="gd-gold text-3xl">LemonList</span>
            </a>

            <div class="hidden items-center gap-7 lg:flex">
                {#each links as link (link.href)}
                    <!-- eslint-disable svelte/no-navigation-without-resolve -- links are resolved above -->
                    <a
                        href={link.href}
                        class={[
                            'gd-title text-xl transition-[filter]',
                            isActive(link.href) ? 'text-gd-yellow' : 'hover:brightness-90',
                        ]}
                        aria-current={isActive(link.href) ? 'page' : undefined}
                    >
                        {link.label}
                        {@render badge(link)}
                    </a>
                    <!-- eslint-enable svelte/no-navigation-without-resolve -->
                {/each}
            </div>

            <div class="ml-auto hidden items-center gap-4 lg:flex">
                {#if data.user === null}
                    <GdButton href={resolve('/(guest)/login')} color="cyan" size="sm">
                        Log in
                    </GdButton>
                    <GdButton href={resolve('/(guest)/register')} size="sm">Register</GdButton>
                {:else}
                    <a href={resolve('/dashboard')} class="flex gd-press items-center gap-2.5">
                        <Avatar
                            src={data.user.avatarUrl}
                            name={data.user.displayUsername}
                            class="size-10"
                        />
                        <span class="gd-title text-xl">{data.user.displayUsername}</span>
                    </a>
                    <GdButton color="red" size="sm" onclick={signOut}>Sign out</GdButton>
                {/if}
            </div>

            <button
                type="button"
                class="ml-auto gd-press lg:hidden"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onclick={() => (menuOpen = !menuOpen)}
            >
                <img src={sprite(menuOpen ? 'close' : 'menu')} alt="" class="size-14" />
            </button>
        </nav>

        {#if menuOpen}
            <div class="gd-box mx-4 mb-4 lg:hidden">
                <div class="flex flex-col gap-4 px-2 py-2">
                    {#each links as link (link.href)}
                        <!-- eslint-disable svelte/no-navigation-without-resolve -- links are resolved above -->
                        <a
                            href={link.href}
                            class={['gd-title text-2xl', isActive(link.href) && 'text-gd-yellow']}
                            onclick={closeMenu}
                        >
                            {link.label}
                            {@render badge(link)}
                        </a>
                        <!-- eslint-enable svelte/no-navigation-without-resolve -->
                    {/each}
                    <div class="mt-2 flex flex-wrap items-center gap-3">
                        {#if data.user === null}
                            <GdButton
                                href={resolve('/(guest)/login')}
                                color="cyan"
                                size="sm"
                                onclick={closeMenu}
                            >
                                Log in
                            </GdButton>
                            <GdButton
                                href={resolve('/(guest)/register')}
                                size="sm"
                                onclick={closeMenu}
                            >
                                Register
                            </GdButton>
                        {:else}
                            <a
                                href={resolve('/dashboard')}
                                class="flex items-center gap-2.5"
                                onclick={closeMenu}
                            >
                                <Avatar
                                    src={data.user.avatarUrl}
                                    name={data.user.displayUsername}
                                    class="size-10"
                                />
                                <span class="gd-title text-xl">{data.user.displayUsername}</span>
                            </a>
                            <GdButton color="red" size="sm" onclick={signOut}>Sign out</GdButton>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
        <div class="floor-line"></div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
        {@render children()}
    </main>

    <!-- The ground from the game, with the corner art on both sides -->
    <footer
        class="relative mt-20 h-44 bg-gd-ground-tint bg-[url('/gd/ground.png')] bg-size-[176px_176px] bg-repeat-x bg-blend-multiply"
    >
        <div class="floor-line"></div>
        <div
            class="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-1 px-28 pt-8 text-center text-base text-ink-200 sm:px-40"
        >
            <p>LemonList · the demon list of our community, from Easy Demons up.</p>
            <p>Not affiliated with RobTop Games.</p>
        </div>
        <img
            src={asset('gd/corner.png')}
            alt=""
            class="pointer-events-none absolute bottom-0 left-0 w-24 sm:w-32"
        />
        <img
            src={asset('gd/corner.png')}
            alt=""
            class="pointer-events-none absolute right-0 bottom-0 w-24 -scale-x-100 sm:w-32"
        />
    </footer>
</div>
