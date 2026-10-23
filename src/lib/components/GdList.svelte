<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { Attachment } from 'svelte/attachments'

    type Props = {
        variant?: 'levels' | 'comments'
        // Page links scroll to it (Pagination's anchor)
        id?: string
        // Attached to the <ol> holding the rows, e.g. for drag and drop sorting
        attach?: Attachment<HTMLOListElement>
        children: Snippet
    }

    // Brown list with the green frame from the online levels screen
    let { variant = 'levels', id, attach, children }: Props = $props()
</script>

<div {id} class="relative mx-3.5 mt-6 mb-5 scroll-mt-10">
    <ol
        class={['bg-gd-list pt-2 pb-3.5', variant === 'levels' ? 'gd-list' : 'gd-comments']}
        {@attach attach}
    >
        {@render children()}
    </ol>
    <!-- 9-sliced at 0.4 scale. The slices end where the edges become uniform: any closer and the
     ends of the corner pieces (and their white outline) get stretched with the list -->
    <div
        class="pointer-events-none absolute -inset-x-3.5 -top-6 -bottom-5 [border-width:36px_34px_38.4px] border-solid border-transparent [border-image:url('/gd/leaderboardbox.png')_90_85_96_/_36px_34px_38.4px_stretch]"
        aria-hidden="true"
    ></div>
</div>
