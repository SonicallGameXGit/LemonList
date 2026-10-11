// Drag and drop sorting of a keyed {#each} list with SortableJS
import Sortable from 'sortablejs'
import type { Attachment } from 'svelte/attachments'

type SortableOptions = {
    // Selector of the drag handle inside the items
    handle: string
    disabled: boolean
    // Indexes among the children of the list
    onsort: (from: number, to: number) => void
}

export function sortable(options: SortableOptions): Attachment<HTMLElement> {
    return (list) => {
        let nextSibling: Node | null = null

        const instance = Sortable.create(list, {
            handle: options.handle,
            disabled: options.disabled,
            animation: 150,
            ghostClass: 'opacity-40',
            setData: (dataTransfer, item) => {
                // Hold the dragged card by the center of its handle instead of its top-left corner
                const handle = item.querySelector(options.handle)

                if (handle === null) {
                    return
                }

                const itemRect = item.getBoundingClientRect()
                const handleRect = handle.getBoundingClientRect()

                dataTransfer.setDragImage(
                    item,
                    handleRect.left - itemRect.left + handleRect.width / 2,
                    handleRect.top - itemRect.top + handleRect.height / 2,
                )
            },
            onStart: (event) => {
                nextSibling = event.item.nextSibling
            },
            onEnd: (event) => {
                // SortableJS moves the node itself, put it back so Svelte keeps owning the DOM and
                // reorders it from the data instead
                list.insertBefore(event.item, nextSibling)

                const from = event.oldIndex
                const to = event.newIndex

                if (from === undefined || to === undefined || from === to) {
                    return
                }

                options.onsort(from, to)
            },
        })

        return () => instance.destroy()
    }
}
