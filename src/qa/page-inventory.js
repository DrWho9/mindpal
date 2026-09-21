/**
 * Source of truth for MindPal hash routes, overlays, and smoke CTAs.
 * Blueprints live under docs/page-blueprints/. Keep this list in lockstep
 * with scripts/build.mjs hash allowlist `Ii` and PAGE-AUDIT.md.
 */

export const HOME_ROUTE = "Today";

/** Hash routes accepted by the SPA allowlist after build patches. */
export const HASH_ROUTES = [
  {
    route: "Today",
    title: "Today",
    blueprint: "today.md",
    nav: ["bottom-tab", "brand-home"],
    heading: /Good (morning|afternoon|evening)|Today|Do this next|What do you need help with/i,
    primaryCtas: ["Open hub", "Open Watch with Maddy", "Start the settle"],
  },
  {
    route: "Readings",
    title: "Readings",
    blueprint: "readings.md",
    nav: ["today-step", "explore-card"],
    heading: /Today’s readings|Readings/i,
    primaryCtas: ["Done for today", "Listen", "Copy"],
  },
  {
    route: "Team morning",
    title: "Work team morning ritual",
    blueprint: "team-morning.md",
    nav: ["today-morning-card"],
    heading: /Work team|Team morning|Breathe|Peaceful reading/i,
    primaryCtas: ["Start the breath", "Open the peaceful reading"],
  },
  {
    route: "Later",
    title: "A later pause",
    blueprint: "later.md",
    nav: ["today-step"],
    heading: /A later pause/i,
    primaryCtas: ["Try a two-minute steady detail", "Open Focus for more"],
  },
  {
    route: "Evening",
    title: "Before you sleep",
    blueprint: "evening.md",
    nav: ["today-step"],
    heading: /Close the day gently|Before you sleep/i,
    primaryCtas: ["Save this win", "Write a short wind-down note"],
  },
  {
    route: "Explore",
    title: "Explore",
    blueprint: "explore.md",
    nav: ["bottom-tab"],
    heading: /A little something for today/i,
    primaryCtas: ["Open verse", "Open reading", "Open videos", "Search library"],
  },
  {
    route: "My diary",
    title: "Journal",
    blueprint: "journal.md",
    nav: ["bottom-tab"],
    heading: /Journal|diary|Your private notes/i,
    primaryCtas: ["Search diary", "Save", "Talk to diary"],
  },
  {
    route: "Focus",
    title: "Focus",
    blueprint: "focus.md",
    nav: ["bottom-tab", "today-step"],
    heading: /What are you dealing with/i,
    primaryCtas: ["Browse all practices", "Try the companion demo"],
  },
  {
    route: "Companion",
    title: "Companion",
    blueprint: "companion.md",
    nav: ["bottom-tab", "hubs"],
    heading: /At your pace/i,
    primaryCtas: [
      "Try the local practice guide",
      "Show practice choices",
      "Send to AI companion",
    ],
    smoke: "companion-choices",
  },
  {
    route: "Settings",
    title: "Settings",
    blueprint: "settings.md",
    nav: ["sidebar"],
    heading: /Settings|Preferences|Account/i,
    primaryCtas: ["Sign out", "Edit"],
  },
  {
    route: "Feelings",
    title: "Feelings",
    blueprint: "feelings.md",
    nav: ["sidebar"],
    heading: /Help with how I’m feeling/i,
    primaryCtas: [
      "Read something supportive",
      "Videos",
      "Open my diary",
      "Try a short practice",
    ],
  },
  {
    route: "YouTube directory",
    title: "YouTube directory",
    blueprint: "youtube-directory.md",
    nav: ["sidebar"],
    heading: /Browse external videos|YouTube video directory/i,
    primaryCtas: ["Search titles, creators and descriptions", "Browse the full directory"],
    smoke: "youtube-search",
  },
  {
    route: "Reflect",
    title: "Reflect",
    blueprint: "reflect.md",
    nav: ["sidebar"],
    heading: /Talk with MindPal/i,
    primaryCtas: ["Write without prompts", "Download a copy of my reflection"],
    smoke: "reflect-composer",
  },
  {
    route: "Body, food and wellbeing",
    title: "Body, food and wellbeing",
    blueprint: "body-food-appointment.md",
    nav: ["sidebar"],
    heading: /Body, food and wellbeing/i,
    primaryCtas: [
      "Save my question",
      "Talk this appointment through with Companion",
    ],
    smoke: "appointment-companion",
  },
  {
    route: "Problem",
    title: "Problem hub",
    blueprint: "problem-hub.md",
    nav: ["today-chips", "explore-chips"],
    heading: /What do you need help with|Help with this/i,
    primaryCtas: ["Open hub", "Talk this through with Companion"],
  },
  {
    route: "Struggling mothers",
    title: "Struggling mothers",
    blueprint: "struggling-mothers.md",
    nav: ["sidebar", "feelings", "womens"],
    heading: /Struggling mothers/i,
    primaryCtas: ["Talk this through with Companion", "Write this in Journal"],
  },
  {
    route: "Drugs & alcohol",
    title: "Drugs & alcohol",
    blueprint: "drugs-alcohol.md",
    nav: ["sidebar", "feelings"],
    heading: /Drugs & alcohol/i,
    primaryCtas: [
      "Read the talk-through",
      "Talk this through with Companion",
    ],
  },
  {
    route: "Women’s wellbeing",
    title: "Women’s wellbeing",
    blueprint: "womens-wellbeing.md",
    nav: ["sidebar"],
    heading: /Women|wellbeing|Struggling mothers/i,
    primaryCtas: ["Open the mothers space"],
  },
  {
    route: "Get support",
    title: "Get support",
    blueprint: "get-support.md",
    nav: ["footer", "help-links"],
    heading: /support|Help|Lifeline/i,
    primaryCtas: ["country select", "crisis links"],
  },
  {
    route: "Youth preview",
    title: "Youth preview",
    blueprint: "youth.md",
    nav: ["youth-teaser"],
    heading: /Youth/i,
    primaryCtas: ["Enter youth lab"],
    adultHidden: true,
  },
  {
    route: "Youth lab",
    title: "Youth lab",
    blueprint: "youth.md",
    nav: ["youth-preview"],
    heading: /Youth/i,
    primaryCtas: [],
    adultHidden: true,
  },
];

/** Surfaces that are not hash routes but still need a blueprint. */
export const OVERLAY_PAGES = [
  {
    id: "sign-in",
    title: "Sign-in / local profile",
    blueprint: "sign-in.md",
    heading: /Sign in to begin/i,
  },
  {
    id: "faith-setup",
    title: "Faith preference setup",
    blueprint: "sign-in.md",
    heading: /How should mornings meet you/i,
  },
  {
    id: "profile-facts",
    title: "Age, gender and MindPal facts (incl. men’s health)",
    blueprint: "mens-health-and-profile.md",
    heading: /A little about you|MINDPAL FACTS/i,
  },
];

export const REQUIRED_SMOKES = [
  {
    id: "companion-choices",
    route: "Companion",
    purpose: "Safety chips and Show practice choices must change UI (not no-op).",
  },
  {
    id: "youtube-search",
    route: "YouTube directory",
    purpose: "Directory search field filters entries (not no-op).",
  },
  {
    id: "reflect-composer",
    route: "Reflect",
    purpose: "Choosing a reflection mode reveals the composer textarea.",
  },
  {
    id: "appointment-companion",
    route: "Body, food and wellbeing",
    purpose: "Appointment page has a Companion entry that opens #Companion with a prompt.",
  },
];

export const LIVE_AI_CAVEAT =
  "Live AI Companion requires a same-origin /mindpal/api/companion/status that returns available:true. Static github.io has no companion base — the page stays DETERMINISTIC DEMO · NO LIVE AI. Do not claim Live AI works on GitHub Pages.";

export function hashRouteNames() {
  return HASH_ROUTES.map((item) => item.route);
}

export function blueprintFiles() {
  const names = new Set();
  for (const item of HASH_ROUTES) names.add(item.blueprint);
  for (const item of OVERLAY_PAGES) names.add(item.blueprint);
  return [...names].sort();
}

export function encodeRouteHash(route) {
  return `#${encodeURIComponent(route)}`;
}
