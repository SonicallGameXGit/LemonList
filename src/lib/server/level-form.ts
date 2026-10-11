// Parsing of the admin level form (LevelForm.svelte), shared by the new and edit pages
import * as v from 'valibot'
import { CREATOR_MAX_LENGTH, GD_ID_MAX, LEVEL_NAME_MAX_LENGTH } from '#lib/list-rules.ts'
import { USERNAME_MAX_LENGTH } from '#lib/auth-rules.ts'
import { GameDifficulty } from '#lib/list.ts'
import {
    checkbox,
    optionalInteger,
    optionalText,
    optionalUrl,
    parseForm,
    requiredInteger,
    requiredText,
} from '#lib/server/forms.ts'
import type { LevelInput } from '#lib/server/list-actions.ts'

const levelSchema = v.object({
    name: requiredText('Name', LEVEL_NAME_MAX_LENGTH),
    creator: requiredText('Creator', CREATOR_MAX_LENGTH),
    gdId: requiredInteger('Level ID', 1, GD_ID_MAX),
    video: optionalUrl('Verification video'),
    gameDifficulty: v.enum(GameDifficulty, 'Choose the in-game difficulty'),
    // Empty is N/A
    listDifficulty: optionalInteger('LemonList difficulty', 1, Number.MAX_SAFE_INTEGER),
    verifier: optionalText('Verifier', USERNAME_MAX_LENGTH),
    verificationProgress: requiredInteger('Verification progress', 0, 100),
    position: optionalInteger('Place', 1, Number.MAX_SAFE_INTEGER),
    removePreview: checkbox(),
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

    return { data: { input, removePreview: data.removePreview }, failure: null }
}
