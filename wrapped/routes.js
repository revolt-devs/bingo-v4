export const focusTileIds = [
  "5adf056b-2e03-49fa-9d6a-8fb8b7845200",
  "3823d79f-aa8d-43b2-9d0f-b00d44fd88de",
  "bce8b025-f8b4-4444-bf68-49ef20065726"
];

export const bossLabels = {
  yama: "Yama",
  nightmare: "Nightmare",
  phosanis_nightmare: "Phosani's Nightmare",
  doom_of_mokhaiotl: "Doom of Mokhaiotl"
};

export const tileBossGroups = {
  "5adf056b-2e03-49fa-9d6a-8fb8b7845200": {
    label: "Yama",
    bosses: ["yama"]
  },
  "3823d79f-aa8d-43b2-9d0f-b00d44fd88de": {
    label: "Nightmare / PNM",
    bosses: ["nightmare", "phosanis_nightmare"]
  },
  "bce8b025-f8b4-4444-bf68-49ef20065726": {
    label: "Doom of Mokhaiotl",
    bosses: ["doom_of_mokhaiotl"]
  }
};

export const tileRouteSlugs = {
  "5adf056b-2e03-49fa-9d6a-8fb8b7845200": "oathplate",
  "3823d79f-aa8d-43b2-9d0f-b00d44fd88de": "nightmare-pnm",
  "bce8b025-f8b4-4444-bf68-49ef20065726": "doom-uniques"
};

export const viewRoutes = {
  overview: "/",
  tiles: "/tiles",
  contributors: "/contributors"
};
