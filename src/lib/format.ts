import { asset } from '$app/paths'

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

// Placeholder images from placehold.co, until real uploads exist
export function placeholderImage(width: number, height: number, text: string) {
    return `https://placehold.co/${width}x${height}/2a2a30/9a968f/png?font=montserrat&text=${encodeURIComponent(text)}`
}

// Until avatars are uploaded, everyone gets the default Geometry Dash cube
export function placeholderAvatar() {
    return asset('gd/cube-default.png')
}
