// Parsing of the level form (LevelForm.svelte): the admin pages (new, edit, accepting a
// submission) and the level submissions of the players
import * as v from 'valibot'
import {
    CREATOR_MAX_LENGTH,
    GD_ID_MAX,
    LEVEL_NAME_MAX_LENGTH,
    NOTES_MAX_LENGTH,
} from '#lib/list-rules.ts'
import { USERNAME_MAX_LENGTH } from '#lib/auth-rules.ts'
import { GameDifficulty } from '#lib/list.ts'
import {
    checkbox,
    formImage,
    optionalInteger,
    optionalText,
    optionalUrl,
    parseForm,
    requiredInteger,
    requiredText,
    requiredUrl,
} from '#lib/server/forms.ts'
import { fetchLevelThumbnail } from '#lib/server/level-lookup.ts'
import type { LevelInput, SubmissionInput } from '#lib/server/list-actions.ts'

// Fields of both forms
const levelFields = {
    name: requiredText('Name', LEVEL_NAME_MAX_LENGTH),
    creator: requiredText('Creator', CREATOR_MAX_LENGTH),
    gdId: requiredInteger('Level ID', 1, GD_ID_MAX),
    gameDifficulty: v.enum(GameDifficulty, 'Choose the in-game difficulty'),
    // Empty is N/A
    listDifficulty: optionalInteger('LemonList difficulty', 1, Number.MAX_SAFE_INTEGER),
    // Saves the in-game thumbnail as the preview when no preview is uploaded
    gameThumbnail: checkbox(),
}

const levelSchema = v.object({
    ...levelFields,
    video: optionalUrl('Verification video'),
    verifier: optionalText('Verifier', USERNAME_MAX_LENGTH),
    verificationProgress: requiredInteger('Verification progress', 0, 100),
    position: optionalInteger('Place', 1, Number.MAX_SAFE_INTEGER),
    removePreview: checkbox(),
})

const submissionSchema = v.object({
    ...levelFields,
    video: requiredUrl('Completion video'),
    raw: optionalUrl('Raw footage link'),
    notes: optionalText('Notes', NOTES_MAX_LENGTH),
})

export function parseLevelForm(action: string, formData: FormData) {
    const parsed = parseForm(action, formData, levelSchema)

    if (parsed.failure !== null) {
        return parsed
    }

    const data = parsed.data
    const input: LevelInput = {
        gdId: data.gdId,
        name: data.name,
        creator: data.creator,
        verifier: data.verifier,
        verificationProgress: data.verificationProgress,
        videoUrl: data.video,
        gameDifficulty: data.gameDifficulty,
        listDifficultyId: data.listDifficulty,
        position: data.position,
    }

    return {
        data: { input, removePreview: data.removePreview, gameThumbnail: data.gameThumbnail },
        failure: null,
    }
}

export function parseSubmissionForm(action: string, formData: FormData) {
    const parsed = parseForm(action, formData, submissionSchema)

    if (parsed.failure !== null) {
        return parsed
    }

    const data = parsed.data
    const input: SubmissionInput = {
        gdId: data.gdId,
        name: data.name,
        creator: data.creator,
        gameDifficulty: data.gameDifficulty,
        listDifficultyId: data.listDifficulty,
        videoUrl: data.video,
        rawFootageUrl: data.raw,
        notes: data.notes,
    }

    return { data: { input, gameThumbnail: data.gameThumbnail }, failure: null }
}

// The uploaded preview, otherwise the in-game thumbnail if the form asks for it, otherwise null.
// Throws ActionError if the thumbnail can't be downloaded, call it inside run()
export async function formPreview(formData: FormData, gdId: number, gameThumbnail: boolean) {
    const uploaded = await formImage(formData, 'preview')

    if (uploaded !== null || !gameThumbnail) {
        return uploaded
    }

    return fetchLevelThumbnail(gdId)
}
