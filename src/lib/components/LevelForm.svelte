<script lang="ts">
    import type { Snippet } from 'svelte'
    import { enhance } from '$app/forms'
    import { difficultyFilterSprite, difficultySprite } from '#lib/gd.ts'
    import {
        CREATOR_MAX_LENGTH,
        GD_ID_MAX,
        LEVEL_NAME_MAX_LENGTH,
        URL_MAX_LENGTH,
    } from '#lib/list-rules.ts'
    import { Difficulty, difficultyNames, type LevelDraft } from '#lib/list.ts'
    import Alert from './Alert.svelte'
    import GdButton from './GdButton.svelte'

    type Props = {
        // Null for a new level
        level: LevelDraft | null
        action: string
        // Usernames for the verifier suggestions
        players: string[]
        mainListSize: number
        error: string | null
        submitLabel: string
        // Extra buttons next to the submit one
        actions?: Snippet
    }

    let { level, action, players, mainListSize, error, submitLabel, actions }: Props = $props()

    let saving = $state(false)

    // A level from the Future List can also go right below the last one
    const maxPosition = $derived(
        level === null || level.position === null ? mainListSize + 1 : mainListSize,
    )
</script>

<form
    method="POST"
    {action}
    enctype="multipart/form-data"
    class="gd-box flex flex-col gap-6 px-3 py-3"
    use:enhance={() => {
        saving = true

        return async ({ update }) => {
            // Keeps the fields after a failure, success redirects to the level
            await update({ reset: false })
            saving = false
        }
    }}
>
    <div class="grid gap-5 sm:grid-cols-2">
        <label class="gd-label">
            Name
            <input
                type="text"
                class="gd-input"
                name="name"
                required
                maxlength={LEVEL_NAME_MAX_LENGTH}
                value={level?.name ?? ''}
            />
        </label>
        <label class="gd-label">
            Creator
            <input
                type="text"
                class="gd-input"
                name="creator"
                required
                maxlength={CREATOR_MAX_LENGTH}
                value={level?.creator ?? ''}
            />
        </label>
        <label class="gd-label">
            Level ID
            <input
                type="number"
                class="gd-input"
                name="gdId"
                required
                min="1"
                max={GD_ID_MAX}
                value={level?.gdId ?? ''}
            />
        </label>
        <label class="gd-label">
            Verification video (optional)
            <input
                type="url"
                class="gd-input"
                name="video"
                placeholder="https://youtube.com/..."
                maxlength={URL_MAX_LENGTH}
                value={level?.videoUrl ?? ''}
            />
        </label>
    </div>

    {@render difficultyPicker('In-game difficulty', 'gameDifficulty', false)}
    {@render difficultyPicker('LemonList difficulty', 'listDifficulty', true)}

    <div class="grid gap-5 sm:grid-cols-2">
        <label class="gd-label">
            Verifier (optional)
            <input
                type="text"
                class="gd-input"
                name="verifier"
                list="level-form-players"
                placeholder="Username"
                autocomplete="off"
                value={level?.verifier ?? ''}
            />
            <datalist id="level-form-players">
                {#each players as player (player)}
                    <option value={player}></option>
                {/each}
            </datalist>
        </label>
        <label class="gd-label">
            Verification progress, %
            <input
                type="number"
                class="gd-input"
                name="verificationProgress"
                required
                min="0"
                max="100"
                value={level?.verificationProgress ?? 0}
            />
        </label>
    </div>

    <label class="gd-label">
        Place on the Main List
        <input
            type="number"
            class="gd-input"
            name="position"
            min="1"
            max={maxPosition}
            placeholder="Empty keeps it on the Future List"
            value={level?.position ?? ''}
        />
        <span class="font-sans text-base text-ink-200 [-webkit-text-stroke:0]">
            1 is the top, the levels from this place move one down. Only verified levels (100%) can
            be placed. On the Main List you can also drag levels to move them.
        </span>
    </label>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        {#if level !== null}
            <img
                src={level.thumbnailUrl}
                alt=""
                class="aspect-video w-full rounded-lg border-[3px] border-black object-cover sm:w-56"
            />
        {/if}
        <div class="flex flex-1 flex-col gap-3">
            <label class="gd-label">
                Preview (optional)
                <input
                    type="file"
                    name="preview"
                    accept="image/png, image/jpeg, image/webp"
                    class="gd-input p-2 font-sans text-base [-webkit-text-stroke:0] file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-black file:bg-gd-light file:px-3 file:py-1 file:font-gd file:text-white"
                />
                <span class="font-sans text-base text-ink-200 [-webkit-text-stroke:0]">
                    PNG, JPEG or WebP, up to 8 MB. Without a preview the thumbnail of the YouTube
                    video is shown.
                </span>
            </label>
            {#if level !== null && level.hasPreview}
                <label class="flex items-center gap-3 text-lg">
                    <input type="checkbox" name="removePreview" class="size-5 accent-gd-lime" />
                    Remove the uploaded preview
                </label>
            {/if}
        </div>
    </div>

    {#if error !== null}
        <Alert kind="error">{error}</Alert>
    {/if}

    <div class="flex flex-wrap items-center justify-center gap-4">
        {@render actions?.()}
        <GdButton type="submit" disabled={saving}>{saving ? 'Saving...' : submitLabel}</GdButton>
    </div>
</form>

<!-- Like the difficulty filter of the search screen, the chosen face is lit -->
{#snippet difficultyPicker(label: string, name: string, optional: boolean)}
    {@const current = name === 'gameDifficulty' ? level?.gameDifficulty : level?.listDifficulty}
    <fieldset>
        <legend class="mb-2 gd-title text-lg">{label}</legend>
        <div class="flex flex-wrap justify-center gap-3 sm:gap-5">
            {#if optional}
                <label
                    class="flex w-20 cursor-pointer flex-col items-center gap-1 brightness-50 transition-[filter] hover:brightness-75 has-checked:brightness-100 has-focus-visible:brightness-100 sm:w-24"
                    title="Not decided yet"
                >
                    <input
                        type="radio"
                        {name}
                        value=""
                        class="sr-only"
                        checked={current === null || current === undefined}
                    />
                    <img src={difficultySprite(null)} alt="" class="h-16 w-auto sm:h-20" />
                    <span class="gd-title text-sm">Not decided</span>
                </label>
            {/if}
            {#each Object.values(Difficulty) as option (option)}
                <label
                    class="flex w-20 cursor-pointer flex-col items-center gap-1 brightness-50 transition-[filter] hover:brightness-75 has-checked:brightness-100 has-focus-visible:brightness-100 sm:w-24"
                    title={difficultyNames[option]}
                >
                    <input
                        type="radio"
                        {name}
                        value={option}
                        class="sr-only"
                        required={!optional}
                        checked={current === option}
                    />
                    <img src={difficultyFilterSprite(option)} alt="" class="w-full" />
                    <span class="gd-title text-sm"
                        >{difficultyNames[option].replace(' Demon', '')}</span
                    >
                </label>
            {/each}
        </div>
    </fieldset>
{/snippet}
