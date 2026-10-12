// The difficulties of the Demons In Between mod (hiimjasmine00, textures by Krintop), the default
// set of our own meter, and how the mod picks one from the Geometry Dash Demon Ladder (GDDL) tier
// of a level (https://github.com/hiimjasmine00/DemonsInBetween)

// From the easiest
export const dibDifficulties = [
    'Free Demon',
    'Peaceful Demon',
    'Simple Demon',
    'Easy Demon',
    'Casual Demon',
    'Mild Demon',
    'Medium Demon',
    'Normal Demon',
    'Moderate Demon',
    'Tricky Demon',
    'Hard Demon',
    'Harder Demon',
    'Tough Demon',
    'Wild Demon',
    'Insane Demon',
    'Cruel Demon',
    'Crazy Demon',
    'Bizarre Demon',
    'Brutal Demon',
    'Extreme Demon',
    'Radical Demon',
    'Supreme Demon',
    'Ultimate Demon',
    'Horrendous Demon',
    'Inhumane Demon',
    'Slaughter Demon',
    'Apocalyptic Demon',
    'Divine Demon',
    'Silent Demon',
    'Infinite Demon',
]

// Difficulty (1 is Free Demon) of every rounded tier, the same table as the mod. Tiers past the
// end are Silent Demon
const tierDifficulties = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 12, 13, 14, 14, 15, 15, 16, 17, 18, 19, 20, 21, 21,
    22, 22, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29,
]

const SILENT_DEMON = 29
const INFINITE_DEMON = 30

// Only the top 1 of the ladder is Infinite Demon, the mod hardcodes it too
const HARDEST_DEMON_ID = 127323087

// Name of the Demons In Between difficulty of a level, null for tiers below 1
export function dibDifficultyForTier(gdId: number, tier: number) {
    if (gdId === HARDEST_DEMON_ID) {
        return dibDifficulties[INFINITE_DEMON - 1] ?? null
    }

    const difficulty = tierDifficulties[Math.round(tier)] ?? SILENT_DEMON

    if (difficulty < 1) {
        return null
    }

    return dibDifficulties[difficulty - 1] ?? null
}
