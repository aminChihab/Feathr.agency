export const PROMPT_FORMULA = {
  structure: '[Photography style], [technical treatment], [shot type + angle]. [Setting with every object named]. Wearing [material + color + fit + construction of garments + accessories]. [Exact body pose: which hand, which foot, weight, gaze direction]. [Light source + color temperature].',
  rules: [
    'Open with a real photography genre — not "photo of" but "Lo-fi flash photography", "Fine art editorial photography"',
    'Specify technical camera details — film grain, ISO, contrast, color grade',
    'State camera angle and shot type explicitly',
    'Describe environment like a set designer — name every object',
    'Describe outfit like a fashion spec sheet — material, fit, color, brand, construction',
    'Describe pose as body mechanics — which hand does what, weight distribution, gaze',
    'Never use AI language — zero "beautiful", "stunning", "gorgeous". Stay clinical',
    'Describe light by source, not mood — "warm tungsten corridor light" not "moody lighting"',
  ],
  anti_ai_tricks: [
    'Film imperfections: grain, motion blur, slight overexposure',
    'Silhouettes: hide AI rendering artifacts',
    'B&W processing: eliminates AI color artifacts',
    'Mirror selfies with phone brand + case color',
    'Wet surfaces: reflections add realism',
    'Environmental clutter: scattered objects, weathering',
    '"UGC type content, photorealistic, matte skin, micro details"',
    'Brand names anchor the image in reality',
    'Human gestures: peace sign, tucking hair, holding bag',
  ],
}

export const CAROUSEL_RULES = {
  structure: '2 hero shots (full person, slide 1 and final slide) + 3-4 B-roll (POV, hands, legs, close-ups — still her but partial framing). Total 5-6 slides.',
  arc: 'Beginning (hero sets the vibe) → middle (B-roll moments from the day) → payoff (hero glow-up/reveal). Never end on a low note.',
  rules: [
    'Every photo must feel like a real camera roll — selfies, mirror shots, friend-took-it candids, phone-on-timer are all fine',
    'Never mention phone, camera, or "taking a photo" in non-mirror prompts — AI renders it literally',
    'Phone only appears in mirror selfies where it is naturally part of the composition',
    'Every slide must earn its place — spicy, funny, or visually interesting. No boring mundane actions.',
    'B-roll is still HER — partial body (legs, hands, feet, half-face), not objects alone',
    'No weird poses nobody actually does — if you cannot picture a real person doing it, do not prompt it',
    'Same color palette and time of day across all slides',
    'Outfit can progress naturally (casual → dressed up) but visual thread must connect slides',
    'All aspect ratios 4/5 (Instagram portrait)',
  ],
  broll_types: [
    'POV looking down: legs in bathtub, outfit check, lap with something on it',
    'Hand close-up: holding a drink, food, adjusting jewelry — one hand doing something interesting',
    'Half-face / partial selfie: behind a mug, peeking over sunglasses, half hidden',
    'Legs / feet: natural positions like poolside, dangling from countertop, feet in surf',
  ],
}
