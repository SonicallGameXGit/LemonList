// Moving a level on the Main or Future List can take our difficulties along: the faces stay at
// their places on the list and the levels move through them. With Medium Demon at #1 and Easy Demon
// at #2, moving the Easy one up makes it the Medium Demon and the other one the Easy Demon. Only
// the levels between the old and the new place change, levels without a difficulty (N/A) keep it.
// Both the move dialog and the server use it, so the admins see exactly what is saved
type ShuffleEntry<T extends { id: number }> = {
    id: number
    difficulty: T | null
}

export type ShuffleChange<T extends { id: number }> = {
    id: number
    from: T
    to: T
}

// Changes for moving the level at the index `from` to the index `to`, `levels` are in the order
// of the list (the hardest first)
export function shuffleDifficulties<T extends { id: number }>(
    levels: ShuffleEntry<T>[],
    from: number,
    to: number,
): ShuffleChange<T>[] {
    const moved = levels[from]
    const target = Math.min(Math.max(to, 0), levels.length - 1)

    if (moved === undefined || from === target) {
        return []
    }

    const reordered = levels.filter((_, index) => index !== from)
    reordered.splice(target, 0, moved)

    const start = Math.min(from, target)
    const end = Math.max(from, target) + 1
    // Faces of the places in between, the same levels take them in their new order
    const faces = levels.slice(start, end).flatMap((level) => level.difficulty ?? [])
    const changes: ShuffleChange<T>[] = []

    reordered
        .slice(start, end)
        .filter((level) => level.difficulty !== null)
        .forEach((level, index) => {
            const face = faces[index]

            if (
                level.difficulty !== null &&
                face !== undefined &&
                face.id !== level.difficulty.id
            ) {
                changes.push({ id: level.id, from: level.difficulty, to: face })
            }
        })

    return changes
}
