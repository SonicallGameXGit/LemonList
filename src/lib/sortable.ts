// Drag and drop sorting of a keyed {#each} list. The item itself moves, only up and down inside
// the list and held where it was grabbed, the others slide out of its way. SortableJS can't lock
// the axis (its drag image follows the pointer anywhere), so it's done with pointer events
import type { Attachment } from 'svelte/attachments'

type SortableOptions = {
    // Selector of the drag handle inside the items
    handle: string
    disabled: boolean
    // Indexes among the children of the list
    onsort: (from: number, to: number) => void
}

type Drag = {
    pointerId: number
    item: HTMLElement
    items: HTMLElement[]
    from: number
    to: number
    // Page coordinates (scrolling doesn't change them) of the items when the drag started
    tops: number[]
    heights: number[]
    startY: number
    // Where the pointer is now, in the viewport
    clientY: number
    frame: number
}

// Distance from the top and the bottom of the screen where dragging scrolls the page, and the
// fastest scroll in pixels per frame
const SCROLL_EDGE = 80
const SCROLL_SPEED = 18

// How deep the dragged item has to go into another one to swap with it, of the smaller height
// of the two (a short item can't cover two thirds of a tall one, it would never get past it)
const SWAP_OVERLAP = 2 / 3

const draggedStyle = {
    position: 'relative',
    'z-index': '10',
    'box-shadow': '0 8px 24px rgb(0 0 0 / 0.5)',
}

export function sortable(options: SortableOptions): Attachment<HTMLElement> {
    return (list) => {
        let drag: Drag | null = null

        // Moves the item under the pointer and works out the place it would drop at
        function update(current: Drag) {
            const top = current.tops[current.from] ?? 0
            const height = current.heights[current.from] ?? 0
            const last = current.items.length - 1
            const listTop = current.tops[0] ?? 0
            const listBottom = (current.tops[last] ?? 0) + (current.heights[last] ?? 0)
            const offset = Math.min(
                Math.max(current.clientY + window.scrollY - current.startY, listTop - top),
                listBottom - height - top,
            )
            const draggedTop = top + offset
            const draggedBottom = draggedTop + height

            let to = current.from

            for (let index = 0; index < current.items.length; index++) {
                const other = current.items[index]

                if (other === undefined || index === current.from) {
                    continue
                }

                // Where the other item was, it slides out of the way from there
                const otherTop = current.tops[index] ?? 0
                const otherHeight = current.heights[index] ?? 0
                const swapAt = SWAP_OVERLAP * Math.min(height, otherHeight)
                let shift = 0

                if (index < current.from && otherTop + otherHeight - draggedTop >= swapAt) {
                    shift = height
                    to--
                } else if (index > current.from && draggedBottom - otherTop >= swapAt) {
                    shift = -height
                    to++
                }

                other.style.transform = shift === 0 ? '' : `translateY(${shift}px)`
            }

            current.item.style.transform = `translateY(${offset}px)`
            current.to = to
        }

        // Scrolls the page while the pointer is near the top or the bottom of the screen
        function scroll() {
            if (drag === null) {
                return
            }

            const bottomEdge = window.innerHeight - SCROLL_EDGE
            let speed = 0

            if (drag.clientY < SCROLL_EDGE) {
                speed = Math.max(-1, (drag.clientY - SCROLL_EDGE) / SCROLL_EDGE)
            } else if (drag.clientY > bottomEdge) {
                speed = Math.min(1, (drag.clientY - bottomEdge) / SCROLL_EDGE)
            }

            if (speed !== 0) {
                window.scrollBy(0, speed * SCROLL_SPEED)
                update(drag)
            }

            drag.frame = requestAnimationFrame(scroll)
        }

        function start(event: PointerEvent) {
            if (options.disabled || drag !== null || !event.isPrimary || event.button !== 0) {
                return
            }

            const handle =
                event.target instanceof Element ? event.target.closest(options.handle) : null

            if (handle === null) {
                return
            }

            const items = [...list.children].filter((child) => child instanceof HTMLElement)
            const from = items.findIndex((child) => child.contains(handle))
            const item = items[from]

            if (item === undefined) {
                return
            }

            // No text selection, and the events keep coming when the pointer leaves the handle
            event.preventDefault()
            handle.setPointerCapture(event.pointerId)

            const rects = items.map((child) => child.getBoundingClientRect())

            drag = {
                pointerId: event.pointerId,
                item,
                items,
                from,
                to: from,
                tops: rects.map((rect) => rect.top + window.scrollY),
                heights: rects.map((rect) => rect.height),
                startY: event.clientY + window.scrollY,
                clientY: event.clientY,
                frame: 0,
            }

            for (const child of items) {
                child.style.transition = child === item ? 'none' : 'transform 150ms ease'
            }

            for (const [name, value] of Object.entries(draggedStyle)) {
                item.style.setProperty(name, value)
            }

            drag.frame = requestAnimationFrame(scroll)
        }

        function move(event: PointerEvent) {
            if (drag === null || event.pointerId !== drag.pointerId) {
                return
            }

            drag.clientY = event.clientY
            update(drag)
        }

        function finish(event: PointerEvent, drop: boolean) {
            if (drag === null || event.pointerId !== drag.pointerId) {
                return
            }

            const { from, to } = drag
            stop()

            if (drop && from !== to) {
                options.onsort(from, to)
            }
        }

        // Puts every item back, the list moves them from the data after onsort
        function stop() {
            if (drag === null) {
                return
            }

            cancelAnimationFrame(drag.frame)

            for (const child of drag.items) {
                // Together with the transform, so the items don't slide back
                child.style.removeProperty('transition')
                child.style.removeProperty('transform')
            }

            for (const name of Object.keys(draggedStyle)) {
                drag.item.style.removeProperty(name)
            }

            drag = null
        }

        const drop = (event: PointerEvent) => finish(event, true)
        const cancel = (event: PointerEvent) => finish(event, false)

        // The captured pointer's events go to the handle and bubble up here
        list.addEventListener('pointerdown', start)
        list.addEventListener('pointermove', move)
        list.addEventListener('pointerup', drop)
        list.addEventListener('pointercancel', cancel)
        // The handle went away (after a drop it's already over)
        list.addEventListener('lostpointercapture', cancel)

        return () => {
            stop()
            list.removeEventListener('pointerdown', start)
            list.removeEventListener('pointermove', move)
            list.removeEventListener('pointerup', drop)
            list.removeEventListener('pointercancel', cancel)
            list.removeEventListener('lostpointercapture', cancel)
        }
    }
}
