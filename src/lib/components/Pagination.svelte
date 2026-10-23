<script lang="ts">
    import { page } from '$app/state'
    import { sprite } from '#lib/gd.ts'
    import { pageHref } from '#lib/pagination.ts'

    type Props = {
        current: number
        count: number
        // Id of the element the links scroll to, the top of the page without it
        anchor?: string
    }

    // Arrows and page numbers under a list, hidden when everything fits on one page
    let { current, count, anchor }: Props = $props()

    type Item = { kind: 'page'; page: number } | { kind: 'gap'; after: number }

    // The first and the last page, the current one with `around` pages on both sides and gaps
    // between them. A gap of one page shows that page instead
    function items(around: number) {
        const shown = [1, count]

        for (let number = current - around; number <= current + around; number++) {
            shown.push(number)
        }

        const numbers = shown
            .filter(
                (number, index) =>
                    number >= 1 && number <= count && shown.indexOf(number) === index,
            )
            .sort((a, b) => a - b)
        const result: Item[] = []
        let previous = 0

        for (const number of numbers) {
            if (number - previous === 2) {
                result.push({ kind: 'page', page: number - 1 })
            } else if (number - previous > 2) {
                result.push({ kind: 'gap', after: previous })
            }

            result.push({ kind: 'page', page: number })
            previous = number
        }

        return result
    }

    // Phones only get the first, the current and the last page
    const wide = $derived(items(1))
    const narrow = $derived(items(0))

    function href(number: number) {
        const url = pageHref(page.url, number)

        return anchor === undefined ? url : url + '#' + anchor
    }
</script>

{#if count > 1}
    <nav class="my-6 flex items-center justify-center gap-2 sm:gap-3" aria-label="Pages">
        {@render arrow(current - 1, 'Previous page', '')}
        <ul class="flex items-center gap-1.5 sm:hidden">
            {#each narrow as item (item.kind === 'page' ? item.page : 'gap' + item.after)}
                {@render pageItem(item)}
            {/each}
        </ul>
        <ul class="hidden items-center gap-2 sm:flex">
            {#each wide as item (item.kind === 'page' ? item.page : 'gap' + item.after)}
                {@render pageItem(item)}
            {/each}
        </ul>
        {@render arrow(current + 1, 'Next page', '-scale-x-100')}
    </nav>
{/if}

{#snippet arrow(target: number, label: string, flip: string)}
    {#if target >= 1 && target <= count}
        <!-- eslint-disable svelte/no-navigation-without-resolve -- the current path with a query -->
        <a href={href(target)} class="shrink-0 gd-press" aria-label={label} title={label}>
            <img src={sprite('arrow')} alt="" class={['h-10 w-auto', flip]} />
        </a>
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
    {:else}
        <img src={sprite('arrow')} alt="" class={['h-10 w-auto shrink-0 opacity-30', flip]} />
    {/if}
{/snippet}

{#snippet pageItem(item: Item)}
    <li>
        {#if item.kind === 'gap'}
            <span class="grid size-9 place-items-center gd-title text-lg text-ink-200">…</span>
        {:else if item.page === current}
            <span
                class="grid size-9 place-items-center rounded-lg bg-black/50 gd-title text-lg text-gd-yellow"
                aria-current="page"
            >
                {item.page}
            </span>
        {:else}
            <!-- eslint-disable svelte/no-navigation-without-resolve -- the current path with a query -->
            <a
                href={href(item.page)}
                class="grid size-9 gd-press place-items-center rounded-lg bg-black/25 gd-title text-lg hover:bg-black/40"
                aria-label="Page {item.page}"
            >
                {item.page}
            </a>
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {/if}
    </li>
{/snippet}
