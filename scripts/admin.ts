// Gives or takes the admin role from the command line, needed to make the first admin. After that
// admins can manage each other on the website (Admin > Players)
//   pnpm admin <username or email>           makes the player an admin (and verifies the account)
//   pnpm admin <username or email> --remove  takes the admin role back
//   pnpm admin --list                        lists the admins
import Database from 'better-sqlite3'
import { eq, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../src/lib/server/db/schema.ts'
import { ADMIN_ROLE, USER_ROLE, isAdminRole } from '../src/lib/auth-rules.ts'

const { user } = schema

const databaseUrl = process.env.DATABASE_URL

if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL is not set')
}

const db = drizzle(new Database(databaseUrl), { schema })

const args = process.argv.slice(2)
const remove = args.includes('--remove')
const target = args.find((arg) => !arg.startsWith('--'))

function displayName(row: {
    username: string | null
    displayUsername: string | null
    email: string
}) {
    return `${row.displayUsername ?? row.username ?? '(no username)'} <${row.email}>`
}

if (args.includes('--list')) {
    const admins = db
        .select({
            username: user.username,
            displayUsername: user.displayUsername,
            email: user.email,
            role: user.role,
        })
        .from(user)
        .all()
        .filter((row) => isAdminRole(row.role))

    if (admins.length === 0) {
        console.info('There are no admins yet. Run pnpm admin <username or email> to add one.')
    }

    for (const admin of admins) {
        console.info(displayName(admin))
    }

    process.exit(0)
}

if (target === undefined) {
    console.error('Usage: pnpm admin <username or email> [--remove] | pnpm admin --list')
    process.exit(1)
}

const found = db
    .select({
        id: user.id,
        username: user.username,
        displayUsername: user.displayUsername,
        email: user.email,
        role: user.role,
    })
    .from(user)
    .where(or(eq(user.username, target.toLowerCase()), eq(user.email, target.toLowerCase())))
    .get()

if (found === undefined) {
    console.error(`No account with the username or email "${target}"`)
    process.exit(1)
}

if (remove) {
    db.update(user).set({ role: USER_ROLE }).where(eq(user.id, found.id)).run()
    console.info(`${displayName(found)} is not an admin anymore`)
} else {
    // Admins are trusted, so their account is verified right away
    db.update(user)
        .set({ role: ADMIN_ROLE, accountVerified: true })
        .where(eq(user.id, found.id))
        .run()
    console.info(`${displayName(found)} is an admin now`)
}
