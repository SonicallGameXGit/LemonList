<script lang="ts">
    import type { MajorUpdate } from '#lib/changelogs.ts'
    import { formatDate } from '#lib/format.ts'
    import { sprite } from '#lib/gd.ts'
    import GdButton from '#lib/components/GdButton.svelte'

    type Props = {
        update: MajorUpdate
    }

    // A major update, its minor updates open below it like a folder
    let { update }: Props = $props()

    const uid = $props.id()

    let open = $state(false)
</script>

<article class="gd-box">
    <header class="flex flex-wrap items-center gap-x-5 gap-y-3">
        <img src={sprite('star')} alt="" class="size-16 shrink-0 sm:size-20" />
        <div class="min-w-0 flex-1">
            <h2 class="gd-gold text-4xl sm:text-5xl">{update.title}</h2>
            <p class="mt-1 text-base text-ink-200">
                Update {update.version} · {formatDate(update.date)}
            </p>
        </div>
    </header>

    <!-- eslint-disable-next-line svelte/no-at-html-tags -- rendered from our own files in /changelogs -->
    <div class="gd-markdown mt-5 text-lg sm:text-xl">{@html update.html}</div>

    {#if update.minors.length > 0}
        <div class="mt-6">
            <GdButton
                color="cyan"
                size="sm"
                white
                expanded={open}
                controls="{uid}-minors"
                onclick={() => (open = !open)}
            >
                {open
                    ? 'Hide updates'
                    : `Show ${update.minors.length} ${update.minors.length === 1 ? 'update' : 'updates'}`}
            </GdButton>
        </div>
        {#if open}
            <ol id="{uid}-minors" class="gd-tree mt-4">
                {#each update.minors as minor (minor.version)}
                    <li>
                        <div class="gd-dark px-4 py-3">
                            <div class="flex flex-wrap items-baseline gap-x-3">
                                <span class="gd-title text-lg text-gd-yellow">{minor.version}</span>
                                <h3 class="gd-title text-xl">{minor.title}</h3>
                                <span class="ml-auto text-sm text-ink-300">
                                    {formatDate(minor.date)}
                                </span>
                            </div>
                            <!-- eslint-disable-next-line svelte/no-at-html-tags -- rendered from our own files in /changelogs -->
                            <div class="gd-markdown mt-1 text-base">{@html minor.html}</div>
                        </div>
                    </li>
                {/each}
            </ol>
        {/if}
    {/if}
</article>
