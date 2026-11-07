import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { CommitAndThrow, withState } from "../../../server/database";
import {
  catalog,
  type CartLine,
  type Customer,
  type Delivery,
  type Order,
  type StoreState,
  type Ticket,
} from "./catalog";

type Basket = {
  cart: CartLine[];
  saved: string[];
  coupon: string;
  delivery: Delivery;
};
type User = Basket & {
  id: string;
  name: string;
  email: string;
  password: string;
  salt: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
};
type Session = Basket & {
  id: string;
  userId?: string;
  expires: number;
  fixture?: Basket;
  buggy?: boolean;
};
type Database = {
  version: 1;
  users: User[];
  sessions: Record<string, Session>;
  orders: Order[];
  tickets: Ticket[];
  inventory: Record<string, number>;
  loginAttempts: Record<string, { count: number; until: number }>;
};
const emptyBasket = (): Basket => ({
  cart: [],
  saved: [],
  coupon: "",
  delivery: "standard",
});
const freshDatabase = (): Database => ({
  version: 1,
  users: [],
  sessions: {},
  orders: [],
  tickets: [],
  inventory: Object.fromEntries(catalog.map((p) => [p.id, p.stock])),
  loginAttempts: {},
});
export class StoreError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new StoreError("Please send a valid request.");
  return value as Record<string, unknown>;
}
function text(
  input: Record<string, unknown>,
  key: string,
  max = 200,
  required = true,
): string {
  const value = input[key];
  if (value === undefined && !required) return "";
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new StoreError(
      `Please enter a valid ${key.replace(/([A-Z])/g, " $1").toLowerCase()}.`,
    );
  return value.trim();
}
function email(input: Record<string, unknown>): string {
  const value = text(input, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new StoreError("Please enter a valid email address.");
  return value;
}
function password(input: Record<string, unknown>): string {
  if (
    typeof input.password !== "string" ||
    input.password.length < 8 ||
    input.password.length > 128
  )
    throw new StoreError("Use a password with 8–128 characters.");
  return input.password;
}
function quantity(input: Record<string, unknown>, allowZero = false): number {
  if (
    !Number.isInteger(input.quantity) ||
    Number(input.quantity) < (allowZero ? 0 : 1) ||
    Number(input.quantity) > 10
  )
    throw new StoreError("Choose a quantity between 1 and 10.");
  return Number(input.quantity);
}
function product(id: string) {
  const found = catalog.find((p) => p.id === id);
  if (!found) throw new StoreError("That product is no longer available.", 404);
  return found;
}
function userFor(db: Database, session: Session) {
  return db.users.find((u) => u.id === session.userId);
}
function basketFor(db: Database, session: Session): Basket {
  return session.fixture || userFor(db, session) || session;
}
function ownerFor(session: Session) {
  return session.userId || session.id;
}
function totals(basket: Basket, buggy = false) {
  const subtotal = basket.cart.reduce(
    (sum, line) => sum + product(line.productId).price * line.quantity,
    0,
  );
  const discount =
    basket.coupon === "SAVE10" && !buggy ? Math.round(subtotal * 0.1) : 0;
  const shipping =
    basket.cart.length && basket.delivery === "express" ? 25000 : 0;
  return {
    subtotal,
    discount,
    shipping,
    total: subtotal - discount + shipping,
  };
}
function snapshot(db: Database, session: Session): StoreState {
  const basket = basketFor(db, session);
  const user = userFor(db, session);
  return {
    products: catalog.map((p) => ({
      ...p,
      stock: db.inventory[p.id] ?? p.stock,
    })),
    cart: basket.cart,
    saved: basket.saved,
    coupon: basket.coupon,
    delivery: basket.delivery,
    ...totals(basket, session.buggy),
    user: user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          postalCode: user.postalCode,
        }
      : null,
    orders: db.orders.filter((o) => o.owner === ownerFor(session)).toReversed(),
    tickets: db.tickets
      .filter((t) => t.owner === ownerFor(session))
      .toReversed(),
  };
}
function assertStock(db: Database, lines: CartLine[]) {
  for (const id of new Set(lines.map((l) => l.productId))) {
    const count = lines
      .filter((l) => l.productId === id)
      .reduce((sum, l) => sum + l.quantity, 0);
    if (count > (db.inventory[id] ?? 0))
      throw new StoreError(
        `Only ${db.inventory[id] ?? 0} of ${product(id).name} are available. Update your bag to continue.`,
        409,
      );
    if (count > 10)
      throw new StoreError("You can order up to 10 of each product.");
  }
}
export async function performStoreAction(
  rawToken: string | undefined,
  rawInput: unknown,
) {
  const input = record(rawInput);
  const action = text(input, "action", 30);
  return withState("storefront", "main", freshDatabase, async (db) => {
    const now = Date.now();
    let token =
      rawToken && /^[a-f0-9]{64}$/.test(rawToken)
        ? rawToken
        : randomBytes(32).toString("hex");
    const tokenHash = (value: string) =>
      createHash("sha256").update(value).digest("hex");
    let hash = tokenHash(token);
    let session = db.sessions[hash];
    if (!session || session.expires < now) {
      token = randomBytes(32).toString("hex");
      hash = tokenHash(token);
      session = {
        id: randomUUID(),
        expires: now + 30 * 86400000,
        ...emptyBasket(),
      };
      db.sessions[hash] = session;
    }
    const rotateToken = () => {
      delete db.sessions[hash];
      token = randomBytes(32).toString("hex");
      hash = tokenHash(token);
      db.sessions[hash] = session;
    };
    let orderId: string | undefined;
    let ticketId: string | undefined;
    if (action === "bootstrap") {
      if (input.scenario === "broken" || input.scenario === "fixed") {
        session.fixture = {
          ...emptyBasket(),
          cart: [
            { productId: "notebook", color: "Sand", quantity: 1 },
            { productId: "pen", color: "Forest", quantity: 1 },
          ],
        };
        session.buggy = input.scenario === "broken";
      } else {
        delete session.fixture;
        delete session.buggy;
      }
    } else if (action === "register" || action === "login") {
      const address = email(input);
      const secret = password(input);
      const existing = db.users.find((u) => u.email === address);
      let user: User;
      if (action === "register") {
        if (existing)
          throw new StoreError(
            "An account with that email already exists. Please sign in.",
            409,
          );
        const salt = randomBytes(16).toString("hex");
        user = {
          id: randomUUID(),
          name: text(input, "name", 100),
          email: address,
          salt,
          password: scryptSync(secret, salt, 64).toString("hex"),
          phone: "",
          address: "",
          city: "",
          postalCode: "",
          ...emptyBasket(),
        };
        db.users.push(user);
      } else {
        const attempt = db.loginAttempts[address];
        if (attempt && attempt.count >= 5 && attempt.until > now)
          throw new StoreError(
            "Too many sign-in attempts. Please try again in 15 minutes.",
            429,
          );
        const candidate = scryptSync(
          secret,
          existing?.salt || "dummy-salt",
          64,
        );
        if (
          !existing ||
          !timingSafeEqual(candidate, Buffer.from(existing.password, "hex"))
        ) {
          db.loginAttempts[address] = {
            count: attempt && attempt.until > now ? attempt.count + 1 : 1,
            until: now + 15 * 60000,
          };
          throw new CommitAndThrow(
            new StoreError("Email or password is incorrect.", 401),
          );
        }
        delete db.loginAttempts[address];
        user = existing;
      }
      // Merge the guest's bag and saved products into the account without duplicating lines.
      for (const line of session.cart) {
        const existingLine = user.cart.find(
          (l) => l.productId === line.productId && l.color === line.color,
        );
        const otherQuantity = user.cart
          .filter((l) => l.productId === line.productId && l !== existingLine)
          .reduce((sum, l) => sum + l.quantity, 0);
        const available = Math.max(
          0,
          Math.min(10, db.inventory[line.productId] ?? 0) - otherQuantity,
        );
        const count = Math.min(
          (existingLine?.quantity || 0) + line.quantity,
          available,
        );
        if (existingLine) existingLine.quantity = count;
        else if (count) user.cart.push({ ...line, quantity: count });
      }
      user.cart = user.cart.filter((l) => l.quantity > 0);
      user.saved = [...new Set([...user.saved, ...session.saved])];
      if (session.coupon) user.coupon = session.coupon;
      db.orders
        .filter((o) => o.owner === session.id)
        .forEach((o) => {
          o.owner = user.id;
        });
      db.tickets
        .filter((t) => t.owner === session.id)
        .forEach((t) => {
          t.owner = user.id;
        });
      Object.assign(session, emptyBasket());
      session.userId = user.id;
      delete session.fixture;
      delete session.buggy;
      rotateToken();
    } else if (action === "logout") {
      session = {
        id: randomUUID(),
        expires: now + 30 * 86400000,
        ...emptyBasket(),
      };
      rotateToken();
    } else if (action === "profile") {
      const user = userFor(db, session);
      if (!user)
        throw new StoreError("Please sign in to update your details.", 401);
      Object.assign(user, {
        name: text(input, "name", 100),
        phone: text(input, "phone", 30, false),
        address: text(input, "address", 200, false),
        city: text(input, "city", 100, false),
        postalCode: text(input, "postalCode", 12, false),
      });
    } else if (action === "add" || action === "quantity") {
      const basket = basketFor(db, session);
      const item = product(text(input, "productId", 60));
      const color = text(input, "color", 30);
      if (!item.colors.some((c) => c.name === color))
        throw new StoreError("Choose an available color.");
      const count = quantity(input, action === "quantity");
      const old = basket.cart.find(
        (l) => l.productId === item.id && l.color === color,
      );
      const next = action === "add" ? (old?.quantity || 0) + count : count;
      const lines = basket.cart.filter((l) => l !== old);
      if (next) lines.push({ productId: item.id, color, quantity: next });
      assertStock(db, lines);
      basket.cart = lines;
      if (!lines.length) basket.coupon = "";
    } else if (action === "clear") {
      Object.assign(basketFor(db, session), { cart: [], coupon: "" });
    } else if (action === "saved") {
      const basket = basketFor(db, session);
      const id = product(text(input, "productId", 60)).id;
      basket.saved = basket.saved.includes(id)
        ? basket.saved.filter((value) => value !== id)
        : [...basket.saved, id];
    } else if (action === "coupon") {
      const basket = basketFor(db, session);
      const code = text(input, "code", 40, false).toUpperCase();
      if (!basket.cart.length)
        throw new StoreError(
          "Add something to your bag before applying a discount.",
        );
      if (code !== "SAVE10" && code !== "")
        throw new StoreError("That code isn’t valid. Try SAVE10 for 10% off.");
      basket.coupon = code;
    } else if (action === "delivery") {
      if (!["standard", "express", "pickup"].includes(String(input.delivery)))
        throw new StoreError("Choose a delivery option.");
      basketFor(db, session).delivery = input.delivery as Delivery;
    } else if (action === "checkout") {
      const basket = basketFor(db, session);
      const requestId = text(input, "requestId", 80);
      const existing = db.orders.find(
        (o) => o.requestId === requestId && o.owner === ownerFor(session),
      );
      if (existing) {
        orderId = existing.id;
      } else {
        if (!basket.cart.length)
          throw new StoreError(
            "Your bag is empty. Add something before checking out.",
          );
        assertStock(db, basket.cart);
        const customerInput = record(input.customer);
        const customer: Customer = {
          name: text(customerInput, "name", 100),
          email: email(customerInput),
          phone: text(customerInput, "phone", 30),
          address: text(
            customerInput,
            "address",
            200,
            basket.delivery !== "pickup",
          ),
          city: text(customerInput, "city", 100, basket.delivery !== "pickup"),
          postalCode: text(
            customerInput,
            "postalCode",
            12,
            basket.delivery !== "pickup",
          ),
          note: text(customerInput, "note", 300, false),
        };
        if (!/^[+\d\s()-]{7,30}$/.test(customer.phone))
          throw new StoreError("Please enter a valid phone number.");
        if (
          basket.delivery !== "pickup" &&
          !/^\d{5}$/.test(customer.postalCode)
        )
          throw new StoreError("Please enter a 5-digit postal code.");
        const order: Order = {
          id: `FF-${randomBytes(4).toString("hex").toUpperCase()}`,
          owner: ownerFor(session),
          requestId,
          createdAt: new Date().toISOString(),
          status: "confirmed",
          customer,
          delivery: basket.delivery,
          items: basket.cart.map((l) => ({
            ...l,
            name: product(l.productId).name,
            price: product(l.productId).price,
            slug: product(l.productId).slug,
          })),
          ...totals(basket, session.buggy),
        };
        for (const line of basket.cart)
          db.inventory[line.productId] -= line.quantity;
        db.orders.push(order);
        orderId = order.id;
        basket.cart = [];
        basket.coupon = "";
        const user = userFor(db, session);
        if (user)
          Object.assign(user, {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            postalCode: customer.postalCode,
          });
      }
    } else if (action === "cancel") {
      const id = text(input, "orderId", 40);
      const order = db.orders.find(
        (o) => o.id === id && o.owner === ownerFor(session),
      );
      if (!order) throw new StoreError("That order could not be found.", 404);
      if (order.status === "confirmed") {
        order.status = "cancelled";
        for (const line of order.items)
          db.inventory[line.productId] += line.quantity;
      }
    } else if (action === "contact") {
      const ticket: Ticket = {
        id: `MSG-${randomBytes(4).toString("hex").toUpperCase()}`,
        owner: ownerFor(session),
        createdAt: new Date().toISOString(),
        name: text(input, "name", 100),
        email: email(input),
        subject: text(input, "subject", 100),
        message: text(input, "message", 2000),
      };
      if (ticket.message.length < 10)
        throw new StoreError("Tell us a little more—at least 10 characters.");
      db.tickets.push(ticket);
      ticketId = ticket.id;
    } else if (action !== "state")
      throw new StoreError("That action is not supported.");
    session.expires = now + 30 * 86400000;
    for (const [key, value] of Object.entries(db.sessions))
      if (value.expires < now) delete db.sessions[key];
    return { token, state: snapshot(db, session), orderId, ticketId };
  });
}
