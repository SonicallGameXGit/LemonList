// Fixed locale and time zone, so the server and the browser render the same text
const dateFormat = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
})

export function formatDate(date: Date) {
    return dateFormat.format(date)
}

export function formatPoints(points: number) {
    return points.toFixed(2)
}

export function formatEngagement(engagement: number) {
    return engagement.toFixed(1)
}

export function formatSkillsetScore(score: number) {
    return score.toFixed(1)
}
