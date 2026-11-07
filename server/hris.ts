import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { CommitAndThrow, withState } from "./database";
import {
  hrAccounts,
  hrPassword,
  nextWorkday,
  today,
  type Person,
  type Leave,
  type Audit,
  type HRState,
  type Balance,
  type LeaveType,
} from "../app/hris/model";
export class HRError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
type User = Person & { salt: string; password: string };
type Database = {
  users: User[];
  sessions: Record<string, { userId: string; expires: number }>;
  requests: Leave[];
  audit: Audit[];
  attempts: Record<string, { count: number; until: number }>;
  journal: Record<string, { fingerprint: string; id?: string }>;
};
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
let credentials: Map<string, { salt: string; password: string }> | undefined;
function fresh(): Database {
  credentials ||= new Map(
    hrAccounts.map((person) => {
      const salt = randomBytes(16).toString("hex");
      return [
        person.id,
        { salt, password: scryptSync(hrPassword, salt, 64).toString("hex") },
      ];
    }),
  );
  const now = new Date().toISOString();
  const users: User[] = hrAccounts.map((person) => ({
    ...person,
    annual: 12,
    sick: 10,
    version: 1,
    ...credentials!.get(person.id)!,
  }));
  const requests: Leave[] = [
    {
      id: "LV-SEED-001",
      employeeId: "alex",
      employee: "Alex Morgan",
      team: "Product",
      type: "Annual",
      start: nextWorkday(3),
      end: nextWorkday(3),
      duration: "Full day",
      days: 1,
      reason: "A family appointment planned in advance.",
      status: "Pending",
      decisionNote: "",
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "LV-SEED-002",
      employeeId: "sam",
      employee: "Sam Rivera",
      team: "Product",
      type: "Annual",
      start: nextWorkday(6),
      end: nextWorkday(7),
      duration: "Full day",
      days: 2,
      reason: "A short break with my family.",
      status: "Approved",
      decisionNote: "Coverage arranged with the team.",
      decidedBy: "maya",
      version: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "LV-SEED-003",
      employeeId: "nina",
      employee: "Nina Putri",
      team: "Operations",
      type: "Sick",
      start: nextWorkday(2),
      end: nextWorkday(2),
      duration: "Half day",
      days: 0.5,
      reason: "A scheduled follow-up appointment.",
      status: "Pending",
      decisionNote: "",
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
  return {
    users,
    sessions: {},
    requests,
    audit: requests.map((request) => ({
      id: `AU-${request.id}`,
      actorId: request.employeeId,
      actor: request.employee,
      action: "Seeded request",
      targetId: request.id,
      employeeId: request.employeeId,
      detail: `${request.status} · ${request.days} day(s) ${request.type}`,
      at: now,
    })),
    attempts: {},
    journal: {},
  };
}
function text(input: Record<string, unknown>, key: string, min = 1, max = 200) {
  const value = input[key];
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new HRError(`Enter a valid ${key} (${min}–${max} characters).`);
  return value.trim();
}
function publicPerson(user: User): Person {
  const { salt: _salt, password: _password, ...person } = user;
  return person;
}
function balances(db: Database, user: User): Balance[] {
  return (["Annual", "Sick"] as LeaveType[]).map((type) => {
    const relevant = db.requests.filter(
      (r) => r.employeeId === user.id && r.type === type,
    );
    const pending = relevant
      .filter((r) => r.status === "Pending")
      .reduce((n, r) => n + r.days, 0);
    const used = relevant
      .filter((r) => r.status === "Approved")
      .reduce((n, r) => n + r.days, 0);
    const allowance = type === "Annual" ? user.annual : user.sick;
    return {
      employeeId: user.id,
      employee: user.name,
      team: user.team,
      type,
      allowance,
      pending,
      used,
      available: allowance - pending - used,
      version: user.version,
    };
  });
}
function snapshot(db: Database, user?: User): HRState {
  if (!user)
    return { user: null, people: [], requests: [], balances: [], audit: [] };
  const visible = db.users.filter(
    (person) =>
      person.role === "employee" &&
      (user.role === "hr" ||
        person.id === user.id ||
        (user.role === "manager" && person.managerId === user.id)),
  );
  const ids = new Set(visible.map((person) => person.id));
  return {
    user: publicPerson(user),
    people: visible.map(publicPerson),
    requests: db.requests.filter((r) => ids.has(r.employeeId)),
    balances: visible.flatMap((person) => balances(db, person)),
    audit: db.audit
      .filter((entry) => ids.has(entry.employeeId))
      .slice()
      .reverse(),
  };
}
function audit(
  db: Database,
  user: User,
  action: string,
  targetId: string,
  employeeId: string,
  detail: string,
) {
  db.audit.push({
    id: `AU-${randomUUID().slice(0, 8).toUpperCase()}`,
    actorId: user.id,
    actor: user.name,
    action,
    targetId,
    employeeId,
    detail,
    at: new Date().toISOString(),
  });
}
function date(input: Record<string, unknown>, key: string) {
  const value = text(input, key);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new HRError("Choose valid calendar dates.");
  return value;
}
export function leaveDays(start: string, end: string, half: boolean) {
  if (end < start)
    throw new HRError("End date must be on or after start date.");
  const span = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  if (span > 30)
    throw new HRError("A request can span at most 30 calendar days.");
  let days = 0;
  for (let i = 0; i < span; i++) {
    const day = new Date(Date.parse(start) + i * 86400000).getUTCDay();
    if (day !== 0 && day !== 6) days++;
  }
  if (!days)
    throw new HRError(
      "Choose at least one working day, Monday through Friday.",
    );
  if (half && (start !== end || days !== 1))
    throw new HRError("Half-day leave must be a single working day.");
  return half ? 0.5 : days;
}
function requiredRole(user: User, role: Person["role"]) {
  if (user.role !== role)
    throw new HRError(
      "You do not have permission to perform this action.",
      403,
    );
}
function version(current: number, input: Record<string, unknown>) {
  if (input.version !== current)
    throw new HRError(
      "This record changed in another session. Refresh before trying again.",
      409,
    );
}
function mutate(
  db: Database,
  user: User,
  input: Record<string, unknown>,
): string | undefined {
  const action = input.action;
  if (action === "submit") {
    requiredRole(user, "employee");
    const type = text(input, "type") as LeaveType;
    if (!["Annual", "Sick"].includes(type))
      throw new HRError("Choose a valid leave type.");
    const duration = text(input, "duration");
    if (!["Full day", "Half day"].includes(duration))
      throw new HRError("Choose a valid duration.");
    const start = date(input, "start"),
      end = date(input, "end");
    if (
      start < today() ||
      end > new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
    )
      throw new HRError("Choose dates from today through the next 365 days.");
    const days = leaveDays(start, end, duration === "Half day");
    if (
      db.requests.some(
        (r) =>
          r.employeeId === user.id &&
          ["Pending", "Approved"].includes(r.status) &&
          start <= r.end &&
          end >= r.start,
      )
    )
      throw new HRError(
        "These dates overlap an existing pending or approved request.",
        409,
      );
    if (days > balances(db, user).find((b) => b.type === type)!.available)
      throw new HRError(
        "Insufficient available leave balance. Pending requests also reserve days.",
        409,
      );
    if (db.requests.filter((r) => r.employeeId === user.id).length >= 200)
      throw new HRError(
        "This sample account has reached its request limit. Start a fresh HRIS lab run.",
      );
    const now = new Date().toISOString();
    const request: Leave = {
      id: `LV-${randomUUID().slice(0, 8).toUpperCase()}`,
      employeeId: user.id,
      employee: user.name,
      team: user.team,
      type,
      start,
      end,
      duration: duration as Leave["duration"],
      days,
      reason: text(input, "reason", 10, 1000),
      status: "Pending",
      decisionNote: "",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    db.requests.unshift(request);
    audit(
      db,
      user,
      "Submitted",
      request.id,
      user.id,
      `Pending · ${days} day(s) ${type}`,
    );
    return request.id;
  }
  if (action === "decide" || action === "cancel") {
    const request = db.requests.find((r) => r.id === text(input, "id"));
    if (!request) throw new HRError("Leave request not found.", 404);
    const employee = db.users.find((p) => p.id === request.employeeId)!;
    if (action === "decide") {
      requiredRole(user, "manager");
      if (employee.managerId !== user.id || employee.id === user.id)
        throw new HRError("Leave request not found in your team.", 404);
      version(request.version, input);
      if (request.status !== "Pending")
        throw new HRError(
          "Only pending requests can be approved or rejected.",
          409,
        );
      const decision = text(input, "decision");
      if (!["Approved", "Rejected"].includes(decision))
        throw new HRError("Choose Approve or Reject.");
      request.decisionNote = text(
        input,
        "note",
        decision === "Rejected" ? 10 : 0,
        1000,
      );
      request.status = decision as Leave["status"];
      request.decidedBy = user.id;
    } else {
      requiredRole(user, "employee");
      if (request.employeeId !== user.id)
        throw new HRError("Leave request not found.", 404);
      version(request.version, input);
      if (!["Pending", "Approved"].includes(request.status))
        throw new HRError(
          "Only pending or approved requests can be cancelled.",
          409,
        );
      if (request.start < today())
        throw new HRError(
          "Leave that has already started cannot be cancelled.",
          409,
        );
      request.status = "Cancelled";
    }
    request.version++;
    request.updatedAt = new Date().toISOString();
    audit(
      db,
      user,
      request.status,
      request.id,
      request.employeeId,
      `${request.type} · ${request.days} day(s)${request.decisionNote ? ` · ${request.decisionNote}` : ""}`,
    );
    return request.id;
  }
  if (action === "adjust-balance") {
    requiredRole(user, "hr");
    const employee = db.users.find(
      (p) => p.id === text(input, "employeeId") && p.role === "employee",
    );
    if (!employee) throw new HRError("Employee not found.", 404);
    version(employee.version, input);
    const type = text(input, "type") as LeaveType;
    if (!["Annual", "Sick"].includes(type))
      throw new HRError("Choose a valid leave type.");
    const allowance = input.allowance;
    if (
      typeof allowance !== "number" ||
      !Number.isFinite(allowance) ||
      allowance < 0 ||
      allowance > 60 ||
      !Number.isInteger(allowance * 2)
    )
      throw new HRError("Allowance must be 0–60 days in half-day increments.");
    const balance = balances(db, employee).find((b) => b.type === type)!;
    if (allowance < balance.used + balance.pending)
      throw new HRError(
        "Allowance cannot be lower than approved and reserved days.",
        409,
      );
    const note = text(input, "note", 10, 1000);
    employee[type === "Annual" ? "annual" : "sick"] = allowance;
    employee.version++;
    audit(
      db,
      user,
      "Balance adjusted",
      employee.id,
      employee.id,
      `${type}: ${balance.allowance} → ${allowance} days · ${note}`,
    );
    return employee.id;
  }
  throw new HRError("That action is not supported.");
}
export async function performHRAction(
  existingToken: string | undefined,
  value: unknown,
): Promise<{ token: string; state: HRState; id?: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HRError("Send a valid request.");
  const input = value as Record<string, unknown>;
  const action = text(input, "action");
  return withState<Database, { token: string; state: HRState; id?: string }>(
    "hris",
    "main",
    fresh,
    (db) => {
      const now = Date.now();
      for (const [key, session] of Object.entries(db.sessions))
        if (session.expires <= now) delete db.sessions[key];
      let token =
        existingToken && /^[a-f0-9]{64}$/.test(existingToken)
          ? existingToken
          : randomBytes(32).toString("hex");
      let session = db.sessions[hash(token)];
      let user = db.users.find((p) => p.id === session?.userId);
      if (action === "login") {
        const email = text(input, "email", 3, 254).toLowerCase();
        if (
          typeof input.password !== "string" ||
          input.password.length < 8 ||
          input.password.length > 128
        )
          throw new HRError("Enter a password between 8 and 128 characters.");
        const attempt = db.attempts[email];
        if (attempt?.count >= 5 && attempt.until > now)
          throw new HRError(
            "Too many sign-in attempts. Try again in 15 minutes.",
            429,
          );
        const candidate = db.users.find((p) => p.email === email);
        const password = scryptSync(
          input.password,
          candidate?.salt || "dummy-hris-salt",
          64,
        );
        if (
          !candidate ||
          !timingSafeEqual(password, Buffer.from(candidate.password, "hex"))
        ) {
          db.attempts[email] = {
            count: attempt && attempt.until > now ? attempt.count + 1 : 1,
            until: now + 15 * 60000,
          };
          throw new CommitAndThrow(
            new HRError("Email or password is incorrect.", 401),
          );
        }
        delete db.attempts[email];
        delete db.sessions[hash(token)];
        token = randomBytes(32).toString("hex");
        session = { userId: candidate.id, expires: now + 30 * 60000 };
        db.sessions[hash(token)] = session;
        user = candidate;
      } else if (action === "logout") {
        delete db.sessions[hash(token)];
        token = randomBytes(32).toString("hex");
        user = undefined;
      } else if (action !== "bootstrap") {
        if (!user)
          throw new HRError(
            "Your session has expired. Sign in again before saving.",
            401,
          );
        const requestId = text(input, "requestId", 16, 80);
        if (!/^[a-zA-Z0-9-]+$/.test(requestId))
          throw new HRError("Use a valid request identifier.");
        const key = `${user.id}:${requestId}`;
        const fingerprint = hash(JSON.stringify(input));
        const prior = db.journal[key];
        if (prior && prior.fingerprint !== fingerprint)
          throw new HRError(
            "This request identifier was already used for different data.",
            409,
          );
        const id = prior ? prior.id : mutate(db, user, input);
        if (!prior) db.journal[key] = { fingerprint, id };
        return { token, state: snapshot(db, user), id };
      }
      return { token, state: snapshot(db, user) };
    },
  );
}
