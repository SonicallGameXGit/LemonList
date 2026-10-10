<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    // Better Auth redirects here after a verification link is opened, with ?error=... if it failed
    const linkError = $derived(page.url.searchParams.get('error'))

    let email = $state('')
    let pending = $state(false)
    let error: string | null = $state(null)
    let sent = $state(false)

    async function onsubmit(event: SubmitEvent) {
        event.preventDefault()
        pending = true
        error = null

        const result = await authClient.sendVerificationEmail({
            email,
            callbackURL: '/verify-email',
        })

        pending = false
        error = errorMessage(result.error)
        sent = result.error === null
    }
</script>

<svelte:head>
    <title>Verify email - LemonList</title>
</svelte:head>

<h1>Verify email</h1>

{#if linkError === null && data.user !== null && data.user.emailVerified === true}
    <p role="status">Your email <strong>{data.user.email}</strong> is verified.</p>
    <p><a href={resolve('/dashboard')}>Go to your dashboard</a></p>
{:else}
    {#if linkError !== null}
        <p role="alert">This verification link is invalid or has expired ({linkError}).</p>
    {/if}

    <p>Need a new verification link? Enter your email below.</p>

    <form {onsubmit}>
        <label>
            Email
            <input type="email" name="email" autocomplete="email" required bind:value={email} />
        </label>

        {#if error !== null}
            <p role="alert">{error}</p>
        {/if}
        {#if sent}
            <p role="status">If this email needs verification, a new link has been sent.</p>
        {/if}

        <button type="submit" disabled={pending}>Send verification link</button>
    </form>
{/if}
