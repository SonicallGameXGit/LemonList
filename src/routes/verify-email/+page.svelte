<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import type { PageProps } from './$types'
    import Alert from '#lib/components/Alert.svelte'
    import AuthCard from '#lib/components/AuthCard.svelte'
    import GdButton from '#lib/components/GdButton.svelte'

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

<AuthCard title="Verify email">
    {#if linkError === null && data.user !== null && data.user.emailVerified === true}
        <Alert kind="success">
            Your email <strong>{data.user.email}</strong> is verified.
        </Alert>
        <GdButton href={resolve('/dashboard')} class="self-center">Go to your dashboard</GdButton>
    {:else}
        {#if linkError !== null}
            <Alert kind="error">
                This verification link is invalid or has expired ({linkError}).
            </Alert>
        {/if}

        <p class="text-center text-white">Need a new verification link? Enter your email below.</p>

        <form class="flex flex-col gap-4" {onsubmit}>
            <label class="gd-label">
                Email
                <input
                    type="email"
                    class="gd-input"
                    name="email"
                    autocomplete="email"
                    required
                    bind:value={email}
                />
            </label>

            {#if error !== null}
                <Alert kind="error">{error}</Alert>
            {/if}
            {#if sent}
                <Alert kind="success">
                    If this email needs verification, a new link has been sent.
                </Alert>
            {/if}

            <GdButton type="submit" disabled={pending} class="mt-2 self-center"
                >Send verification link</GdButton
            >
        </form>
    {/if}
</AuthCard>
