export const sites = [
  {
    id: "haven",
    name: "Haven",
    category: "Travel & stays",
    tagline: "Somewhere worth slowing down.",
    description:
      "Find a room, choose your dates, reserve a stay, and manage your bookings.",
    color: "#294e49",
    mark: "H",
    count: "9 stays",
    flow: "Search → dates → reservation → cancellation",
  },
  {
    id: "thyme",
    name: "Table & Thyme",
    category: "Food & drink",
    tagline: "A good day starts with good food.",
    description:
      "Build your lunch order, apply an offer, schedule pickup, and track your orders.",
    color: "#954325",
    mark: "t",
    count: "12 dishes",
    flow: "Menu → basket → pickup → order history",
  },
  {
    id: "daybreak",
    name: "Daybreak",
    category: "Team workspace",
    tagline: "Make room for your best work.",
    description:
      "Plan a project with tasks, owners, priorities, due dates, and a working board.",
    color: "#494399",
    mark: "D",
    count: "12 tasks",
    flow: "Create → assign → edit → move → complete",
  },
  {
    id: "gather",
    name: "Gather",
    category: "Events & community",
    tagline: "Find your next good story.",
    description:
      "Discover workshops and gatherings, reserve tickets, and manage your plans.",
    color: "#803b64",
    mark: "g",
    count: "8 events",
    flow: "Discover → tickets → confirmation → cancellation",
  },
  {
    id: "hireline",
    name: "Hireline",
    category: "Jobs & careers",
    tagline: "Your next chapter starts here.",
    description:
      "Search open roles, save opportunities, apply, and track your applications.",
    color: "#254f8a",
    mark: "h",
    count: "10 jobs",
    flow: "Search → save → apply → track → withdraw",
  },
  {
    id: "careloop",
    name: "Careloop",
    category: "Customer support",
    tagline: "A little help goes a long way.",
    description:
      "Open support requests, exchange messages, resolve issues, and reopen tickets.",
    color: "#206663",
    mark: "c",
    count: "6 tickets",
    flow: "Request → conversation → resolve → reopen",
  },
] as const;
export type SiteId = (typeof sites)[number]["id"];
export const isSite = (value: string): value is SiteId =>
  sites.some((s) => s.id === value);
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const dateAfter = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
export const prettyDate = (date: string) =>
  new Date(date.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const rooms = [
  {
    id: "bamboo-house",
    name: "The Bamboo House",
    location: "Ubud",
    type: "Villa",
    price: 850000,
    guests: 2,
    color: "#b4c7a6",
    detail:
      "Wake up to a quiet rice-field view. A private terrace, soaking tub, and breakfast for two.",
    amenities: ["Breakfast", "Private terrace", "Wi-Fi"],
  },
  {
    id: "ocean-loft",
    name: "Ocean Loft",
    location: "Canggu",
    type: "Loft",
    price: 1200000,
    guests: 3,
    color: "#accad0",
    detail:
      "An airy coastal loft a short walk from the beach, with a full kitchen and sunset balcony.",
    amenities: ["Kitchen", "Beach access", "Wi-Fi"],
  },
  {
    id: "garden-suite",
    name: "Garden Suite",
    location: "Ubud",
    type: "Suite",
    price: 650000,
    guests: 2,
    color: "#c6cba2",
    detail:
      "A peaceful garden suite with a reading nook and a shared pool tucked among palms.",
    amenities: ["Pool", "Breakfast", "Air conditioning"],
  },
  {
    id: "hilltop-cabin",
    name: "Hilltop Cabin",
    location: "Bandung",
    type: "Cabin",
    price: 750000,
    guests: 4,
    color: "#a6b5c6",
    detail:
      "Cool mountain mornings, two bedrooms, and a sheltered deck overlooking the valley.",
    amenities: ["Two bedrooms", "Kitchen", "Parking"],
  },
  {
    id: "city-studio",
    name: "City Studio",
    location: "Jakarta",
    type: "Studio",
    price: 450000,
    guests: 2,
    color: "#d4baa5",
    detail:
      "Your comfortable city base, with a desk, kitchenette, and easy access to public transit.",
    amenities: ["Workspace", "Kitchenette", "Wi-Fi"],
  },
  {
    id: "palm-villa",
    name: "Palm Villa",
    location: "Canggu",
    type: "Villa",
    price: 1750000,
    guests: 6,
    color: "#b6c4b0",
    detail:
      "Bring everyone. Three bedrooms wrap around your own courtyard pool and open living room.",
    amenities: ["Private pool", "Three bedrooms", "Kitchen"],
  },
  {
    id: "heritage-room",
    name: "Heritage Room",
    location: "Yogyakarta",
    type: "Suite",
    price: 550000,
    guests: 2,
    color: "#d5bd93",
    detail:
      "Warm teak interiors in a lovingly restored house, close to the old city's galleries.",
    amenities: ["Breakfast", "Courtyard", "Wi-Fi"],
  },
  {
    id: "forest-hideaway",
    name: "Forest Hideaway",
    location: "Bandung",
    type: "Cabin",
    price: 950000,
    guests: 3,
    color: "#98b2a0",
    detail:
      "A wood-lined retreat beneath tall pines, with a fireplace and a generous outdoor deck.",
    amenities: ["Fireplace", "Forest trails", "Parking"],
  },
  {
    id: "sunrise-apartment",
    name: "Sunrise Apartment",
    location: "Jakarta",
    type: "Loft",
    price: 800000,
    guests: 4,
    color: "#d6c59f",
    detail:
      "A bright two-bedroom apartment with skyline views, a full kitchen, and a building gym.",
    amenities: ["Gym", "Two bedrooms", "Kitchen"],
  },
];
export const dishes = [
  {
    id: "harvest-bowl",
    name: "Harvest Bowl",
    category: "Bowls",
    price: 58000,
    description: "Roasted pumpkin, brown rice, avocado, tahini.",
    dietary: "Vegan",
    available: true,
    color: "#c4cf98",
  },
  {
    id: "chicken-bowl",
    name: "Sesame Chicken Bowl",
    category: "Bowls",
    price: 65000,
    description: "Grilled chicken, sesame rice, pickles, ginger dressing.",
    dietary: "",
    available: true,
    color: "#d9b576",
  },
  {
    id: "miso-bowl",
    name: "Miso Mushroom Bowl",
    category: "Bowls",
    price: 62000,
    description: "Glazed mushrooms, edamame, warm rice, seaweed.",
    dietary: "Vegan",
    available: true,
    color: "#c1af97",
  },
  {
    id: "tomato-toast",
    name: "Summer Tomato Toast",
    category: "Toast",
    price: 42000,
    description: "Sourdough, whipped ricotta, ripe tomatoes, basil.",
    dietary: "Vegetarian",
    available: true,
    color: "#d8a28b",
  },
  {
    id: "avocado-toast",
    name: "Avocado & Egg Toast",
    category: "Toast",
    price: 48000,
    description: "Crushed avocado, soft egg, chili flakes, sourdough.",
    dietary: "Vegetarian",
    available: true,
    color: "#b7c390",
  },
  {
    id: "mushroom-toast",
    name: "Woodland Toast",
    category: "Toast",
    price: 46000,
    description: "Sautéed mushrooms, thyme, creamy labneh.",
    dietary: "Vegetarian",
    available: true,
    color: "#c6b093",
  },
  {
    id: "lemon-cake",
    name: "Lemon Olive Oil Cake",
    category: "Sweet things",
    price: 35000,
    description: "A sunny slice with lemon glaze and yogurt.",
    dietary: "Vegetarian",
    available: true,
    color: "#e3d393",
  },
  {
    id: "brownie",
    name: "Dark Chocolate Brownie",
    category: "Sweet things",
    price: 32000,
    description: "Fudgy chocolate, sea salt, toasted walnut.",
    dietary: "Vegetarian",
    available: false,
    color: "#bd9e8f",
  },
  {
    id: "granola",
    name: "Morning Granola",
    category: "Sweet things",
    price: 38000,
    description: "House granola, coconut yogurt, seasonal fruit.",
    dietary: "Vegan",
    available: true,
    color: "#d8bd99",
  },
  {
    id: "cold-brew",
    name: "Slow Cold Brew",
    category: "Drinks",
    price: 28000,
    description: "Locally roasted coffee, steeped for eighteen hours.",
    dietary: "Vegan",
    available: true,
    color: "#b9a28c",
  },
  {
    id: "matcha",
    name: "Oat Matcha Latte",
    category: "Drinks",
    price: 35000,
    description: "Ceremonial matcha, oat milk, a touch of vanilla.",
    dietary: "Vegan",
    available: true,
    color: "#b9c593",
  },
  {
    id: "lemonade",
    name: "Garden Lemonade",
    category: "Drinks",
    price: 25000,
    description: "Fresh lemon, rosemary, sparkling water.",
    dietary: "Vegan",
    available: true,
    color: "#d7d3a3",
  },
];
export const events = [
  {
    id: "clay-club",
    title: "Sunday Clay Club",
    category: "Workshop",
    location: "Jakarta",
    venue: "Studio Terra, Menteng",
    date: dateAfter(14),
    time: "10:00",
    price: 250000,
    capacity: 8,
    color: "#d5b3a2",
    description:
      "Make a small bowl with local ceramicist Nara. Materials, firing, and a warm cup of tea are included.",
  },
  {
    id: "jazz-garden",
    title: "Jazz in the Garden",
    category: "Music",
    location: "Bandung",
    venue: "The Greenhouse",
    date: dateAfter(17),
    time: "18:30",
    price: 150000,
    capacity: 24,
    color: "#a6bbb0",
    description:
      "An intimate evening of jazz standards and new sounds with the West Java Quartet.",
  },
  {
    id: "design-breakfast",
    title: "Design Breakfast",
    category: "Community",
    location: "Jakarta",
    venue: "Common Ground, SCBD",
    date: dateAfter(20),
    time: "09:00",
    price: 0,
    capacity: 15,
    color: "#b7b2d2",
    description:
      "Meet fellow designers, share a project, and swap ideas over coffee. All experience levels welcome.",
  },
  {
    id: "sourdough",
    title: "Sourdough, Slowly",
    category: "Workshop",
    location: "Yogyakarta",
    venue: "Bread House",
    date: dateAfter(23),
    time: "08:30",
    price: 350000,
    capacity: 6,
    color: "#d6c193",
    description:
      "Learn to feed a starter, fold a dough, and bake a loaf. Take your first loaf and starter home.",
  },
  {
    id: "film-night",
    title: "Under the Stars Cinema",
    category: "Film",
    location: "Canggu",
    venue: "Palm Yard",
    date: dateAfter(26),
    time: "19:00",
    price: 95000,
    capacity: 30,
    color: "#9ab8c3",
    description:
      "An outdoor screening of independent short films. Beanbags and popcorn included.",
  },
  {
    id: "photo-walk",
    title: "Old Town Photo Walk",
    category: "Community",
    location: "Jakarta",
    venue: "Fatahillah Square",
    date: dateAfter(29),
    time: "07:00",
    price: 75000,
    capacity: 12,
    color: "#d4ab93",
    description:
      "Explore the old town in soft morning light with a documentary photographer. Phones welcome.",
  },
  {
    id: "botanical",
    title: "Botanical Watercolors",
    category: "Workshop",
    location: "Ubud",
    venue: "Leaf & Light Studio",
    date: dateAfter(32),
    time: "14:00",
    price: 200000,
    capacity: 0,
    color: "#a7b995",
    description:
      "Paint leaves and flowers from the studio garden. This session is fully booked.",
  },
  {
    id: "acoustic",
    title: "Small Room Sessions",
    category: "Music",
    location: "Yogyakarta",
    venue: "Ruang Kecil",
    date: dateAfter(35),
    time: "19:30",
    price: 120000,
    capacity: 18,
    color: "#c1a4b8",
    description:
      "Three local songwriters, a small stage, and songs you will remember on the way home.",
  },
];
export const jobs = [
  {
    id: "product-designer",
    title: "Product Designer",
    company: "Orbit",
    location: "Remote",
    type: "Full-time",
    team: "Design",
    salary: "IDR 18–26m / month",
    color: "#e2d8f4",
    description:
      "Shape a thoughtful workspace for creative teams. Own discovery, prototypes, and polished product experiences.",
    requirements: [
      "3+ years in product design",
      "A portfolio of shipped work",
      "Clear communication and curiosity",
    ],
  },
  {
    id: "frontend-engineer",
    title: "Frontend Engineer",
    company: "Northstar",
    location: "Jakarta",
    type: "Full-time",
    team: "Engineering",
    salary: "IDR 20–32m / month",
    color: "#d5e5fa",
    description:
      "Build accessible, fast interfaces for the next generation of logistics tools.",
    requirements: [
      "React and TypeScript experience",
      "Care for accessibility",
      "Experience shipping web applications",
    ],
  },
  {
    id: "brand-designer",
    title: "Brand Designer",
    company: "Studio Kecil",
    location: "Bandung",
    type: "Contract",
    team: "Design",
    salary: "IDR 12–18m / month",
    color: "#f3dfcb",
    description:
      "Create expressive identities for ambitious independent businesses.",
    requirements: [
      "Strong typography skills",
      "Identity design portfolio",
      "Availability for a 6-month contract",
    ],
  },
  {
    id: "customer-success",
    title: "Customer Success Lead",
    company: "Bloom",
    location: "Remote",
    type: "Full-time",
    team: "Operations",
    salary: "IDR 15–22m / month",
    color: "#d6ead7",
    description:
      "Help growing teams make the most of Bloom through onboarding and thoughtful support.",
    requirements: [
      "2+ years in customer success",
      "Excellent written communication",
      "A patient, practical approach",
    ],
  },
  {
    id: "backend-engineer",
    title: "Backend Engineer",
    company: "Orbit",
    location: "Remote",
    type: "Full-time",
    team: "Engineering",
    salary: "IDR 22–35m / month",
    color: "#e2d8f4",
    description:
      "Develop reliable APIs and services that make collaboration feel effortless.",
    requirements: [
      "Node.js and SQL experience",
      "API design knowledge",
      "Testing and observability experience",
    ],
  },
  {
    id: "content-writer",
    title: "Content Writer",
    company: "Wander",
    location: "Yogyakarta",
    type: "Part-time",
    team: "Marketing",
    salary: "IDR 6–9m / month",
    color: "#f3e7bc",
    description: "Tell stories about people, places, and more mindful travel.",
    requirements: [
      "Writing samples",
      "Strong editorial judgment",
      "20 hours per week",
    ],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    company: "Northstar",
    location: "Jakarta",
    type: "Full-time",
    team: "Operations",
    salary: "IDR 14–22m / month",
    color: "#d5e5fa",
    description:
      "Turn operational data into useful decisions for our delivery network.",
    requirements: [
      "SQL and spreadsheets",
      "Data visualization skills",
      "An analytical mindset",
    ],
  },
  {
    id: "marketing-intern",
    title: "Marketing Intern",
    company: "Bloom",
    location: "Bandung",
    type: "Internship",
    team: "Marketing",
    salary: "IDR 3–5m / month",
    color: "#d6ead7",
    description:
      "Learn campaign planning, community building, and content creation with a small friendly team.",
    requirements: [
      "Curiosity about marketing",
      "Clear written communication",
      "A 3-month commitment",
    ],
  },
  {
    id: "mobile-engineer",
    title: "Mobile Engineer",
    company: "Wander",
    location: "Remote",
    type: "Contract",
    team: "Engineering",
    salary: "IDR 20–28m / month",
    color: "#f3e7bc",
    description:
      "Help travelers discover local experiences with an intuitive mobile app.",
    requirements: [
      "React Native experience",
      "Published mobile app",
      "6-month availability",
    ],
  },
  {
    id: "project-manager",
    title: "Project Manager",
    company: "Studio Kecil",
    location: "Bandung",
    type: "Full-time",
    team: "Operations",
    salary: "IDR 12–20m / month",
    color: "#f3dfcb",
    description:
      "Keep creative projects moving with clear plans and strong client relationships.",
    requirements: [
      "Agency project experience",
      "Strong organizational skills",
      "Comfortable managing budgets",
    ],
  },
];

export type Task = {
  id: string;
  version?: number;
  title: string;
  description: string;
  status: "To do" | "In progress" | "Done";
  priority: "Low" | "Medium" | "High";
  assignee: string;
  due: string;
  project: string;
};
export const assignees = ["Unassigned", "Maya", "Arif", "Nina", "Leo"];
export const projects = ["Website launch", "Mobile app", "Brand refresh"];
export const taskStatuses = ["To do", "In progress", "Done"] as const;
export const priorities = ["Low", "Medium", "High"] as const;
export type Message = {
  id: string;
  author: "You" | "Support";
  body: string;
  created: string;
};
export type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "Resolved";
  created: string;
  messages: Message[];
};
export const ticketCategories = ["Account", "Billing", "Technical", "General"];
export type Booking = {
  id: string;
  roomId: string;
  name: string;
  email: string;
  start: string;
  end: string;
  guests: number;
  total: number;
  status: "Confirmed" | "Cancelled";
};
export type FoodLine = { id: string; quantity: number };
export type FoodOrder = {
  id: string;
  name: string;
  phone: string;
  pickup: string;
  note: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
  status: "Received" | "Cancelled";
  created: string;
};
export type Registration = {
  id: string;
  eventId: string;
  title: string;
  date: string;
  venue: string;
  name: string;
  email: string;
  quantity: number;
  total: number;
  status: "Confirmed" | "Cancelled";
};
export type Application = {
  id: string;
  jobId: string;
  name: string;
  email: string;
  portfolio: string;
  letter: string;
  status: "Submitted" | "Withdrawn";
  created: string;
};
export type Workspace = {
  bookings: Booking[];
  foodCart: FoodLine[];
  coupon: string;
  foodOrders: FoodOrder[];
  tasks: Task[];
  registrations: Registration[];
  applications: Application[];
  savedJobs: string[];
  tickets: SupportTicket[];
};
export function seedWorkspace(): Workspace {
  const titles = [
    "Map the onboarding journey",
    "Write the homepage story",
    "Build the pricing page",
    "Review accessibility",
    "Design empty states",
    "Test the checkout flow",
    "Update the icon library",
    "Draft launch emails",
    "Polish the mobile navigation",
    "Review customer feedback",
    "Export brand assets",
    "Publish the style guide",
  ];
  return {
    bookings: [],
    foodCart: [],
    coupon: "",
    foodOrders: [],
    registrations: [],
    applications: [],
    savedJobs: [],
    tasks: titles.map((title, i) => ({
      id: `task-${i + 1}`,
      title,
      description: `Prepare the next iteration of ${title.toLowerCase()}. Share the result with the team for review.`,
      status: taskStatuses[i % 3],
      priority: priorities[i % 3],
      assignee: assignees[1 + (i % 4)],
      due: dateAfter(i + 2),
      project: projects[Math.floor(i / 4)],
    })),
    tickets: [
      "Update my account email",
      "Question about my invoice",
      "Export takes a long time",
      "How do I invite a teammate?",
      "Change my billing address",
      "Keyboard shortcut guide",
    ].map((subject, i) => ({
      id: `CL-${1001 + i}`,
      subject,
      category: ticketCategories[i % 4],
      priority: priorities[i % 3],
      status: i > 3 ? "Resolved" : "Open",
      created: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      messages: [
        {
          id: `message-${i}`,
          author: "You",
          body: `Hello! I could use some help with this: ${subject.toLowerCase()}. Thank you.`,
          created: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        },
        {
          id: `reply-${i}`,
          author: "Support",
          body:
            i > 3
              ? "We've updated the details and shared the guide. Please reopen this request if you need anything else."
              : "Thanks for the details. Your request is in our queue. You can add more information here at any time.",
          created: new Date(Date.now() - i * 86400000).toISOString(),
        },
      ],
    })),
  };
}
