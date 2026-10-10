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
    import { sprite } from '#lib/gd.ts'
    import Alert from '#lib/components/Alert.svelte'
    import Avatar from '#lib/components/Avatar.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import type { Snippet } from 'svelte'
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
            await goto(resolve('/(guest)/login'), { refreshAll: true })
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

    // Placeholder until avatar uploads are implemented
    let avatarNotice = $state(false)

    function uploadAvatar(event: SubmitEvent) {
        event.preventDefault()
        avatarNotice = true
    }
</script>

<svelte:head>
    <title>Settings - LemonList</title>
</svelte:head>

<a
    href={resolve('/dashboard')}
    class="mb-6 inline-block gd-press"
    aria-label="Back to the dashboard"
>
    <img src={sprite('back')} alt="" class="h-16 w-auto" />
</a>

<h1 class="mb-12 gd-gold text-center text-5xl sm:text-6xl">Settings</h1>

{#if data.user !== null}
    <div class="flex flex-col gap-14">
        {@render group('Profile', profile)}
        {@render group('Sign-in', signIn)}
        {@render group('Danger zone', danger)}
    </div>
{/if}

{#snippet group(title: string, content: Snippet)}
    <section class="grid gap-5 md:grid-cols-[14rem_1fr]">
        <h2 class="gd-title text-3xl">{title}</h2>
        <div class="flex flex-col gap-5">{@render content()}</div>
    </section>
{/snippet}

{#snippet profile()}
    {#if data.user !== null}
        <form class="gd-dark flex flex-col gap-5 p-6" onsubmit={uploadAvatar}>
            <div class="flex items-center gap-5">
                <Avatar
                    src={data.user.avatarUrl}
                    name={data.user.displayUsername}
                    class="size-20"
                />
                <label class="gd-label flex-1">
                    Avatar
                    <input
                        type="file"
                        name="avatar"
                        accept="image/png, image/jpeg, image/webp"
                        required
                        class="gd-input p-2 font-sans text-base [-webkit-text-stroke:0] file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-black file:bg-gd-light file:px-3 file:py-1 file:font-gd file:text-white"
                    />
                    <span class="font-sans text-base text-ink-200 [-webkit-text-stroke:0]">
                        PNG, JPEG or WebP, up to 2 MB.
                    </span>
                </label>
            </div>

            {#if avatarNotice}
                <Alert kind="info">Avatar uploads are coming soon.</Alert>
            {/if}

            <GdButton type="submit" color="cyan" size="sm" class="self-start">Upload</GdButton>
        </form>

        <form class="gd-dark flex flex-col gap-5 p-6" onsubmit={changeUsername}>
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
                    placeholder={data.user.displayUsername}
                    bind:value={username}
                />
            </label>

            {@render status(usernameForm)}

            <GdButton type="submit" size="sm" class="self-start" disabled={usernameForm.pending}>
                Change username
            </GdButton>
        </form>
    {/if}
{/snippet}

{#snippet signIn()}
    {#if data.user !== null}
        <form class="gd-dark flex flex-col gap-5 p-6" onsubmit={changeEmail}>
            <label class="gd-label">
                Email
                <input
                    type="email"
                    class="gd-input"
                    name="email"
                    autocomplete="email"
                    required
                    placeholder={data.user.email}
                    bind:value={newEmail}
                />
            </label>

            {@render status(emailForm)}

            <GdButton type="submit" size="sm" class="self-start" disabled={emailForm.pending}>
                Change email
            </GdButton>
        </form>

        <form class="gd-dark flex flex-col gap-5 p-6" onsubmit={changePassword}>
            <label class="gd-label">
                Current password
                <input
                    type="password"
                    class="gd-input"
                    name="current-password"
                    autocomplete="current-password"
                    required
                    bind:value={currentPassword}
                />
            </label>
            <div class="grid gap-5 sm:grid-cols-2">
                <label class="gd-label">
                    New password
                    <input
                        type="password"
                        class="gd-input"
                        name="new-password"
                        autocomplete="new-password"
                        required
                        minlength={PASSWORD_MIN_LENGTH}
                        bind:value={newPassword}
                    />
                </label>
                <label class="gd-label">
                    Repeat new password
                    <input
                        type="password"
                        class="gd-input"
                        name="new-password-repeat"
                        autocomplete="new-password"
                        required
                        minlength={PASSWORD_MIN_LENGTH}
                        bind:value={newPasswordRepeat}
                    />
                </label>
            </div>

            {@render status(passwordForm)}

            <GdButton type="submit" size="sm" class="self-start" disabled={passwordForm.pending}>
                Change password
            </GdButton>
        </form>

        <div class="gd-dark flex flex-col gap-4 p-6">
            <p>Sign out on every device, including this one.</p>

            {@render status(sessionsForm)}

            <GdButton
                color="gray"
                size="sm"
                class="self-start"
                disabled={sessionsForm.pending}
                onclick={signOutEverywhere}
            >
                Sign out everywhere
            </GdButton>
        </div>
    {/if}
{/snippet}

{#snippet danger()}
    <form class="gd-dark flex flex-col gap-5 p-6" onsubmit={deleteAccount}>
        <p>
            Permanently deletes your account. Enter your password, then confirm with the link sent
            to your email.
        </p>
        <label class="gd-label">
            Password
            <input
                type="password"
                class="gd-input"
                name="delete-password"
                autocomplete="current-password"
                required
                bind:value={deletePassword}
            />
        </label>

        {@render status(deleteForm)}

        <GdButton
            type="submit"
            color="red"
            size="sm"
            class="self-start"
            disabled={deleteForm.pending}
        >
            Delete my account
        </GdButton>
    </form>
{/snippet}

{#snippet status(form: FormState)}
    {#if form.error !== null}
        <Alert kind="error">{form.error}</Alert>
    {/if}
    {#if form.success !== null}
        <Alert kind="success">{form.success}</Alert>
    {/if}
{/snippet}
