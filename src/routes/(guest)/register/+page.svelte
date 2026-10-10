<script lang="ts">
    import { resolve } from '$app/paths'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import {
        USERNAME_MIN_LENGTH,
        USERNAME_MAX_LENGTH,
        USERNAME_PATTERN,
        PASSWORD_MIN_LENGTH,
    } from '#lib/auth-rules.ts'

    let username = $state('')
    let email = $state('')
    let password = $state('')
    let passwordRepeat = $state('')
    let pending = $state(false)
    let error: string | null = $state(null)
    let sentTo: string | null = $state(null)
    let resent = $state(false)

    async function onsubmit(event: SubmitEvent) {
        event.preventDefault()
        error = null

        if (password !== passwordRepeat) {
            error = 'Passwords do not match'
            return
        }

        pending = true

        const result = await authClient.signUp.email({
            name: username,
            username,
            email,
            password,
            callbackURL: '/verify-email',
        })

        pending = false

        if (result.error !== null) {
            error = errorMessage(result.error)
            return
        }

        sentTo = email
    }

    async function resend() {
        if (sentTo === null) {
            return
        }

        pending = true

        const result = await authClient.sendVerificationEmail({
            email: sentTo,
            callbackURL: '/verify-email',
        })

        pending = false
        error = errorMessage(result.error)
        resent = result.error === null
    }
</script>

<svelte:head>
    <title>Register - LemonList</title>
</svelte:head>

<h1>Register</h1>

{#if sentTo === null}
    <form {onsubmit}>
        <label>
            Username
            <input
                type="text"
                name="username"
                autocomplete="username"
                required
                minlength={USERNAME_MIN_LENGTH}
                maxlength={USERNAME_MAX_LENGTH}
                pattern={USERNAME_PATTERN}
                title="Letters, numbers, underscores and dots"
                bind:value={username}
            />
        </label>
        <label>
            Email
            <input type="email" name="email" autocomplete="email" required bind:value={email} />
        </label>
        <label>
            Password
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
            Repeat password
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

        <button type="submit" disabled={pending}>Register</button>
    </form>

    <p>Already have an account? <a href={resolve('login')}>Log in</a></p>
{:else}
    <p>
        Almost done! We've sent a verification link to <strong>{sentTo}</strong>. Open it to
        activate your account.
    </p>

    {#if error !== null}
        <p role="alert">{error}</p>
    {/if}
    {#if resent}
        <p role="status">A new link has been sent.</p>
    {/if}

    <button type="button" disabled={pending} onclick={resend}>Resend the link</button>
{/if}
