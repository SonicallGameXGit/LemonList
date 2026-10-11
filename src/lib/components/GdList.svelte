<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { Attachment } from 'svelte/attachments'

    type Props = {
        variant?: 'levels' | 'comments'
        // Attached to the <ol> holding the rows, e.g. for drag and drop sorting
        attach?: Attachment<HTMLOListElement>
        children: Snippet
    }

    // Brown list with the green frame from the online levels screen
    let { variant = 'levels', attach, children }: Props = $props()
</script>

<div class="relative mx-3.5 mt-6 mb-5">
    <ol
        class={['bg-gd-list pt-2 pb-3.5', variant === 'levels' ? 'gd-list' : 'gd-comments']}
        {@attach attach}
    >
        {@render children()}
    </ol>
    <div
        class="pointer-events-none absolute -inset-x-3.5 -top-6 -bottom-5 [border-width:34px_31px] border-solid border-transparent [border-image:url('/gd/leaderboardbox.png')_85_77_/_34px_31px_stretch]"
        aria-hidden="true"
    ></div>
</div>
