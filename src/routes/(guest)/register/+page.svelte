<script lang="ts">
    import { resolve } from '$app/paths'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import {
        USERNAME_MIN_LENGTH,
        USERNAME_MAX_LENGTH,
        USERNAME_PATTERN,
        PASSWORD_MIN_LENGTH,
    } from '#lib/auth-rules.ts'
    import Alert from '#lib/components/Alert.svelte'
    import AuthCard from '#lib/components/AuthCard.svelte'
    import GdButton from '#lib/components/GdButton.svelte'

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

{#if sentTo === null}
    <AuthCard title="Join the list!" subtitle="Create an account to submit your records.">
        <form class="flex flex-col gap-4" {onsubmit}>
            <label class="gd-label">
                Username
                <input
                    type="text"
                    class="gd-input"
                    name="username"
                    autocomplete="username"
                    required
                    minlength={USERNAME_MIN_LENGTH}
                    maxlength={USERNAME_MAX_LENGTH}
                    pattern={USERNAME_PATTERN}
                    title="Letters, numbers, underscores and dots"
                    bind:value={username}
                />
                <span class="font-sans text-base text-white/75 [-webkit-text-stroke:0]">
                    Use your Geometry Dash name, so others can recognize you.
                </span>
            </label>
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
            <label class="gd-label">
                Password
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
                Repeat password
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

            <GdButton type="submit" disabled={pending} class="mt-2 self-center">Register</GdButton>
        </form>

        {#snippet footer()}
            <p>
                Already have an account?
                <a href={resolve('/(guest)/login')} class="gd-link">Log in</a>
            </p>
        {/snippet}
    </AuthCard>
{:else}
    <AuthCard title="Check your inbox!">
        <p class="text-center text-white">
            Almost done! We've sent a verification link to
            <strong class="text-white">{sentTo}</strong>. Open it to activate your account.
        </p>

        {#if error !== null}
            <Alert kind="error">{error}</Alert>
        {/if}
        {#if resent}
            <Alert kind="success">A new link has been sent.</Alert>
        {/if}

        <GdButton disabled={pending} onclick={resend} color="gray" class="self-center"
            >Resend the link</GdButton
        >
    </AuthCard>
{/if}
