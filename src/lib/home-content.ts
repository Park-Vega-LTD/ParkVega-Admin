import type { FAQ } from "@/types/api";

import { OPEN_DAYS_LONG, OPEN_HOURS, formatNaira } from "@/lib/site";

/**
 * Static homepage copy. Each block is the fallback shown when the matching
 * REST API collection is empty or unreachable, so the page never renders
 * blank sections. Staff-managed content from the API always wins.
 */

export type AttractionHighlight = {
  name: string;
  description: string;
  tags: string[];
  image: string;
};

export const FALLBACK_ATTRACTIONS: AttractionHighlight[] = [
  {
    name: "Wave Pool",
    description: "Half a million gallons of ocean-style waves across 1,500m² – the heart of the park.",
    tags: ["All ages", "1,500m² pool"],
    image: "/photos/wave-pool-tubes.jpg",
  },
  {
    name: "Space Hole Slide",
    description: "Twists, turns and a spin round the jumbo bowl before you splash down.",
    tags: ["Min. 120cm", "High thrill"],
    image: "/photos/mat-racer-splash.jpg",
  },
  {
    name: "Blackhole Combo",
    description: "A steep drop up a near-vertical wall for a moment of weightlessness. Ride it as a pair.",
    tags: ["Min. 120cm", "Double raft"],
    image: "/photos/slide-tower-tubes.jpg",
  },
  {
    name: "Freefall Slide",
    description: "An extremely thrilling slide with a moment of weightlessness – a must for adrenaline seekers.",
    tags: ["Min. 120cm", "High thrill"],
    image: "/photos/racing-slide-friends.jpg",
  },
  {
    name: "Aqua Tower",
    description: "Four gentle slides and 50+ splash features: tipping bucket, bubbler jets and more.",
    tags: ["Kids", "Zero-depth pool"],
    image: "/splash-pad.jpg",
  },
  {
    name: "Relax Pool",
    description: "A slow, meandering pool with a swim-up bar. Grab a drink and unwind.",
    tags: ["1.2m deep", "Swim-up bar"],
    image: "/lazy-river.jpg",
  },
];

export type MenuHighlight = { name: string; detail?: string; price: number; label: string };

export const FALLBACK_MENU: MenuHighlight[] = [
  { name: "Jollof Rice", price: 4300, label: "Popular choice" },
  { name: "Burger Max Combo + Chips", price: 14100, label: "Popular choice" },
  { name: "Pizza Extravaganza", detail: "Large pizza + 4 wings + 1 soda", price: 18100, label: "Family favourite" },
  { name: "6 Wings + Chips", price: 11800, label: "Popular choice" },
];

export const REVIEWS = [
  {
    quote:
      "The entry fee covers all activities in the park: the pools, wave pool, slides etc. The activities are really nice for water lovers… Very good security too.",
    author: "Illorah Ella",
  },
  {
    quote:
      "It was fun, the staff were very friendly and helpful. The meal was great and the bar drinks are top-notch. It's a complete enjoyment package!",
    author: "successfulsunshine Obokparo",
  },
  {
    quote:
      "It was fun! The lifeguards there are always alert and caring. The staff are welcoming. The environment is neat and the service is top-notch.",
    author: "Esosa Favour",
  },
];

export const DIRECTION_CITIES = [
  { city: "Benin City", origin: "Benin City, Edo State", note: "Head east on the Benin–Asaba Expressway to Agbor." },
  { city: "Asaba", origin: "Asaba, Delta State", note: "Head west on the Benin–Asaba Expressway to Agbor." },
  { city: "Warri", origin: "Warri, Delta State", note: "Drive north towards Abraka, then join the expressway at Agbor." },
  { city: "Onitsha", origin: "Onitsha, Anambra State", note: "Cross the Niger Bridge to Asaba, then head west to Agbor." },
];

/** Official park rules, in the order of the Park Vega rules poster. */
export const PARK_RULES = [
  "Shower before and after swimming",
  "No matter what swimwear a woman wears, she is to be respected",
  "No physical or verbal harassment towards women in any clothing",
  "Only lined swimwear made of swimming-friendly material",
  "Water can be dangerous: non-swimmers must always use life jackets or tubes and stay in the shallow part of the pool",
  "Do not push others into the water",
  "Do not push others below the water",
  "Do not jump into the water",
  "Do not dive into the water",
  "Take special care of children and elderly people",
  "No underwear in the swimming pool",
  "Listen to staff advice on how to use the water slides safely",
  "Footwear and socks are not permitted in the pool or on slides",
  "All children under 3 years must wear swim diapers",
  "All areas of Park Vega are smoke and substance free",
];

/**
 * Items not allowed in the park, from the official prohibited-items list,
 * with plain-language labels. `icon` keys are mapped to icons where the list
 * is rendered.
 */
export const PROHIBITED_ITEMS = [
  { label: "Outside food", icon: "food" },
  { label: "Alcohol", icon: "alcohol" },
  { label: "Glass items", icon: "glass" },
  { label: "Bottles", icon: "bottle" },
  { label: "Chairs", icon: "chair" },
  { label: "Drones", icon: "drone" },
  { label: "Drugs", icon: "drugs" },
  { label: "Guns", icon: "gun" },
  { label: "Knives", icon: "knife" },
  { label: "Pets", icon: "pet" },
  { label: "Jewellery on rides", icon: "jewellery" },
  { label: "Smoking", icon: "smoking" },
  { label: "Sprays", icon: "spray" },
  { label: "Jerry cans & tanks", icon: "tank" },
  { label: "Tasers", icon: "taser" },
] as const;

/**
 * FAQ fallback written in the exact phrasing people type into Google and AI
 * assistants (brief §4). Travel times are approximate and should be confirmed
 * by the Park Vega team.
 */
export function fallbackFaqs(fromPrice: number): FAQ[] {
  const items: [string, string][] = [
    [
      "How much is Park Vega Waterpark ticket?",
      `Tickets start from ${formatNaira(fromPrice)} and give you unlimited access to every attraction from ${OPEN_HOURS}. Children under 90cm get in free. Buy online at parkvega.com/tickets.`,
    ],
    [
      "When is Park Vega Waterpark open?",
      `Park Vega opens on ${OPEN_DAYS_LONG}, from ${OPEN_HOURS}.`,
    ],
    [
      "Is Park Vega good for kids?",
      "Yes. Younger children have the Aqua Tower, Kids Splash Zone and zero-depth pools with anti-slip floors, and life jackets are provided for non-swimmers. The big slides need a minimum height of 120cm, and children under 150cm must be with an adult.",
    ],
    [
      "Where can I take my kids to play in the water in Agbor?",
      "Park Vega Waterpark on Ewuru Road, off the Benin–Asaba Expressway in Agbor, has a wave pool, kids' splash zones, zero-depth pools and gentle slides, with lifeguards on duty.",
    ],
    [
      "How far is Park Vega from Asaba?",
      "Park Vega is in Agbor, roughly a one-hour drive west of Asaba along the Benin–Asaba Expressway. Benin City is a similar distance to the east.",
    ],
    [
      "Is Park Vega worth a special trip from Lagos?",
      "Yes. Park Vega is one of the largest international-standard waterparks in West Africa, with 15 attractions on one ticket. Many visitors from Lagos fly into Benin or Asaba and drive about an hour to the park.",
    ],
    [
      "What should I wear?",
      "Only lined swimwear made of swimming-friendly material. No underwear, footwear or socks in the pools or on the slides, and no jewellery on rides.",
    ],
    [
      "Can I book a birthday party or school trip?",
      "Yes. Private cabanas seat up to 12 guests, and schools, corporates and groups above 20 get group pricing. Chat with us on WhatsApp to plan it.",
    ],
  ];
  return items.map(([question, answer], index) => ({
    id: `faq-${index}`,
    question,
    answer,
    sort_order: index,
  }));
}
