<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { ClassValue } from 'svelte/elements'
    import { sprite } from '#lib/gd.ts'

    type Props = {
        label: string
        // Classes of the wrapping row (flex-wrap) holding the items
        class?: ClassValue
        children: Snippet
    }

    // Shows the first row of the items, the next one peeks out and fades away until "Show more"
    let { label, class: className, children }: Props = $props()

    // How much of the second row peeks out, it's also the height of the fade
    const PEEK = 48

    const id = $props.id()
    let expanded = $state(false)
    // Heights of the first row and of all the rows, 0 until measured in the browser
    let rowHeight = $state(0)
    let fullHeight = $state(0)

    const overflowing = $derived(fullHeight > rowHeight + 1)
    const maxHeight = $derived.by(() => {
        if (rowHeight === 0) {
            return '8rem'
        }

        if (!overflowing) {
            return undefined
        }

        return (expanded ? fullHeight : rowHeight + PEEK) + 'px'
    })

    function measure(element: HTMLElement) {
        function update() {
            const items = [...element.children].filter((item) => item instanceof HTMLElement)
            const first = items[0]

            if (first === undefined) {
                rowHeight = 0
                fullHeight = 0
                return
            }

            rowHeight = Math.max(
                ...items
                    .filter((item) => item.offsetTop === first.offsetTop)
                    .map((item) => item.offsetHeight),
            )
            fullHeight = element.offsetHeight
        }

        const observer = new ResizeObserver(update)
        observer.observe(element)

        return () => observer.disconnect()
    }
</script>

<div>
    <!-- The mask is taller than the box by the fade: at the bottom it fades the peeking row, at the
     top the fade hangs below the box and everything shows -->
    <div
        {id}
        class={[
            'overflow-hidden [mask-image:linear-gradient(to_top,transparent,black_var(--peek))] [mask-size:100%_calc(100%+var(--peek))] [mask-repeat:no-repeat] transition-[max-height,mask-position] duration-300 ease-in-out',
            overflowing && !expanded ? '[mask-position:bottom]' : '[mask-position:top]',
        ]}
        style:max-height={maxHeight}
        style:--peek={PEEK + 'px'}
    >
        <div class={className} role="group" aria-label={label} {@attach measure}>
            {@render children()}
        </div>
    </div>

    {#if overflowing}
        <button
            type="button"
            class="mx-auto mt-3 flex gd-press items-center gap-2"
            aria-expanded={expanded}
            aria-controls={id}
            onclick={() => (expanded = !expanded)}
        >
            <img
                src={sprite('arrow')}
                alt=""
                class={[
                    'h-6 w-auto transition-transform duration-300',
                    expanded ? 'rotate-90' : '-rotate-90',
                ]}
            />
            <span class="gd-title text-lg">{expanded ? 'Show less' : 'Show more'}</span>
        </button>
    {/if}
</div>
