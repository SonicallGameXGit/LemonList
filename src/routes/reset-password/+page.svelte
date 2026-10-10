<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import { PASSWORD_MIN_LENGTH } from '#lib/auth-rules.ts'

    // Better Auth redirects here with either ?token=... or ?error=INVALID_TOKEN
    const token = $derived(page.url.searchParams.get('token'))

    let password = $state('')
    let passwordRepeat = $state('')
    let pending = $state(false)
    let error: string | null = $state(null)
    let done = $state(false)

    async function onsubmit(event: SubmitEvent) {
        event.preventDefault()
        error = null

        if (token === null) {
            return
        }

        if (password !== passwordRepeat) {
            error = 'Passwords do not match'
            return
        }

        pending = true

        const result = await authClient.resetPassword({ newPassword: password, token })

        pending = false
        error = errorMessage(result.error)
        done = result.error === null
    }
</script>

<svelte:head>
    <title>Reset password - LemonList</title>
</svelte:head>

<h1>Reset password</h1>

{#if done}
    <p role="status">Your password has been changed. All of your sessions have been signed out.</p>
    <p><a href={resolve('login')}>Log in</a></p>
{:else if token === null}
    <p role="alert">This reset link is invalid or has expired.</p>
    <p><a href={resolve('forgot-password')}>Request a new one</a></p>
{:else}
    <form {onsubmit}>
        <label>
            New password
            <input
                type="password"
                name="password"
                autocomplete="new-password"
                required
                minlength={PASSWORD_MIN_LENGTH}
                bind:value={password}
            />
        </label>
        <label>
            Repeat new password
            <input
                type="password"
                name="password-repeat"
                autocomplete="new-password"
                required
                minlength={PASSWORD_MIN_LENGTH}
                bind:value={passwordRepeat}
            />
        </label>

        {#if error !== null}
            <p role="alert">{error}</p>
        {/if}

        <button type="submit" disabled={pending}>Change password</button>
    </form>
{/if}
