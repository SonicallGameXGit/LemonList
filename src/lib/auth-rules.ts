// Shared between the server auth config and the client forms
export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const USERNAME_PATTERN = '[a-zA-Z0-9_.]+'
export const PASSWORD_MIN_LENGTH = 8

// Role of the admins in Better Auth's admin plugin, users without a role are regular players
export const ADMIN_ROLE = 'admin'
export const USER_ROLE = 'user'

// Better Auth stores several roles comma separated
export function isAdminRole(role: string | null | undefined) {
    if (role === null || role === undefined) {
        return false
    }

    return role.split(',').some((name) => name.trim() === ADMIN_ROLE)
}
