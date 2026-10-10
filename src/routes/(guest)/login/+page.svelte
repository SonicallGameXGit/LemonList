<script lang="ts">
    import { goto } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { page } from '$app/state'
    import { authClient, errorMessage, safeRedirect } from '#lib/auth-client.ts'

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

<h1>Log in</h1>

<form {onsubmit}>
    <label>
        Email or username
        <input type="text" name="login" autocomplete="username" required bind:value={login} />
    </label>
    <label>
        Password
        <input
            type="password"
            name="password"
            autocomplete="current-password"
            required
            bind:value={password}
        />
    </label>

    {#if error !== null}
        <p role="alert">{error}</p>
    {/if}
    {#if notice !== null}
        <p role="status">{notice}</p>
    {/if}

    <button type="submit" disabled={pending}>Log in</button>
</form>

<p><a href={resolve('forgot-password')}>Forgot your password?</a></p>
<p>No account yet? <a href={resolve('register')}>Register</a></p>
