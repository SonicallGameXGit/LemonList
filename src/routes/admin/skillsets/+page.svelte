<script lang="ts">
    import { enhance } from '$app/forms'
    import { page } from '$app/state'
    import { SKILLSET_DESCRIPTION_MAX_LENGTH, SKILLSET_NAME_MAX_LENGTH } from '#lib/list-rules.ts'
    import type { AdminSkillset } from '#lib/list.ts'
    import { paginate } from '#lib/pagination.ts'
    import Alert from '#lib/components/Alert.svelte'
    import GdButton from '#lib/components/GdButton.svelte'
    import GdList from '#lib/components/GdList.svelte'
    import IconPicker from '#lib/components/IconPicker.svelte'
    import Pagination from '#lib/components/Pagination.svelte'
    import type { PageProps } from './$types'

    let { data, form }: PageProps = $props()

    const iconTypes = 'image/png, image/jpeg, image/webp'
    const fileInputClass =
        'gd-input p-2 font-sans text-base [-webkit-text-stroke:0] file:mr-3 file:cursor-pointer file:rounded-lg file:border-2 file:border-black file:bg-gd-light file:px-3 file:py-1 file:font-gd file:text-white'
    const PAGE_SIZE = 25

    let adding = $state(false)
    // Icon picked for the new skillset, cleared once it's added
    let newIcon = $state('')
    // Id of the skillset being edited or about to be deleted
    let editing: number | null = $state(null)
    let deleting: number | null = $state(null)

    const pages = $derived(paginate(page.url, data.skillsets.length, PAGE_SIZE))
    const shown = $derived(data.skillsets.slice(pages.offset, pages.offset + PAGE_SIZE))

    function startEdit(skillset: AdminSkillset) {
        editing = skillset.id
        deleting = null
    }

    function startDelete(skillset: AdminSkillset) {
        deleting = skillset.id
        editing = null
    }
</script>

<svelte:head>
    <title>Skillsets - Admin - LemonList</title>
</svelte:head>

<form
    method="POST"
    action="?/create"
    enctype="multipart/form-data"
    class="gd-box flex flex-col gap-5 px-3 py-3"
    use:enhance={() => {
        adding = true

        return async ({ result, update }) => {
            // Keeps the fields after a failure, clears them for the next skillset
            await update({ reset: result.type === 'success' })

            if (result.type === 'success') {
                newIcon = ''
            }

            adding = false
        }
    }}
>
    <h2 class="text-center gd-title text-3xl">New skillset</h2>
    <label class="gd-label">
        Name
        <input
            type="text"
            class="gd-input"
            name="name"
            required
            maxlength={SKILLSET_NAME_MAX_LENGTH}
            placeholder="Memory"
        />
    </label>
    <label class="gd-label">
        Description
        <textarea
            class="gd-input"
            name="description"
            rows="2"
            maxlength={SKILLSET_DESCRIPTION_MAX_LENGTH}
            placeholder="What players should vote for it for (optional)"></textarea>
    </label>
    <fieldset class="flex flex-col gap-3">
        <legend class="mb-2 gd-title text-lg">Icon</legend>
        <IconPicker name="icon" bind:value={newIcon} />
        <label class="flex flex-col gap-2">
            <span class="text-base text-ink-200">
                Or upload your own: PNG, JPEG or WebP with a transparent background, up to 2 MB.
                It's used instead of the picked icon.
            </span>
            <input type="file" name="iconFile" accept={iconTypes} class={fileInputClass} />
        </label>
    </fieldset>

    {#if form?.action === 'create'}
        {#if form.error !== null}
            <Alert kind="error">{form.error}</Alert>
        {:else if form.success !== null}
            <Alert kind="success">{form.success}</Alert>
        {/if}
    {/if}

    <div class="flex justify-center">
        <GdButton type="submit" disabled={adding}>{adding ? 'Adding...' : 'Add'}</GdButton>
    </div>
</form>

<div class="gd-dark mt-8 mb-4 p-5 text-center">
    <p>
        Players vote for them on the Main List levels they beat. All skillsets are equal, so they
        have no places. Deleting a skillset deletes its votes.
    </p>
</div>

{#if form?.action === 'skillset' && form.error !== null}
    <div class="mb-4">
        <Alert kind="error">{form.error}</Alert>
    </div>
{/if}

{#if data.skillsets.length === 0}
    <div class="gd-dark mt-6 p-12 text-center">
        <p class="gd-title text-3xl">No skillsets yet</p>
        <p class="mt-2 text-ink-200">
            Add them above, or run <code>pnpm skillsets</code> on the server to add the ones of the Demon
            Ladder.
        </p>
    </div>
{:else}
    <GdList id="skillsets">
        {#each shown as skillset (skillset.id)}
            <li class="flex flex-col gap-4 px-4 py-4 sm:px-6">
                <div class="flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-6">
                    <img
                        src={skillset.iconUrl}
                        alt={skillset.name}
                        class="size-14 shrink-0 object-contain sm:size-16"
                    />

                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                        <p class="truncate gd-title text-2xl sm:text-3xl">{skillset.name}</p>
                        {#if skillset.description !== null}
                            <p class="text-base leading-snug text-black/70">
                                {skillset.description}
                            </p>
                        {/if}
                        <p class="text-base text-black/55">
                            {skillset.levelsCount === 1
                                ? 'Voted on 1 level'
                                : `Voted on ${skillset.levelsCount} levels`}
                        </p>
                    </div>

                    {#if editing !== skillset.id && deleting !== skillset.id}
                        <div class="flex w-full shrink-0 justify-end gap-3 sm:w-auto">
                            <GdButton size="sm" color="cyan" onclick={() => startEdit(skillset)}>
                                Edit
                            </GdButton>
                            <GdButton size="sm" color="red" onclick={() => startDelete(skillset)}>
                                Delete
                            </GdButton>
                        </div>
                    {/if}
                </div>

                {#if editing === skillset.id}
                    <form
                        method="POST"
                        action="?/save"
                        enctype="multipart/form-data"
                        class="gd-dark flex flex-col gap-4 p-4"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                await update({ reset: false })

                                if (result.type === 'success') {
                                    editing = null
                                }
                            }
                        }}
                    >
                        <input type="hidden" name="skillset" value={skillset.id} />
                        <label class="gd-label">
                            Name
                            <input
                                type="text"
                                class="gd-input"
                                name="name"
                                required
                                maxlength={SKILLSET_NAME_MAX_LENGTH}
                                value={skillset.name}
                            />
                        </label>
                        <label class="gd-label">
                            Description
                            <textarea
                                class="gd-input"
                                name="description"
                                rows="2"
                                maxlength={SKILLSET_DESCRIPTION_MAX_LENGTH}
                                value={skillset.description ?? ''}></textarea>
                        </label>
                        <fieldset class="flex flex-col gap-3">
                            <legend class="mb-2 gd-title text-lg">Icon</legend>
                            <IconPicker name="icon" currentUrl={skillset.iconUrl} />
                            <label class="flex flex-col gap-2">
                                <span class="text-base text-ink-200">
                                    Or upload your own, it's used instead of the picked icon.
                                </span>
                                <input
                                    type="file"
                                    name="iconFile"
                                    accept={iconTypes}
                                    class={fileInputClass}
                                />
                            </label>
                        </fieldset>
                        <div class="flex flex-wrap justify-end gap-3">
                            <GdButton color="gray" size="sm" onclick={() => (editing = null)}>
                                Cancel
                            </GdButton>
                            <GdButton type="submit" size="sm">Save</GdButton>
                        </div>
                    </form>
                {:else if deleting === skillset.id}
                    <form
                        method="POST"
                        action="?/delete"
                        class="flex flex-wrap items-center justify-end gap-3"
                        use:enhance={() => {
                            return async ({ update }) => {
                                await update()
                                deleting = null
                            }
                        }}
                    >
                        <input type="hidden" name="skillset" value={skillset.id} />
                        <span class="gd-title text-lg">
                            {skillset.levelsCount === 0
                                ? `Delete ${skillset.name}?`
                                : `Delete ${skillset.name} and its votes?`}
                        </span>
                        <GdButton color="gray" size="sm" onclick={() => (deleting = null)}>
                            Cancel
                        </GdButton>
                        <GdButton type="submit" color="red" size="sm">Delete</GdButton>
                    </form>
                {/if}
            </li>
        {/each}
    </GdList>

    <Pagination current={pages.page} count={pages.pages} anchor="skillsets" />
{/if}
