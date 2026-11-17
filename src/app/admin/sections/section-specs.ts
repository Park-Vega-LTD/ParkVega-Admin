/**
 * The website sections staff can edit, as forms. These mirror the API's
 * rules (park-vega-services: src/modules/content/page-block-specs.ts) and the
 * website's built-in copy (parkvega-web: src/lib/page-blocks.ts); keep all
 * three in step when adding a field. `defaults` pre-fill a form for a section
 * nobody has saved yet, so staff start from what the website shows.
 */

export type Field =
  | {
      kind: "text";
      label: string;
      max: number;
      optional?: boolean;
      /** Several lines (a textarea) instead of one. */
      long?: boolean;
      help?: string;
    }
  | { kind: "select"; label: string; options: readonly { value: string; label: string }[]; help?: string }
  /** A YouTube video: staff paste a link and the 11-character ID is stored. */
  | { kind: "youtube"; label: string; help?: string }
  /** A page on the website, starting with "/". */
  | { kind: "link"; label: string; help?: string }
  | { kind: "list"; label: string; itemLabel: string; of: Field; min?: number; max: number; help?: string }
  | { kind: "object"; fields: Record<string, Field> };

export type SectionSpec = {
  page: string;
  block: string;
  title: string;
  help: string;
  /** Where the section is on the website, for the "View on site" link. */
  path: string;
  fields: Record<string, Field>;
  defaults: Record<string, unknown>;
};

export const ICON_OPTIONS = [
  { value: "clock", label: "Clock" },
  { value: "shirt", label: "Shirt" },
  { value: "users", label: "People" },
  { value: "life-buoy", label: "Life ring" },
  { value: "cake", label: "Birthday cake" },
  { value: "school", label: "School" },
  { value: "ticket", label: "Ticket" },
  { value: "umbrella", label: "Umbrella" },
  { value: "utensils", label: "Knife & fork" },
  { value: "waves", label: "Waves" },
  { value: "shield-check", label: "Safety shield" },
  { value: "map-pin", label: "Map pin" },
  { value: "sun", label: "Sun" },
  { value: "star", label: "Star" },
  { value: "heart", label: "Heart" },
  { value: "camera", label: "Camera" },
  { value: "baby", label: "Baby" },
  { value: "car", label: "Car" },
  { value: "droplets", label: "Water drops" },
  { value: "party-popper", label: "Party popper" },
] as const;

const icon: Field = { kind: "select", label: "Icon", options: ICON_OPTIONS };

const heading: Record<string, Field> = {
  eyebrow: { kind: "text", label: "Small label above the title", max: 60 },
  title: { kind: "text", label: "Title", max: 120 },
  description: { kind: "text", label: "Intro text", max: 300, optional: true, long: true },
};

export const HOME_SECTIONS: SectionSpec[] = [
  {
    page: "home",
    block: "videos",
    title: "See the park in action (videos)",
    help: "The copy beside the homepage videos, and the videos themselves. The background photo is under Page images → Homepage videos background.",
    path: "/#park-videos",
    fields: {
      ...heading,
      chips: {
        kind: "list",
        label: "Highlights",
        itemLabel: "Highlight",
        of: { kind: "text", label: "Highlight", max: 40 },
        max: 5,
        help: "Short pills under the intro, e.g. \"Unlimited rides\".",
      },
      videos: {
        kind: "list",
        label: "Videos",
        itemLabel: "Video",
        min: 1,
        max: 4,
        help: "YouTube Shorts work best: they're tall, like a phone screen.",
        of: {
          kind: "object",
          fields: {
            youtube_id: { kind: "youtube", label: "YouTube link", help: "Paste the video's link from YouTube." },
            title: { kind: "text", label: "Caption", max: 60 },
            badge: { kind: "text", label: "Round badge text", max: 24, optional: true, help: "e.g. \"Wave pool\". Leave empty for no badge." },
            tone: {
              kind: "select",
              label: "Badge colour",
              options: [
                { value: "lime", label: "Lime green" },
                { value: "coral", label: "Coral" },
                { value: "cyan", label: "Splash blue" },
              ],
            },
          },
        },
      },
    },
    defaults: {
      eyebrow: "Watch · filmed at Park Vega",
      title: "See the park in action.",
      description:
        "Real guests, real splashes. Ride the slides and float the waves before you even get here – tap a video to play it.",
      chips: ["15 attractions", "Unlimited rides", "Fun for every age"],
      videos: [
        { youtube_id: "0lGxolhIYxI", title: "Slides. Waves. Smiles.", badge: "Thrill slides", tone: "lime" },
        { youtube_id: "rF4kpE23AeE", title: "Your kind of fun", badge: "Wave pool", tone: "coral" },
      ],
    },
  },
  {
    page: "home",
    block: "plan-visit",
    title: "Plan your visit",
    help: "The rules list and ticket price table on the homepage. The opening days and hours line is always first and comes from Homepage & visit.",
    path: "/#plan-your-visit",
    fields: {
      ...heading,
      rules: {
        kind: "list",
        label: "Good-to-know list",
        itemLabel: "Item",
        max: 6,
        of: { kind: "object", fields: { icon, text: { kind: "text", label: "Text", max: 140 } } },
      },
      price_title: { kind: "text", label: "Price table title", max: 40 },
      prices: {
        kind: "list",
        label: "Price rows",
        itemLabel: "Row",
        min: 1,
        max: 6,
        help: "Write {from_price} in a price to show the current \"Tickets from\" price, e.g. \"From {from_price}\".",
        of: {
          kind: "object",
          fields: {
            label: { kind: "text", label: "Who", max: 60 },
            value: { kind: "text", label: "Price", max: 30 },
          },
        },
      },
      group_note: {
        kind: "text",
        label: "Group pricing note",
        max: 200,
        optional: true,
        help: "Shown under the table, followed by an \"Ask on WhatsApp\" link.",
      },
    },
    defaults: {
      eyebrow: "Plan your visit",
      title: "Everything you need for a perfect day.",
      description: "",
      rules: [
        { icon: "shirt", text: "Swimwear required on all slides – no jewellery on rides" },
        { icon: "users", text: "Children under 150cm must be with an adult" },
        { icon: "life-buoy", text: "Non-swimmers must use life jackets or tubes and stay in the shallow end" },
      ],
      price_title: "Ticket prices",
      prices: [
        { label: "Adults & kids over 150cm", value: "From {from_price}" },
        { label: "Kids 90cm – 150cm", value: "Child rate" },
        { label: "Kids under 90cm", value: "Free" },
        { label: "Private cabana · seats 12", value: "Book ahead" },
      ],
      group_note: "Schools, corporates and groups above 20 get group pricing.",
    },
  },
  {
    page: "home",
    block: "celebrate",
    title: "Birthdays & school trips",
    help: "The offer cards on the homepage. Each card has a WhatsApp button and a link to a page on the website.",
    path: "/#celebrate",
    fields: {
      ...heading,
      cards: {
        kind: "list",
        label: "Cards",
        itemLabel: "Card",
        min: 1,
        max: 3,
        of: {
          kind: "object",
          fields: {
            icon,
            title: { kind: "text", label: "Title", max: 60 },
            text: { kind: "text", label: "Text", max: 240, long: true },
            points: {
              kind: "list",
              label: "Ticked points",
              itemLabel: "Point",
              max: 4,
              of: { kind: "text", label: "Point", max: 60 },
            },
            button_label: { kind: "text", label: "WhatsApp button text", max: 30 },
            whatsapp_message: {
              kind: "text",
              label: "WhatsApp message",
              max: 200,
              long: true,
              help: "The message that's ready to send when a guest taps the button.",
            },
            link_label: { kind: "text", label: "Second button text", max: 30 },
            link_href: { kind: "link", label: "Second button goes to", help: "A page on the website, e.g. /birthday-parties" },
          },
        },
      },
    },
    defaults: {
      eyebrow: "Celebrate with us",
      title: "Birthdays & school trips.",
      description: "Bring the whole crew. We'll help you plan everything on WhatsApp, from cabanas to group tickets.",
      cards: [
        {
          icon: "cake",
          title: "Birthday parties",
          text: "Turn a birthday into a splash day. Book a private cabana, add food and drinks, and let the party loose on every slide.",
          points: ["Private cabana for up to 12 guests", "Food & drinks on site"],
          button_label: "Plan a party",
          whatsapp_message: "Hi Park Vega! I'd like to plan a birthday party.",
          link_label: "Party packages",
          link_href: "/birthday-parties",
        },
        {
          icon: "school",
          title: "School excursions",
          text: "A fun, safe day out for pupils, with zero-depth kids' pools, anti-slip floors and life jackets for non-swimmers.",
          points: ["Group pricing for schools", "Staff guidance on every slide"],
          button_label: "Book a school trip",
          whatsapp_message: "Hi Park Vega! I'd like to book a school excursion.",
          link_label: "School trips",
          link_href: "/school-excursions",
        },
      ],
    },
  },
  {
    page: "home",
    block: "testimonials",
    title: "Testimonials",
    help: "What guests say about Park Vega, sliding across the homepage. Use guests' own words, with their permission.",
    path: "/#testimonials",
    fields: {
      ...heading,
      testimonials: {
        kind: "list",
        label: "Testimonials",
        itemLabel: "Testimonial",
        min: 1,
        max: 20,
        of: {
          kind: "object",
          fields: {
            quote: { kind: "text", label: "What they said", max: 400, long: true },
            author: { kind: "text", label: "Name", max: 60 },
            detail: {
              kind: "text",
              label: "Line under the name",
              max: 60,
              optional: true,
              help: "e.g. \"Birthday party, Asaba\". Empty shows \"Park Vega guest\".",
            },
            rating: {
              kind: "select",
              label: "Stars",
              options: [
                { value: "5", label: "★★★★★ 5 stars" },
                { value: "4", label: "★★★★ 4 stars" },
                { value: "3", label: "★★★ 3 stars" },
                { value: "2", label: "★★ 2 stars" },
                { value: "1", label: "★ 1 star" },
              ],
            },
          },
        },
      },
    },
    defaults: {
      eyebrow: "Testimonials",
      title: "Loved by families across Nigeria.",
      description: "Real words from real guests about their day at Park Vega.",
      testimonials: [
        {
          quote:
            "The entry fee covers all activities in the park: the pools, wave pool, slides etc. The activities are really nice for water lovers… Very good security too.",
          author: "Illorah Ella",
          detail: "Park Vega guest",
          rating: "5",
        },
        {
          quote:
            "It was fun, the staff were very friendly and helpful. The meal was great and the bar drinks are top-notch. It's a complete enjoyment package!",
          author: "successfulsunshine Obokparo",
          detail: "Park Vega guest",
          rating: "5",
        },
        {
          quote:
            "It was fun! The lifeguards there are always alert and caring. The staff are welcoming. The environment is neat and the service is top-notch.",
          author: "Esosa Favour",
          detail: "Park Vega guest",
          rating: "5",
        },
      ],
    },
  },
];

/** An empty value for a new list item. */
export function emptyValue(field: Field): unknown {
  switch (field.kind) {
    case "text":
    case "youtube":
    case "link":
      return "";
    case "select":
      return field.options[0]?.value ?? "";
    case "list":
      return [];
    case "object":
      return Object.fromEntries(Object.entries(field.fields).map(([key, f]) => [key, emptyValue(f)]));
  }
}

/** The video ID from a YouTube link (watch, youtu.be, shorts, embed) or a bare ID. */
export function youtubeId(input: string): string {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const match = value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : value;
}

/** Problems that would stop a save, worded for staff, e.g. "Videos › Video 1 › Caption is required". */
export function findProblems(field: Field, value: unknown, path: string[] = []): string[] {
  const where = path.join(" › ");
  switch (field.kind) {
    case "text": {
      const text = typeof value === "string" ? value.trim() : "";
      if (!text && !field.optional) return [`${where} is required`];
      if (text.length > field.max) return [`${where} is longer than ${field.max} characters`];
      return [];
    }
    case "youtube":
      return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value)
        ? []
        : [`${where} isn't a YouTube link we recognise`];
    case "link":
      return typeof value === "string" && /^\/[A-Za-z0-9/_#?=&.-]*$/.test(value.trim())
        ? []
        : [`${where} must be a page on the website, starting with /`];
    case "select":
      return field.options.some((option) => option.value === value) ? [] : [`${where} needs a choice`];
    case "list": {
      const items = Array.isArray(value) ? value : [];
      const problems: string[] = [];
      if (items.length < (field.min ?? 0)) problems.push(`${where} needs at least ${field.min}`);
      if (items.length > field.max) problems.push(`${where} can have at most ${field.max}`);
      items.forEach((item, i) => problems.push(...findProblems(field.of, item, [...path, `${field.itemLabel} ${i + 1}`])));
      return problems;
    }
    case "object": {
      const record = (value ?? {}) as Record<string, unknown>;
      return Object.entries(field.fields).flatMap(([key, f]) =>
        findProblems(f, record[key], f.kind === "object" ? path : [...path, f.label]),
      );
    }
  }
}
