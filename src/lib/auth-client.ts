import { createAuthClient } from 'better-auth/svelte'
import { usernameClient } from 'better-auth/client/plugins'

// All auth requests go through /api/auth so Better Auth's rate limiting and origin checks apply
export const authClient = createAuthClient({
    plugins: [usernameClient()],
})

export function errorMessage(error: { message?: string; statusText?: string } | null) {
    if (error === null) {
        return null
    }

    return error.message ?? error.statusText ?? 'Something went wrong'
}

// Only allow same-site relative paths, so ?redirectTo can't send users to another site
export function safeRedirect(target: string | null, fallback: string) {
    if (target === null || !target.startsWith('/') || target.startsWith('//')) {
        return fallback
    }

    return target
}
