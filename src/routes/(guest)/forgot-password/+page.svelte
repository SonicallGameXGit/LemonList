<script lang="ts">
    import { resolve } from '$app/paths'
    import { authClient, errorMessage } from '#lib/auth-client.ts'

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

<h1>Forgot password</h1>

{#if sent}
    <p role="status">
        If an account with this email exists, we've sent it a link to reset the password.
    </p>
{:else}
    <form {onsubmit}>
        <label>
            Email
            <input type="email" name="email" autocomplete="email" required bind:value={email} />
        </label>

        {#if error !== null}
            <p role="alert">{error}</p>
        {/if}

        <button type="submit" disabled={pending}>Send reset link</button>
    </form>
{/if}

<p><a href={resolve('login')}>Back to log in</a></p>
