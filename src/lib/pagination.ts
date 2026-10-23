// Pages of the long lists, the page is the ?page= query parameter (none is the first page)

// A URL of a load or the read-only page.url of $app/state
type PageUrl = {
    pathname: string
    searchParams: { get: (name: string) => string | null; toString: () => string }
}

// The page asked for in the URL, 1 when it's missing or not a page number
export function pageParam(url: PageUrl) {
    const page = Number(url.searchParams.get('page'))

    return Number.isSafeInteger(page) && page >= 1 ? page : 1
}

// The page of the URL clamped to the pages there are, a list that got shorter shows its last page
export function paginate(url: PageUrl, total: number, size: number) {
    const pages = Math.max(1, Math.ceil(total / size))
    const page = Math.min(pageParam(url), pages)

    return { page, pages, offset: (page - 1) * size }
}

// The URL of another page, keeping the rest of the query
export function pageHref(url: PageUrl, page: number) {
    const params = new URLSearchParams(url.searchParams.toString())

    if (page === 1) {
        params.delete('page')
    } else {
        params.set('page', String(page))
    }

    const query = params.toString()

    return query === '' ? url.pathname : url.pathname + '?' + query
}
