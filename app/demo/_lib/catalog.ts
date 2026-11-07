export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  colors: { name: string; hex: string }[];
  kind:
    | "notebook"
    | "pen"
    | "planner"
    | "tote"
    | "mug"
    | "tray"
    | "clips"
    | "pouch";
  tagline: string;
  description: string;
  details: string[];
  badge?: string;
};

export const categories = ["All", "Paper", "Writing", "Desk", "Everyday carry"];

export const catalog: Product[] = [
  {
    id: "notebook",
    slug: "field-notebook",
    name: "The Field Notebook",
    category: "Paper",
    price: 65000,
    stock: 24,
    colors: [
      { name: "Sand", hex: "#c8a264" },
      { name: "Forest", hex: "#496450" },
      { name: "Clay", hex: "#b87862" },
    ],
    kind: "notebook",
    tagline: "A home for your next good idea.",
    description:
      "For half-formed thoughts, little lists, and ideas worth keeping. Our cloth-bound notebook opens flat and feels right at home wherever you find a quiet moment.",
    details: [
      "A5 · 148 × 210 mm",
      "160 dotted pages · 100 gsm paper",
      "Cloth cover, lay-flat binding, elastic closure",
      "FSC-certified, acid-free paper",
    ],
    badge: "Bestseller",
  },
  {
    id: "pen",
    slug: "everyday-pen",
    name: "The Everyday Pen",
    category: "Writing",
    price: 35000,
    stock: 40,
    colors: [
      { name: "Forest", hex: "#375846" },
      { name: "Ink", hex: "#3d4141" },
      { name: "Terracotta", hex: "#ac705b" },
    ],
    kind: "pen",
    tagline: "One good pen is all you need.",
    description:
      "A reassuring weight, a smooth line, and a satisfying click. A refillable pen that makes everything from your morning list to your next big plan feel a little more considered.",
    details: [
      "0.5 mm black gel ink",
      "Refillable aluminum barrel",
      "Soft matte finish",
      "Compatible with standard gel refills",
    ],
    badge: "Bestseller",
  },
  {
    id: "planner",
    slug: "slow-days-planner",
    name: "The Slow Days Planner",
    category: "Paper",
    price: 95000,
    stock: 18,
    colors: [
      { name: "Sage", hex: "#9da888" },
      { name: "Oat", hex: "#c9bfa6" },
    ],
    kind: "planner",
    tagline: "Make room for what matters.",
    description:
      "An undated weekly planner for days that don't always go to plan. Start anywhere, skip a week, come back when you're ready. There is room for all of it.",
    details: [
      "52 undated weekly spreads",
      "Monthly reflection pages",
      "A5 · 120 gsm cream paper",
      "Linen cover with ribbon bookmark",
    ],
    badge: "New",
  },
  {
    id: "tote",
    slug: "market-tote",
    name: "The Market Tote",
    category: "Everyday carry",
    price: 145000,
    stock: 10,
    colors: [
      { name: "Natural", hex: "#d4c7a8" },
      { name: "Olive", hex: "#6f7854" },
    ],
    kind: "tote",
    tagline: "For whatever the day brings.",
    description:
      "Books, market finds, an extra layer. A generous cotton canvas tote with a little pocket for the things that always find their way to the bottom.",
    details: [
      "Heavyweight 12 oz cotton canvas",
      "38 × 40 × 10 cm",
      "Inside pocket and reinforced handles",
      "Cold wash; air dry",
    ],
    badge: "Small batch",
  },
  {
    id: "mug",
    slug: "morning-mug",
    name: "The Morning Mug",
    category: "Desk",
    price: 120000,
    stock: 12,
    colors: [
      { name: "Chalk", hex: "#dbd8ca" },
      { name: "Moss", hex: "#839078" },
    ],
    kind: "mug",
    tagline: "A good start, held in both hands.",
    description:
      "Warm ceramic, a comfortable handle, and just enough room for your daily ritual. A simple stoneware mug for slow mornings and well-earned pauses.",
    details: [
      "320 ml glazed stoneware",
      "Dishwasher and microwave safe",
      "Matte exterior, glazed interior",
      "Subtle variations make each piece unique",
    ],
  },
  {
    id: "tray",
    slug: "little-things-tray",
    name: "The Little Things Tray",
    category: "Desk",
    price: 85000,
    stock: 8,
    colors: [
      { name: "Walnut", hex: "#a58260" },
      { name: "Oak", hex: "#c3a87c" },
    ],
    kind: "tray",
    tagline: "Everything has a place.",
    description:
      "A quiet landing spot for keys, a favorite pen, or the small things you reach for every day. Smooth edges and natural grain bring a little warmth to your desk.",
    details: [
      "Solid wood · 20 × 10 × 2 cm",
      "Hand-finished with natural oil",
      "Soft felt base",
      "Wipe clean with a dry cloth",
    ],
  },
  {
    id: "clips",
    slug: "brass-page-clips",
    name: "The Brass Page Clips",
    category: "Writing",
    price: 45000,
    stock: 0,
    colors: [{ name: "Brass", hex: "#b89b59" }],
    kind: "clips",
    tagline: "Keep the good bits together.",
    description:
      "A set of four simple brass clips for keeping your page, collecting a few thoughts, or pinning a reminder somewhere you'll see it.",
    details: [
      "Set of 4 solid brass clips",
      "30 mm wide",
      "Develops a natural patina",
      "Reusable paper sleeve",
    ],
    badge: "Back soon",
  },
  {
    id: "pouch",
    slug: "daily-essentials-pouch",
    name: "The Daily Pouch",
    category: "Everyday carry",
    price: 75000,
    stock: 20,
    colors: [
      { name: "Rust", hex: "#ad7257" },
      { name: "Forest", hex: "#52674f" },
    ],
    kind: "pouch",
    tagline: "Your little essentials, together.",
    description:
      "Pens, cables, lip balm, all those little things. A sturdy zip pouch that moves from your desk to your bag without a second thought.",
    details: [
      "Cotton canvas · 21 × 13 cm",
      "Brass zipper",
      "Unlined for a lighter carry",
      "Spot clean only",
    ],
    badge: "New",
  },
];

export type CartLine = { productId: string; color: string; quantity: number };
export type Delivery = "standard" | "express" | "pickup";
export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  note: string;
};
export type OrderItem = CartLine & {
  name: string;
  price: number;
  slug: string;
};
export type Order = {
  id: string;
  owner: string;
  requestId: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
  items: OrderItem[];
  customer: Customer;
  delivery: Delivery;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};
export type Ticket = {
  id: string;
  owner: string;
  createdAt: string;
  subject: string;
  message: string;
  name: string;
  email: string;
};
export type StoreState = {
  products: Product[];
  cart: CartLine[];
  saved: string[];
  coupon: string;
  delivery: Delivery;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  user: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  } | null;
  orders: Order[];
  tickets: Ticket[];
};

export const money = (value: number) =>
  `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
