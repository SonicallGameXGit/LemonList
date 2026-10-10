<script lang="ts">
    import './layout.css'
    import favicon from '#lib/assets/favicon.svg'
    import { goto } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { authClient } from '#lib/auth-client.ts'
    import type { LayoutProps } from './$types'

    let { data, children }: LayoutProps = $props()

    async function signOut() {
        await authClient.signOut()
        await goto(resolve('/'), { refreshAll: true })
    }
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>LemonList</title>
</svelte:head>

<header>
    <nav>
        <a href={resolve('/')}>LemonList</a>
        <a href={resolve('/levels')}>Main List</a>
        <a href={resolve('/levels/future')}>Future List</a>
        <a href={resolve('/players')}>Players</a>

        {#if data.user === null}
            <a href={resolve('login')}>Log in</a>
            <a href={resolve('register')}>Register</a>
        {:else}
            <a href={resolve('/dashboard')}>{data.user.displayUsername}</a>
            <a href={resolve('/dashboard/settings')}>Settings</a>
            <button type="button" onclick={signOut}>Sign out</button>
        {/if}
    </nav>
</header>

<main>
    {@render children()}
</main>
