<script lang="ts">
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import { PASSWORD_MIN_LENGTH } from '#lib/auth-rules.ts'
    import Alert from '#lib/components/Alert.svelte'
    import AuthCard from '#lib/components/AuthCard.svelte'
    import GdButton from '#lib/components/GdButton.svelte'

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

<AuthCard title="New password">
    {#if done}
        <Alert kind="success">
            Your password has been changed. All of your sessions have been signed out.
        </Alert>
        <GdButton href={resolve('/(guest)/login')} class="self-center">Log in</GdButton>
    {:else if token === null}
        <Alert kind="error">This reset link is invalid or has expired.</Alert>
        <a href={resolve('/(guest)/forgot-password')} class="gd-btn gd-btn-gray"
            >Request a new one</a
        >
    {:else}
        <form class="flex flex-col gap-4" {onsubmit}>
            <label class="gd-label">
                New password
                <input
                    type="password"
                    class="gd-input"
                    name="password"
                    autocomplete="new-password"
                    required
                    minlength={PASSWORD_MIN_LENGTH}
                    bind:value={password}
                />
            </label>
            <label class="gd-label">
                Repeat new password
                <input
                    type="password"
                    class="gd-input"
                    name="password-repeat"
                    autocomplete="new-password"
                    required
                    minlength={PASSWORD_MIN_LENGTH}
                    bind:value={passwordRepeat}
                />
            </label>

            {#if error !== null}
                <Alert kind="error">{error}</Alert>
            {/if}

            <GdButton type="submit" disabled={pending} class="mt-2 self-center"
                >Change password</GdButton
            >
        </form>
    {/if}
</AuthCard>
