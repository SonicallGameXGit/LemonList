<script lang="ts">
    import { resolve } from '$app/paths'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import Alert from '#lib/components/Alert.svelte'
    import AuthCard from '#lib/components/AuthCard.svelte'
    import GdButton from '#lib/components/GdButton.svelte'

    let email = $state('')
    let pending = $state(false)
    let error: string | null = $state(null)
    let sent = $state(false)

    async function onsubmit(event: SubmitEvent) {
        event.preventDefault()
        pending = true
        error = null

        const result = await authClient.requestPasswordReset({
            email,
            redirectTo: '/reset-password',
        })

        pending = false
        error = errorMessage(result.error)
        sent = result.error === null
    }
</script>

<svelte:head>
    <title>Forgot password - LemonList</title>
</svelte:head>

<AuthCard title="Forgot password?" subtitle="We'll send you a link to set a new one.">
    {#if sent}
        <Alert kind="success">
            If an account with this email exists, we've sent it a link to reset the password.
        </Alert>
    {:else}
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

            <GdButton type="submit" disabled={pending} class="mt-2 self-center"
                >Send reset link</GdButton
            >
        </form>
    {/if}

    {#snippet footer()}
        <a href={resolve('/(guest)/login')} class="gd-link">Back to log in</a>
    {/snippet}
</AuthCard>
