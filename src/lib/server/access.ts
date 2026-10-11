// Permission checks for loads and form actions. Layout loads don't run before actions, so every
// action checks the permissions itself
import { error } from '@sveltejs/kit'
import { isAdminRole } from '#lib/auth-rules.ts'
import type { AuthUser } from '#lib/server/auth.ts'

export function isAdmin(user: AuthUser | undefined) {
    if (user === undefined) {
        return false
    }

    return isAdminRole(user.role)
}

export function requireUser(locals: App.Locals) {
    if (locals.user === undefined) {
        error(401, 'Log in first')
    }

    return locals.user
}

export function requireAdmin(locals: App.Locals) {
    const user = requireUser(locals)

    if (!isAdmin(user)) {
        error(403, 'Only admins can do this')
    }

    return user
}
