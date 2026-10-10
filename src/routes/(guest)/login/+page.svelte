<script lang="ts">
    import { goto } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient, errorMessage, safeRedirect } from '#lib/auth-client.ts'
    import Alert from '#lib/components/Alert.svelte'
    import AuthCard from '#lib/components/AuthCard.svelte'
    import GdButton from '#lib/components/GdButton.svelte'

    let login = $state('')
    let password = $state('')
    let pending = $state(false)
    let error: string | null = $state(null)
    let notice: string | null = $state(null)

    async function onsubmit(event: SubmitEvent) {
        event.preventDefault()
        pending = true
        error = null
        notice = null

        const result = login.includes('@')
            ? await authClient.signIn.email({ email: login, password })
            : await authClient.signIn.username({ username: login, password })

        pending = false

        if (result.error !== null) {
            if (result.error.code === 'EMAIL_NOT_VERIFIED') {
                notice =
                    'Your email is not verified yet. We have sent you a new verification link, please check your inbox.'
                return
            }

            error = errorMessage(result.error)
            return
        }

        const target = safeRedirect(page.url.searchParams.get('redirectTo'), '/dashboard')
        // eslint-disable-next-line svelte/no-navigation-without-resolve -- target is validated by safeRedirect
        await goto(target, { refreshAll: true })
    }
</script>

<svelte:head>
    <title>Log in - LemonList</title>
</svelte:head>

<AuthCard title="Welcome back!" subtitle="Log in to submit records and rate levels.">
    <form class="flex flex-col gap-4" {onsubmit}>
        <label class="gd-label">
            Email or username
            <input
                type="text"
                class="gd-input"
                name="login"
                autocomplete="username"
                required
                bind:value={login}
            />
        </label>
        <label class="gd-label">
            <span class="flex items-center justify-between">
                Password
                <a href={resolve('/(guest)/forgot-password')} class="gd-link text-base">
                    Forgot your password?
                </a>
            </span>
            <input
                type="password"
                class="gd-input"
                name="password"
                autocomplete="current-password"
                required
                bind:value={password}
            />
        </label>

        {#if error !== null}
            <Alert kind="error">{error}</Alert>
        {/if}
        {#if notice !== null}
            <Alert kind="info">{notice}</Alert>
        {/if}

        <GdButton type="submit" disabled={pending} class="mt-2 self-center">Log in</GdButton>
    </form>

    {#snippet footer()}
        <p>No account yet? <a href={resolve('/(guest)/register')} class="gd-link">Register</a></p>
    {/snippet}
</AuthCard>
