<script lang="ts">
    import { goto, refreshAll } from '$app/navigation'
    import { resolve } from '$app/paths'
    import { authClient, errorMessage } from '#lib/auth-client.ts'
    import {
        USERNAME_MIN_LENGTH,
        USERNAME_MAX_LENGTH,
        USERNAME_PATTERN,
        PASSWORD_MIN_LENGTH,
    } from '#lib/auth-rules.ts'
    import type { PageProps } from './$types'

    let { data }: PageProps = $props()

    type FormState = { pending: boolean; error: string | null; success: string | null }

    const newFormState = (): FormState => ({ pending: false, error: null, success: null })

    // Runs an auth request while tracking its pending/error/success state for the form
    async function run(
        state: FormState,
        request: () => Promise<{ error: { message?: string; statusText?: string } | null }>,
        success: string,
    ) {
        state.pending = true
        state.error = null
        state.success = null

        const result = await request()

        state.pending = false
        state.error = errorMessage(result.error)

        if (result.error === null) {
            state.success = success
        }

        return result.error === null
    }

    let username = $state('')
    const usernameForm = $state(newFormState())

    async function changeUsername(event: SubmitEvent) {
        event.preventDefault()

        const changed = await run(
            usernameForm,
            () => authClient.updateUser({ name: username, username, displayUsername: username }),
            'Username changed.',
        )

        if (changed) {
            username = ''
            await refreshAll()
        }
    }

    let newEmail = $state('')
    const emailForm = $state(newFormState())

    async function changeEmail(event: SubmitEvent) {
        event.preventDefault()

        await run(
            emailForm,
            () => authClient.changeEmail({ newEmail, callbackURL: '/dashboard/settings' }),
            'We have sent a confirmation link to your current email. After you approve it, a verification link will be sent to the new address. Your email changes once that link is opened.',
        )
    }

    let currentPassword = $state('')
    let newPassword = $state('')
    let newPasswordRepeat = $state('')
    const passwordForm = $state(newFormState())

    async function changePassword(event: SubmitEvent) {
        event.preventDefault()

        if (newPassword !== newPasswordRepeat) {
            passwordForm.success = null
            passwordForm.error = 'Passwords do not match'
            return
        }

        const changed = await run(
            passwordForm,
            () =>
                authClient.changePassword({
                    currentPassword,
                    newPassword,
                    revokeOtherSessions: true,
                }),
            'Password changed. All your other sessions have been signed out.',
        )

        if (changed) {
            currentPassword = ''
            newPassword = ''
            newPasswordRepeat = ''
        }
    }

    const sessionsForm = $state(newFormState())

    async function signOutEverywhere() {
        const done = await run(sessionsForm, () => authClient.revokeSessions(), 'Signed out.')

        if (done) {
            await goto(resolve('login'), { refreshAll: true })
        }
    }

    let deletePassword = $state('')
    const deleteForm = $state(newFormState())

    async function deleteAccount(event: SubmitEvent) {
        event.preventDefault()

        const requested = await run(
            deleteForm,
            () =>
                authClient.deleteUser({
                    password: deletePassword,
                    callbackURL: '/account-deleted',
                }),
            'Almost done: we have sent a confirmation link to your email. Open it while signed in to permanently delete your account.',
        )

        if (requested) {
            deletePassword = ''
        }
    }
</script>

<svelte:head>
    <title>Settings - LemonList</title>
</svelte:head>

<h1>Account settings</h1>

{#if data.user !== null}
    <section>
        <h2>Username</h2>
        <p>Current username: <strong>{data.user.displayUsername}</strong></p>

        <form onsubmit={changeUsername}>
            <label>
                New username
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

            {@render status(usernameForm)}

            <button type="submit" disabled={usernameForm.pending}>Change username</button>
        </form>
    </section>

    <section>
        <h2>Email</h2>
        <p>Current email: <strong>{data.user.email}</strong></p>

        <form onsubmit={changeEmail}>
            <label>
                New email
                <input
                    type="email"
                    name="email"
                    autocomplete="email"
                    required
                    bind:value={newEmail}
                />
            </label>

            {@render status(emailForm)}

            <button type="submit" disabled={emailForm.pending}>Change email</button>
        </form>
    </section>

    <section>
        <h2>Password</h2>

        <form onsubmit={changePassword}>
            <label>
                Current password
                <input
                    type="password"
                    name="current-password"
                    autocomplete="current-password"
                    required
                    bind:value={currentPassword}
                />
            </label>
            <label>
                New password
                <input
                    type="password"
                    name="new-password"
                    autocomplete="new-password"
                    required
                    minlength={PASSWORD_MIN_LENGTH}
                    bind:value={newPassword}
                />
            </label>
            <label>
                Repeat new password
                <input
                    type="password"
                    name="new-password-repeat"
                    autocomplete="new-password"
                    required
                    minlength={PASSWORD_MIN_LENGTH}
                    bind:value={newPasswordRepeat}
                />
            </label>

            {@render status(passwordForm)}

            <button type="submit" disabled={passwordForm.pending}>Change password</button>
        </form>
    </section>

    <section>
        <h2>Sessions</h2>
        <p>Sign out on every device, including this one.</p>

        {@render status(sessionsForm)}

        <button type="button" disabled={sessionsForm.pending} onclick={signOutEverywhere}>
            Sign out everywhere
        </button>
    </section>

    <section>
        <h2>Delete account</h2>
        <p>
            This permanently deletes your account. Enter your password, then confirm with the link
            sent to your email.
        </p>

        <form onsubmit={deleteAccount}>
            <label>
                Password
                <input
                    type="password"
                    name="delete-password"
                    autocomplete="current-password"
                    required
                    bind:value={deletePassword}
                />
            </label>

            {@render status(deleteForm)}

            <button type="submit" disabled={deleteForm.pending}>Delete my account</button>
        </form>
    </section>
{/if}

{#snippet status(form: FormState)}
    {#if form.error !== null}
        <p role="alert">{form.error}</p>
    {/if}
    {#if form.success !== null}
        <p role="status">{form.success}</p>
    {/if}
{/snippet}
