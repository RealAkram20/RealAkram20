// scripts/content.mjs
// Every word on the profile lives here. Edit this file, run `node scripts/build.mjs`,
// commit. The SVGs in assets/ are generated — never edit them by hand.

export const profile = {
  username: "RealAkram20",
  name: "Rio Akram Miiro",
  title: "Full-Stack Web Developer & SaaS Builder",
  company: "ArmGenius",
  companyUrl: "https://armgenius.com/",
  email: "rio@armgenius.com",
  city: "Kampala, Uganda",
  cityShort: "KAMPALA, UG",
  coords: "0.35° N · 32.58° E",
  timezone: "GMT+3",
  linkedin: "https://ug.linkedin.com/in/rio-akram-miiro-8bbb07263",
  instagram: "https://www.instagram.com/rio_akram_miiro/",
  facebook: "https://www.facebook.com/rio.akram.miiro",
  whatsapp: "https://wa.me/256742078673",

  // Rotating role lines under the name (header). Keep each under ~60 chars.
  roles: [
    "Full-Stack Web Developer · Kampala, Uganda",
    "SaaS, web & mobile products, built end to end",
    "Laravel · React · React Native (Expo)",
    "Websites that convert · SEO that gets them found",
  ],

  // Typed terminal line in the header.
  typed: "building ride-hailing, delivery & POS platforms from Kampala",

  // Section 01 — whoami
  whoami: {
    lines: [
      "Founder of ArmGenius: a web & software studio in Kampala with a US entity for international clients.",
      "I ship production systems: ride-hailing, on-demand delivery, point-of-sale SaaS, food-sharing. Web and mobile.",
      "One stack, by decision: Laravel APIs, React web apps, Expo / React Native mobile. Innovation goes into the product, not the toolchain.",
    ],
    rows: [
      ["FOCUS", "Business websites · SEO · SaaS platforms · Mobile apps"],
      ["STATUS", "Open to freelance, contract and partnership work"],
      ["BASED", "Kampala, Uganda (GMT+3) · ArmGenius LLC, US · Arm Genius Digital Marketing, UG"],
    ],
  },

  // Section 02 — shipped. Max 6 cards. `live: true` gets the pulsing dot.
  projects: [
    { name: "KangaruRide", desc: ["Ride-hailing platform: driver app,", "client app and dispatch backend."], stack: "Laravel · React · Expo", status: "DRIVER APP LIVE", live: true },
    { name: "InGo", desc: ["On-demand delivery platform with", "a fleet dashboard. First deploy: Zimbabwe."], stack: "Laravel · React · Expo", status: "IN PRODUCTION", live: true, url: "https://github.com/RealAkram20/Ingo-app" },
    { name: "ArmPOS", desc: ["Point-of-sale SaaS for small", "businesses. In-house product."], stack: "Laravel · React", status: "IN-HOUSE SAAS", live: true },
    { name: "Kugawana", desc: ["Food-sharing platform,", "web and mobile."], stack: "Laravel · TypeScript · Expo", status: "WEB + MOBILE", live: false },
    { name: "Forever Loved", desc: ["Memorial and tribute", "platform."], stack: "Laravel · Blade", status: "LIVE", live: true, url: "https://github.com/RealAkram20/Forever-Loved" },
    { name: "PesaDonations", desc: ["Donations platform.", "Open source."], stack: "PHP", status: "OPEN SOURCE", live: false, url: "https://github.com/RealAkram20/PesaDonations" },
  ],

  // Section 03 — telemetry: static counters that the API cannot know.
  counters: {
    productsLive: 4,
    platforms: "WEB · MOBILE · API",
  },

  // Section 04 — stack
  stack: [
    ["BACKEND", "PHP · Laravel · REST APIs · Queues · MySQL"],
    ["WEB", "React · TypeScript · Tailwind CSS · Vite"],
    ["MOBILE", "React Native · Expo · EAS · Push notifications"],
    ["WEBSITES", "WordPress · Elementor · SEO · Conversion-led design"],
    ["PAYMENTS", "MTN Mobile Money · Airtel Money · Card gateways"],
    ["INFRA", "Linux VPS · Cloudflare · Firebase · GitHub Actions"],
    ["TOOLING", "Git · Composer · Node · Docker · Postman · Figma"],
  ],
  pipeline: ["LARAVEL API", "REACT WEB", "EXPO MOBILE"],

  // Footer
  footer: {
    status: "AVAILABLE FOR PROJECTS — Q4 2026",
    sub: "Tell me what the business needs to do. I will build the system that does it.",
  },
};
