export const contentTypeLabels = {
  steps: "Step-by-Step Guide",
  tools: "Requirements",
  qa: "Q&A",
  terms: "Key Terms",
  summary: "Main Ideas",
  cloze: "Fill-in-the-Blank",
  quotes: "Key Quotes",
  takeaways: "Actionable Takeaways",
  who_said_what: "Who Said What?",
  pros_cons: "Pros & Cons",
  comparison: "Comparison Charts",
  debate_points: "Debate Points",
  timeline: "Timeline/Chronology",
  key_facts: "Key Facts",
  memorable_moments: "Memorable Moments",
  features: "Key Features",
  before_after: "Before & After",
  ingredients: "Ingredients List",
  recipe_steps: "Cooking Steps",
  techniques: "Cooking Techniques",
  tips_tricks: "Chef Tips",
  substitutions: "Ingredient Swaps",
  default: "Flashcards",
};

export const themeOptions = [
  // --- Type 1: Minimalist Solids (Structure is fine as is) ---
  {
    id: "paper",
    name: "Paper",
    type: "solid",
    colors: ["#FFFFFF", "#111827"],
  },
  {
    id: "slate",
    name: "Slate",
    type: "solid",
    colors: ["#1F2937", "#FFFFFF"],
  },
  {
    id: "parchment",
    name: "Parchment",
    type: "solid",
    colors: ["#FBF8F1", "#424039"],
  },
  {
    id: "mint",
    name: "Mint",
    type: "solid",
    colors: ["#EFF7F6", "#1A4D2E"],
  },
  {
    id: "rose",
    name: "Rose",
    type: "solid",
    colors: ["#F8F0F0", "#5E3032"],
  },
  {
    id: "dusk",
    name: "Dusk",
    type: "solid",
    colors: ["#EAEFF9", "#2D3250"],
  },

  // --- Type 2: Modern Gradients (NOW WITH EXPLICIT TEXT COLOR) ---
  {
    id: "ocean",
    name: "Ocean",
    type: "gradient",
    colors: ["#2193b0", "#6dd5ed"],
    textColor: "#FFFFFF", // <-- ADDED
  },
  {
    id: "sunset",
    name: "Sunset",
    type: "gradient",
    colors: ["#ff7e5f", "#feb47b"],
    textColor: "#FFFFFF", // <-- ADDED
  },
  {
    id: "forest",
    name: "Forest",
    type: "gradient",
    colors: ["#134E5E", "#71B280"],
    textColor: "#FFFFFF", // <-- ADDED
  },
  {
    id: "lavender",
    name: "Lavender",
    type: "gradient",
    colors: ["#9796f0", "#fbc7d4"],
    textColor: "#FFFFFF", // <-- ADDED
  },

  // --- Type 3: Themed Icons (NOW WITH EXPLICIT TEXT COLOR) ---
  {
    id: "science",
    name: "Science",
    type: "icon",
    colors: ["#E0F2F1"],
    textColor: "#004D40", // <-- ADDED (Dark Teal)
  },
  {
    id: "tech",
    name: "Tech",
    type: "icon",
    colors: ["#E3F2FD"],
    textColor: "#0D47A1", // <-- ADDED (Dark Blue)
  },
  {
    id: "humanities",
    name: "Humanities",
    type: "icon",
    colors: ["#F3E5F5"],
    textColor: "#4A148C", // <-- ADDED (Dark Purple)
  },
  {
    id: "mathematics",
    name: "Mathematics",
    type: "icon",
    colors: ["#FFF3E0"],
    textColor: "#E65100", // <-- ADDED (Dark Orange)
  },
  {
    id: "art",
    name: "Art",
    type: "icon",
    colors: ["#f5f8c7ff"],
    textColor: "#4d4e41ff", // <-- ADDED (Dark Orange)
  },
  // SVG Patterns
  {
    id: "dots",
    name: "Dots",
    type: "pattern",
    colors: ["#F8FAFC", "#CBD5E1"], // background, pattern color
    textColor: "#334155",
    pattern: "dots",
  },
  {
    id: "grid",
    name: "Grid",
    type: "pattern",
    colors: ["#FFFBEB", "#F59E0B"],
    textColor: "#92400E",
    pattern: "grid",
  },
];
