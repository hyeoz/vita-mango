// Palette lifted directly from the 젤리 영양제 design (project/젤리 영양제.dc.html).
export const colors = {
  ink: "#2b2335",
  purple: "#7c5cff",
  purpleDeep: "#5a3fd6",
  pink: "#ff7eb6",
  pinkText: "#c4407f",
  cyan: "#3bc9db",
  yellow: "#ffd23f",
  mango: "#ffb43d",
  mangoLight: "#ffe07a",
  mangoDeep: "#ff9e2c",
  cream: "#fffaf4",
  white: "#ffffff",
  muted: "#9b8fae",
  muted2: "#7d7390",
  muted3: "#5a5168",
  muted4: "#b3a9c2",
  cheek: "#ff7a7a",
  shadow: "rgba(43,35,53,0.1)",
  shadowSoft: "rgba(43,35,53,0.18)",
};

// Maps a colour key returned by the AI backend to a real pill colour.
// `mixed` is the split pink/purple capsule used for 오메가-3.
export const pillColor: Record<string, string> = {
  pink: colors.pink,
  purple: colors.purple,
  yellow: colors.yellow,
  orange: colors.mango,
  cyan: colors.cyan,
  mixed: colors.purple, // gradient handled specially in the Pill component
};

// Per-supplement colours used across the home / 도감 / onboarding screens.
export const suppColor: Record<string, string> = {
  "비타민 C": colors.mango,
  "오메가-3": "mixed",
  "비타민 D": colors.yellow,
  "마그네슘": colors.purple,
  "유산균": colors.cyan,
  "아연": colors.pink,
  "철분": "#ff5d6c",
  "비타민 B": "#ff9f43",
  "코엔자임Q10": "#ffd23f",
  "루테인": "#5ad1a5",
};
