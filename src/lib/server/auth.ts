import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private'
import { betterAuth } from 'better-auth/minimal'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins/username'
import { admin } from 'better-auth/plugins/admin'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { getRequestEvent } from '$app/server'
import { db } from '#lib/server/db/index.ts'
import { sendLinkMail } from '#lib/server/mail.ts'
import { deleteMedia } from '#lib/server/media.ts'
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#lib/auth-rules.ts'

export const auth = betterAuth({
    baseURL: ORIGIN,
    secret: BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: PASSWORD_MIN_LENGTH,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: ({ user, url }) =>
            sendLinkMail(
                user.email,
                'Reset your LemonList password',
                'Someone requested a password reset for your LemonList account. Open this link to choose a new password:',
                url,
            ),
    },
    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: ({ user, url }) => {
            // Links resent on sign-in have no callback (defaults to /), show the verification result page instead
            const link = new URL(url)

            if (link.searchParams.get('callbackURL') === '/') {
                link.searchParams.set('callbackURL', '/verify-email')
            }

            return sendLinkMail(
                user.email,
                'Verify your email for LemonList',
                'Open this link to verify this email address for your LemonList account:',
                link.href,
            )
        },
    },
    user: {
        // Set by the server only (uploads, admin tools), never through the client
        additionalFields: {
            // Media key of the uploaded avatar, null shows the default cube
            avatar: { type: 'string', required: false, input: false },
            // The icon kit built in the garage (JSON of IconKit), null until the first save
            iconKit: { type: 'string', required: false, input: false },
            // Manual verification by an admin, protects players from impersonation
            accountVerified: { type: 'boolean', required: true, defaultValue: false, input: false },
        },
        changeEmail: {
            enabled: true,
            // The current (verified) address must approve the change first, then the new one gets a verification link
            sendChangeEmailConfirmation: ({ user, newEmail, url }) =>
                sendLinkMail(
                    user.email,
                    'Confirm your LemonList email change',
                    `Someone requested to change the email of your LemonList account to ${newEmail}. Open this link to approve it:`,
                    url,
                ),
        },
        deleteUser: {
            enabled: true,
            sendDeleteAccountVerification: ({ user, url }) =>
                sendLinkMail(
                    user.email,
                    'Confirm your LemonList account deletion',
                    'Someone requested to permanently delete your LemonList account. Open this link (while signed in) to confirm:',
                    url,
                ),
            afterDelete: async (user) => {
                if ('avatar' in user && typeof user.avatar === 'string') {
                    await deleteMedia(user.avatar)
                }
            },
        },
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            // Account deletion always requires the current password in addition to the email confirmation
            if (ctx.path === '/delete-user') {
                const body: unknown = ctx.body
                const password =
                    typeof body === 'object' && body !== null && 'password' in body
                        ? body.password
                        : undefined

                if (typeof password !== 'string' || password === '') {
                    throw new APIError('BAD_REQUEST', { message: 'Password is required' })
                }
            }
        }),
    },
    plugins: [
        username({
            minUsernameLength: USERNAME_MIN_LENGTH,
            maxUsernameLength: USERNAME_MAX_LENGTH,
        }),
        // Roles and bans (banned users can't sign in and are hidden from the list)
        admin(),
        sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
    ],
})

export type AuthUser = typeof auth.$Infer.Session.user
export type AuthSession = typeof auth.$Infer.Session.session
