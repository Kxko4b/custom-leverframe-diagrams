/* ============================================================
   SITE CONTENT — edit everything below, the design will not break.
   This is the ONLY file you need to touch to update your content.
   ============================================================ */

const SITE_CONFIG = {

  // ---------- Top of page ----------
  site: {
    title: "Box & Frame",                 // shows in browser tab and nav
    tagline: "Custom Leverframe Diagrams", // small line under the title in the nav
  },

  // ---------- Hero / intro ----------
  hero: {
    eyebrow: "Signal Box Diagrams, Drawn to Order",
    headline: "Custom Leverframe Diagrams",
    subheadline: "Built lever by lever, box by box.",
    // Pull a lever in the diagram above this text to see it work — that's the whole idea.
  },

  // ---------- About section ----------
  about: {
    heading: "About",
    // Use \n\n for a new paragraph.
    body:
      "I'm Marshi. I draw and build custom leverframe diagrams — the signal box schematics that show how levers, points, signals and locking bars relate to one another on a stretch of track.\n\n" +
      "Every diagram is built to order: a real or imagined signal box, laid out lever by lever, with correct interlocking logic and colour coding. Whether it's for a heritage line, a model railway, or a fictional route, I aim for diagrams that would make sense to a working signalman.\n\n" +
      "I've been drawing these for a few years now, working from track plans, signalling principles, and a fairly stubborn interest in getting the details right.",
    // small credentials / stats row — edit or remove entries freely
    stats: [
      { value: "40+", label: "Frames drawn" },
      { value: "6",   label: "Lever colours" },
      { value: "1:1", label: "Prototype accuracy" },
    ],
  },

  // ---------- Examples section ----------
  examples: {
    heading: "Examples",
    intro: "A handful of frames from recent commissions. Each one is drawn to the client's track plan and box size.",
    // Add or remove items freely. "swatch" must be one of:
    // "stop" (red), "distant" (yellow), "points" (black), "fpl" (blue), "gate" (brown), "spare" (white)
    items: [
      {
        title: "Marlingford Junction — 28 Lever Frame",
        swatch: "points",
        tag: "Heritage line",
        description: "A double-junction box with facing point locks on both diverging routes and a full set of home and distant signals.",
      },
      {
        title: "Sandstern Yard — 16 Lever Frame",
        swatch: "fpl",
        tag: "Model railway",
        description: "Compact shunting yard frame for a layout, with simplified locking to suit the smaller lever count.",
      },
      {
        title: "Whitcombe Crossing — 12 Lever Frame",
        swatch: "gate",
        tag: "Heritage line",
        description: "A level crossing box with gate levers, a single home signal each direction, and a spare lever held for future use.",
      },
      {
        title: "Redbourne Fork — 34 Lever Frame",
        swatch: "stop",
        tag: "Fictional route",
        description: "A fork with bidirectional running, drawn for a fictional branch with a full complement of stop and distant signals.",
      },
    ],
  },

  // ---------- Reviews section ----------
  reviews: {
    heading: "Reviews",
    intro: "Notes from people who've commissioned a frame.",
    items: [
      {
        quote: "Every lever was exactly where it needed to be, and the locking actually made sense. Saved me weeks of working it out myself.",
        name: "T. Ashworth",
        context: "Heritage railway volunteer",
      },
      {
        quote: "I sent over a rough track plan and got back a diagram that looked like it came out of a real signal box. Brilliant attention to detail.",
        name: "R. Voss",
        context: "Model railway builder",
      },
      {
        quote: "Quick turnaround, clear communication throughout, and the finished diagram was exactly what I asked for — nothing more, nothing less.",
        name: "J. Okonkwo",
        context: "Layout designer",
      },
    ],
  },

  // ---------- Terms section ----------
  terms: {
    heading: "Terms",
    intro: "The basics, in plain language.",
    // Each entry becomes one numbered clause.
    clauses: [
      {
        title: "Commissions",
        body: "Each diagram is drawn individually based on the track plan, box size, and lever count you provide. Send as much detail as you can up front — it means fewer revision rounds.",
      },
      {
        title: "Revisions",
        body: "Two rounds of revisions are included with every commission. Further changes after that are handled on request, time permitting.",
      },
      {
        title: "Turnaround",
        body: "Most frames are delivered within one to two weeks depending on complexity and current workload. Larger frames (30+ levers) may take longer.",
      },
      {
        title: "Usage",
        body: "Finished diagrams are yours to use for your project — heritage line, layout, or otherwise. Please credit the work if you share it publicly.",
      },
      {
        title: "Payment",
        body: "Payment details are agreed before work begins. A deposit may be requested for larger frames.",
      },
    ],
  },

  // ---------- Footer ----------
  footer: {
    heading: "Get in touch",
    body: "Have a track plan you'd like drawn up? Get in touch and tell me about the box.",
    // Add/remove links freely. Leave "url" as "#" to hide a link visually disabled.
    links: [
      { label: "Email", url: "mailto:you@example.com" },
      { label: "GitHub", url: "https://github.com/" },
    ],
    colophon: "Drawn and coded by hand. No two frames alike.",
  },
};
