import { SMTP_URL, MAIL_FROM } from '$app/env/private'
import { dev } from '$app/env'
import nodemailer from 'nodemailer'

// Tools that load the config outside of SvelteKit (like the Better Auth CLI) pass an empty string
const transport =
    SMTP_URL === undefined || SMTP_URL === '' ? null : nodemailer.createTransport(SMTP_URL)

if (transport === null && dev === false) {
    console.warn('[mail] SMTP_URL is not set, emails will only be printed to the console')
}

export async function sendMail(to: string, subject: string, text: string) {
    if (transport === null) {
        console.info(`[mail] To: ${to}\n[mail] Subject: ${subject}\n${text}\n`)
        return
    }

    await transport.sendMail({
        from: MAIL_FROM ?? 'LemonList <noreply@localhost>',
        to,
        subject,
        text,
    })
}

export function sendLinkMail(to: string, subject: string, intro: string, url: string) {
    return sendMail(
        to,
        subject,
        `${intro}\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
    )
}
