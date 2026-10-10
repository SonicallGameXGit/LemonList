<script lang="ts">
    import { resolve } from '$app/paths'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()
</script>

<svelte:head>
    <title>Dashboard - LemonList</title>
</svelte:head>

{#if data.user !== null}
    <h1>Hi, {data.user.displayUsername}!</h1>

    <dl>
        <dt>Username</dt>
        <dd>{data.user.displayUsername}</dd>
        <dt>Email</dt>
        <dd>{data.user.email}</dd>
        <dt>Member since</dt>
        <dd>{data.user.createdAt.toLocaleDateString()}</dd>
    </dl>

    <h2>Your records</h2>
    <p>Your submitted records will be shown here.</p>

    <ul>
        {#if data.user.username !== null}
            <li>
                <a href={resolve('/players/[username]', { username: data.user.username })}>
                    View your public profile
                </a>
            </li>
        {/if}
        <li><a href={resolve('/dashboard/settings')}>Account settings</a></li>
    </ul>
{/if}
