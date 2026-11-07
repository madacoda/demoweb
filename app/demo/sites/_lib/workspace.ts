import { createHash, randomBytes, randomUUID } from "node:crypto";
import { withState } from "../../../../server/database";
import {
  assignees,
  dateAfter,
  dishes,
  events,
  jobs,
  priorities,
  projects,
  rooms,
  seedWorkspace,
  taskStatuses,
  ticketCategories,
  type Workspace,
} from "./data";

type Session = {
  state: Workspace;
  requests: Record<string, { fingerprint: string; id?: string }>;
};
export class DemoError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const id = (prefix: string) =>
  `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new DemoError("Please send a valid request.");
  return value as Record<string, unknown>;
}
function string(
  input: Record<string, unknown>,
  key: string,
  min = 1,
  max = 200,
) {
  const value = input[key];
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new DemoError(
      `Please enter a valid ${key} (${min}–${max} characters).`,
    );
  return value.trim();
}
function number(
  input: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
) {
  const value = input[key];
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new DemoError(`${key} must be a whole number from ${min} to ${max}.`);
  return value;
}
function choice<T extends string>(
  input: Record<string, unknown>,
  key: string,
  values: readonly T[],
): T {
  const value = string(input, key);
  if (!values.includes(value as T))
    throw new DemoError(`Choose a valid ${key}.`);
  return value as T;
}
function email(input: Record<string, unknown>) {
  const value = string(input, "email", 3, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new DemoError("Enter a valid email address.");
  return value;
}
function date(input: Record<string, unknown>, key: string, future = false) {
  const value = string(input, key);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new DemoError(`Choose a valid ${key} date.`);
  if (future && (value < dateAfter(0) || value > dateAfter(365)))
    throw new DemoError("Choose dates within the next year.");
  return value;
}
function owned<T extends { id: string }>(
  records: T[],
  input: Record<string, unknown>,
) {
  const record = records.find((r) => r.id === string(input, "id"));
  if (!record)
    throw new DemoError(
      "That record could not be found in your workspace.",
      404,
    );
  return record;
}
function limited(records: unknown[]) {
  if (records.length >= 200)
    throw new DemoError(
      "This sample workspace is full. Reset it from the site directory to start again.",
    );
}
export function foodTotals(state: Pick<Workspace, "foodCart" | "coupon">) {
  const subtotal = state.foodCart.reduce(
    (sum, line) =>
      sum + dishes.find((d) => d.id === line.id)!.price * line.quantity,
    0,
  );
  const discount = state.coupon === "LUNCH10" ? Math.round(subtotal * 0.1) : 0;
  const fee = subtotal ? 5000 : 0;
  return { subtotal, discount, fee, total: subtotal - discount + fee };
}
function mutate(
  state: Workspace,
  input: Record<string, unknown>,
): string | undefined {
  const action = string(input, "action");
  switch (action) {
    case "bootstrap":
      return;
    case "book-stay": {
      limited(state.bookings);
      const room = rooms.find((r) => r.id === string(input, "roomId"));
      if (!room) throw new DemoError("Choose an available stay.");
      const start = date(input, "start", true),
        end = date(input, "end", true);
      const nights = (Date.parse(end) - Date.parse(start)) / 86400000;
      if (nights < 1 || nights > 30)
        throw new DemoError(
          "Choose a stay of 1–30 nights, with checkout after check-in.",
        );
      const guests = number(input, "guests", 1, room.guests);
      if (
        state.bookings.some(
          (b) =>
            b.roomId === room.id &&
            b.status === "Confirmed" &&
            start < b.end &&
            end > b.start,
        )
      )
        throw new DemoError(
          "This stay is already booked for those dates. Try different dates.",
        );
      const booking = {
        id: id("HV"),
        roomId: room.id,
        start,
        end,
        guests,
        name: string(input, "name", 2, 100),
        email: email(input),
        total: room.price * nights,
        status: "Confirmed" as const,
      };
      state.bookings.unshift(booking);
      return booking.id;
    }
    case "cancel-stay":
      owned(state.bookings, input).status = "Cancelled";
      return;
    case "food-add": {
      const dish = dishes.find((d) => d.id === string(input, "id"));
      if (!dish?.available)
        throw new DemoError("That dish is unavailable today.");
      const quantity = number(input, "quantity", 1, 20);
      const line = state.foodCart.find((l) => l.id === dish.id);
      if ((line?.quantity || 0) + quantity > 20)
        throw new DemoError("You can order up to 20 of each dish.");
      if (line) line.quantity += quantity;
      else state.foodCart.push({ id: dish.id, quantity });
      return;
    }
    case "food-quantity": {
      const line = owned(state.foodCart, input);
      const quantity = number(input, "quantity", 0, 20);
      if (quantity === 0)
        state.foodCart = state.foodCart.filter((l) => l.id !== line.id);
      else line.quantity = quantity;
      if (!state.foodCart.length) state.coupon = "";
      return;
    }
    case "food-coupon": {
      if (!state.foodCart.length)
        throw new DemoError("Add a dish before applying an offer.");
      const coupon = string(input, "coupon", 0, 30).toUpperCase();
      if (coupon && coupon !== "LUNCH10")
        throw new DemoError(
          "That offer is not valid. Use LUNCH10 for 10% off your food.",
        );
      state.coupon = coupon;
      return;
    }
    case "food-order": {
      limited(state.foodOrders);
      if (!state.foodCart.length)
        throw new DemoError(
          "Your basket is empty. Add something delicious first.",
        );
      const phone = string(input, "phone", 7, 24);
      if (!/^[+\d\s()-]{7,24}$/.test(phone))
        throw new DemoError("Enter a valid phone number.");
      const order = {
        id: id("TT"),
        name: string(input, "name", 2, 100),
        phone,
        pickup: choice(input, "pickup", [
          "As soon as possible",
          "In 30 minutes",
          "In 60 minutes",
        ]),
        note: string(input, "note", 0, 500),
        items: state.foodCart.map((line) => {
          const dish = dishes.find((d) => d.id === line.id)!;
          return {
            name: dish.name,
            quantity: line.quantity,
            price: dish.price,
          };
        }),
        ...foodTotals(state),
        status: "Received" as const,
        created: new Date().toISOString(),
      };
      state.foodOrders.unshift(order);
      state.foodCart = [];
      state.coupon = "";
      return order.id;
    }
    case "cancel-food":
      owned(state.foodOrders, input).status = "Cancelled";
      return;
    case "task-save": {
      const task = {
        title: string(input, "title", 3, 120),
        description: string(input, "description", 0, 2000),
        status: choice(input, "status", taskStatuses),
        priority: choice(input, "priority", priorities),
        assignee: choice(input, "assignee", assignees),
        project: choice(input, "project", projects),
        due: date(input, "due"),
      };
      if (input.id) {
        const existing = owned(state.tasks, input);
        Object.assign(existing, task);
        return existing.id;
      }
      limited(state.tasks);
      const taskId = id("DB");
      state.tasks.unshift({ id: taskId, ...task });
      return taskId;
    }
    case "task-move":
      owned(state.tasks, input).status = choice(input, "status", taskStatuses);
      return;
    case "task-delete": {
      const task = owned(state.tasks, input);
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      return;
    }
    case "reserve-event": {
      limited(state.registrations);
      const event = events.find((e) => e.id === string(input, "eventId"));
      if (!event) throw new DemoError("Choose an event.");
      const quantity = number(input, "quantity", 1, 8);
      const reserved = state.registrations
        .filter((r) => r.eventId === event.id && r.status === "Confirmed")
        .reduce((sum, r) => sum + r.quantity, 0);
      if (quantity + reserved > event.capacity)
        throw new DemoError(
          "There are not enough tickets left. Choose fewer tickets or another event.",
        );
      const registration = {
        id: id("GA"),
        eventId: event.id,
        title: event.title,
        date: event.date,
        venue: event.venue,
        name: string(input, "name", 2, 100),
        email: email(input),
        quantity,
        total: quantity * event.price,
        status: "Confirmed" as const,
      };
      state.registrations.unshift(registration);
      return registration.id;
    }
    case "cancel-event":
      owned(state.registrations, input).status = "Cancelled";
      return;
    case "save-job": {
      const job = jobs.find((j) => j.id === string(input, "id"));
      if (!job) throw new DemoError("Choose a valid role.");
      state.savedJobs = state.savedJobs.includes(job.id)
        ? state.savedJobs.filter((j) => j !== job.id)
        : [...state.savedJobs, job.id];
      return;
    }
    case "apply-job": {
      limited(state.applications);
      const job = jobs.find((j) => j.id === string(input, "jobId"));
      if (!job) throw new DemoError("Choose a valid role.");
      if (
        state.applications.some(
          (a) => a.jobId === job.id && a.status === "Submitted",
        )
      )
        throw new DemoError(
          "You already have an active application for this role.",
        );
      const portfolio = string(input, "portfolio", 0, 500);
      if (portfolio) {
        let url: URL;
        try {
          url = new URL(portfolio);
        } catch {
          throw new DemoError(
            "Enter a full portfolio URL, beginning with https://.",
          );
        }
        if (url.protocol !== "https:" && url.protocol !== "http:")
          throw new DemoError("Enter an http or https portfolio URL.");
      }
      const application = {
        id: id("HL"),
        jobId: job.id,
        name: string(input, "name", 2, 100),
        email: email(input),
        portfolio,
        letter: string(input, "letter", 30, 5000),
        status: "Submitted" as const,
        created: new Date().toISOString(),
      };
      state.applications.unshift(application);
      return application.id;
    }
    case "withdraw-application":
      owned(state.applications, input).status = "Withdrawn";
      return;
    case "ticket-create": {
      limited(state.tickets);
      const ticket = {
        id: id("CL"),
        subject: string(input, "subject", 5, 120),
        category: choice(input, "category", ticketCategories),
        priority: choice(input, "priority", priorities),
        status: "Open" as const,
        created: new Date().toISOString(),
        messages: [
          {
            id: id("M"),
            author: "You" as const,
            body: string(input, "body", 10, 5000),
            created: new Date().toISOString(),
          },
        ],
      };
      state.tickets.unshift(ticket);
      return ticket.id;
    }
    case "ticket-reply": {
      const ticket = owned(state.tickets, input);
      if (ticket.status !== "Open")
        throw new DemoError("Reopen this request before adding a reply.");
      limited(ticket.messages);
      ticket.messages.push({
        id: id("M"),
        author: "You",
        body: string(input, "body", 1, 5000),
        created: new Date().toISOString(),
      });
      return ticket.id;
    }
    case "ticket-status":
      owned(state.tickets, input).status = choice(input, "status", [
        "Open",
        "Resolved",
      ]);
      return;
    case "reset": {
      if (input.confirm !== "RESET")
        throw new DemoError("Confirm the reset first.");
      Object.assign(state, seedWorkspace());
      return;
    }
    default:
      throw new DemoError("That action is not supported.");
  }
}

export async function performDemoAction(
  existingToken: string | undefined,
  value: unknown,
): Promise<{ token: string; state: Workspace; id?: string }> {
  const input = object(value);
  const action = string(input, "action");
  const token =
    existingToken && /^[a-f0-9]{64}$/.test(existingToken)
      ? existingToken
      : randomBytes(32).toString("hex");
  const key = hash(token);
  return withState<Session, { token: string; state: Workspace; id?: string }>(
    "workspace",
    key,
    () => ({ state: seedWorkspace(), requests: {} }),
    (session) => {
      let resultId: string | undefined;
      if (action === "bootstrap") mutate(session.state, input);
      else {
        const requestId = string(input, "requestId", 16, 80);
        if (!/^[a-zA-Z0-9-]+$/.test(requestId))
          throw new DemoError("Use a valid request identifier.");
        const fingerprint = hash(JSON.stringify(input));
        const prior = Object.hasOwn(session.requests, requestId)
          ? session.requests[requestId]
          : undefined;
        if (prior && prior.fingerprint !== fingerprint)
          throw new DemoError(
            "This request identifier was already used for another action.",
            409,
          );
        if (prior) resultId = prior.id;
        else {
          resultId = mutate(session.state, input);
          if (action === "reset") session.requests = {};
          session.requests[requestId] = { fingerprint, id: resultId };
        }
      }
      return { token, state: session.state, id: resultId };
    },
  );
}
