// Requests to the Geometry Dash servers (the same ones the game makes), to copy the icon kit of a
// game account into the garage
import { ActionError } from '#lib/server/forms.ts'
import {
    IconMode,
    defaultIconKit,
    iconColors,
    iconCount,
    iconModes,
    type IconKit,
    type IconManifest,
} from '#lib/icons.ts'

const SERVER_URL = 'https://www.boomlings.com/database/'

// The same for every request of the game
const SECRET = 'Wmfd2893gb7'

const TIMEOUT = 10_000

// The servers ban IPs that send too many requests, so a player can only look up every few seconds
const LOOKUP_COOLDOWN = 5_000

// Keys of the icons in a user info response (getGJUserInfo20)
const iconKeys: Record<IconMode, string> = {
    [IconMode.Cube]: '21',
    [IconMode.Ship]: '22',
    [IconMode.Ball]: '23',
    [IconMode.Ufo]: '24',
    [IconMode.Wave]: '25',
    [IconMode.Robot]: '26',
    [IconMode.Spider]: '43',
    [IconMode.Swing]: '53',
    [IconMode.Jetpack]: '54',
}

const lastLookups = new Map<string, number>()

async function request(endpoint: string, fields: Record<string, string>) {
    let response: Response

    try {
        response = await fetch(SERVER_URL + endpoint, {
            method: 'POST',
            // The servers refuse requests with a user agent, the game sends none
            headers: { 'User-Agent': '' },
            body: new URLSearchParams({ ...fields, secret: SECRET }),
            signal: AbortSignal.timeout(TIMEOUT),
        })
    } catch {
        throw new ActionError("The Geometry Dash servers aren't answering, try again later")
    }

    if (!response.ok) {
        throw new ActionError("The Geometry Dash servers aren't answering, try again later")
    }

    return response.text()
}

// Responses are 'key:value:key:value...', several objects are separated by '|' and the page info
// follows '#'. Only the first object is read, '-1' (nothing found) gives an empty one
function parseObject(text: string) {
    const parts = text.split('#')[0].split('|')[0].split(':')
    const object = new Map<string, string>()

    for (let index = 0; index + 1 < parts.length; index += 2) {
        object.set(parts[index], parts[index + 1])
    }

    return object
}

function numberOf(object: Map<string, string>, key: string) {
    const value = object.get(key)

    if (value === undefined || !/^\d+$/.test(value)) {
        return null
    }

    return Number(value)
}

// The kit of a game account, null if there is no player with this name. Icons and colors the
// garage doesn't have (the game got new ones, run `pnpm icons`) stay the default ones
export async function fetchGameIconKit(
    manifest: IconManifest,
    playerId: string,
    gdUsername: string,
): Promise<{ username: string; kit: IconKit } | null> {
    const now = Date.now()
    const lastLookup = lastLookups.get(playerId)

    if (lastLookup !== undefined && now - lastLookup < LOOKUP_COOLDOWN) {
        throw new ActionError('Wait a few seconds before looking up again')
    }

    lastLookups.set(playerId, now)

    // The search finds the account and the shown icon, the user info has the rest of the kit
    const found = parseObject(await request('getGJUsers20.php', { str: gdUsername }))
    const accountId = numberOf(found, '16')

    if (accountId === null) {
        return null
    }

    const info = parseObject(
        await request('getGJUserInfo20.php', { targetAccountID: String(accountId) }),
    )
    const username = info.get('1')

    if (username === undefined || username === '') {
        return null
    }

    const kit = defaultIconKit()

    for (const mode of iconModes) {
        const id = numberOf(info, iconKeys[mode])

        if (id !== null && id >= 1 && id <= iconCount(manifest, mode)) {
            kit.icons[mode] = id
        }
    }

    const colorOf = (key: string, fallback: number) => {
        const id = numberOf(info, key)

        return id !== null && id < iconColors.length ? id : fallback
    }

    kit.color1 = colorOf('10', kit.color1)
    kit.color2 = colorOf('11', kit.color2)
    // Accounts from before 2.2 have no glow color, the game uses the secondary one then
    kit.glowColor = colorOf('51', kit.color2)
    kit.glow = numberOf(info, '28') === 1

    // The icon type of the search goes in the order of the garage tabs
    const iconType = numberOf(found, '14')

    if (iconType !== null && iconType < iconModes.length) {
        kit.mode = iconModes[iconType]
    }

    return { username, kit }
}
