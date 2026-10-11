// Validation of the form actions. Every action returns the same shape, `action` tells pages with
// several forms which one the message belongs to
import { fail, type ActionFailure } from '@sveltejs/kit'
import * as v from 'valibot'
import { URL_MAX_LENGTH } from '#lib/list-rules.ts'
import { MediaError } from '#lib/server/media.ts'

export type FormResult = {
    action: string
    error: string | null
    success: string | null
}

export function formFailure(action: string, message: string, status = 400) {
    return fail(status, { action, error: message, success: null } satisfies FormResult)
}

export function formSuccess(action: string, message: string | null = null): FormResult {
    return { action, error: null, success: message }
}

// Errors with a message that is safe to show to the user
export class ActionError extends Error {}

type Parsed<T> = { data: T; failure: null } | { data: null; failure: ActionFailure<FormResult> }

// Runs the task of an action, turning expected errors into a failure of the form
export async function run<T>(action: string, task: () => T | Promise<T>): Promise<Parsed<T>> {
    try {
        return { data: await task(), failure: null }
    } catch (error) {
        if (error instanceof ActionError || error instanceof MediaError) {
            return { data: null, failure: formFailure(action, error.message) }
        }

        throw error
    }
}

// Same as run, for actions that only report the outcome
export async function attempt(
    action: string,
    task: () => unknown,
    successMessage: string | null = null,
) {
    const result = await run(action, task)

    if (result.failure !== null) {
        return result.failure
    }

    return formSuccess(action, successMessage)
}

export function parseForm<TSchema extends v.GenericSchema>(
    action: string,
    formData: FormData,
    schema: TSchema,
): Parsed<v.InferOutput<TSchema>> {
    // Files are read separately with formImage
    const fields = Object.fromEntries(
        [...formData.entries()].filter((entry) => typeof entry[1] === 'string'),
    )
    const result = v.safeParse(schema, fields)

    if (result.success) {
        return { data: result.output, failure: null }
    }

    return { data: null, failure: formFailure(action, result.issues[0].message) }
}

// Bytes of an uploaded image, null when no file was chosen (browsers send an empty file then)
export async function formImage(formData: FormData, name: string) {
    const file = formData.get(name)

    if (!(file instanceof File) || file.size === 0) {
        return null
    }

    return new Uint8Array(await file.arrayBuffer())
}

function isHttpUrl(value: string) {
    if (!URL.canParse(value)) {
        return false
    }

    const protocol = new URL(value).protocol

    return protocol === 'http:' || protocol === 'https:'
}

function emptyToNull(value: string) {
    return value === '' ? null : value
}

export function requiredText(label: string, maxLength: number) {
    return v.pipe(
        v.optional(v.string(), ''),
        v.trim(),
        v.nonEmpty(`${label} is required`),
        v.maxLength(maxLength, `${label} can be up to ${maxLength} characters`),
    )
}

export function optionalText(label: string, maxLength: number) {
    return v.pipe(
        v.optional(v.string(), ''),
        v.trim(),
        v.maxLength(maxLength, `${label} can be up to ${maxLength} characters`),
        v.transform(emptyToNull),
    )
}

export function requiredUrl(label: string) {
    return v.pipe(
        requiredText(label, URL_MAX_LENGTH),
        v.check(isHttpUrl, `${label} must be a link starting with https://`),
    )
}

export function optionalUrl(label: string) {
    return v.pipe(
        v.optional(v.string(), ''),
        v.trim(),
        v.maxLength(URL_MAX_LENGTH, `${label} can be up to ${URL_MAX_LENGTH} characters`),
        v.check(
            (value) => value === '' || isHttpUrl(value),
            `${label} must be a link starting with https://`,
        ),
        v.transform(emptyToNull),
    )
}

function wholeNumber(label: string, min: number, max: number) {
    return v.pipe(
        v.string(),
        v.check((value) => /^\d+$/.test(value), `${label} must be a whole number`),
        v.transform(Number),
        v.minValue(min, `${label} must be at least ${min}`),
        v.maxValue(max, `${label} can be at most ${max}`),
    )
}

export function requiredInteger(label: string, min: number, max: number) {
    return v.pipe(
        v.optional(v.string(), ''),
        v.trim(),
        v.nonEmpty(`${label} is required`),
        wholeNumber(label, min, max),
    )
}

// An empty field gives null
export function optionalInteger(label: string, min: number, max: number) {
    return v.pipe(
        v.optional(v.string(), ''),
        v.trim(),
        v.union([
            v.pipe(
                v.literal(''),
                v.transform(() => null),
            ),
            wholeNumber(label, min, max),
        ]),
    )
}

// Database ids in hidden inputs, any error means the page was tampered with or is outdated
export function id() {
    return requiredInteger('ID', 1, Number.MAX_SAFE_INTEGER)
}

// Checked checkboxes send "on", unchecked ones send nothing
export function checkbox() {
    return v.pipe(
        v.optional(v.string(), ''),
        v.transform((value) => value !== ''),
    )
}
