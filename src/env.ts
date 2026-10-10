import { defineEnvVars } from '@sveltejs/kit/env'

const optional = (value: string | undefined) => {
    if (value === undefined || value === '') {
        return undefined
    }

    return value
}

export const variables = defineEnvVars({
    DATABASE_URL: { description: 'The database connection string.' },
    ORIGIN: {
        description: 'The app origin (base URL), e.g. `http://localhost:5173`.',
    },
    BETTER_AUTH_SECRET: {
        description:
            'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).',
    },
    SMTP_URL: {
        description:
            'SMTP connection URL used to send emails, e.g. `smtps://user:password@smtp.example.com:465`. If empty, emails are printed to the server console instead (development only).',
        schema: optional,
    },
    MEDIA_DIR: {
        description:
            'Directory for uploaded media (avatars, level previews), outside of `build/` and `static/`. Defaults to `media` in the working directory.',
        schema: (value) => optional(value) ?? 'media',
    },
    MAIL_FROM: {
        description: 'Sender address for outgoing emails, e.g. `LemonList <noreply@example.com>`.',
        schema: optional,
    },
})
