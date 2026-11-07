export type Role = "employee" | "manager" | "hr";
export type LeaveType = "Annual" | "Sick";
export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";
export type Person = {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  managerId?: string;
  annual: number;
  sick: number;
  version: number;
};
export type Leave = {
  id: string;
  employeeId: string;
  employee: string;
  team: string;
  type: LeaveType;
  start: string;
  end: string;
  duration: "Full day" | "Half day";
  days: number;
  reason: string;
  status: LeaveStatus;
  decisionNote: string;
  decidedBy?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type Audit = {
  id: string;
  actorId: string;
  actor: string;
  action: string;
  targetId: string;
  employeeId: string;
  detail: string;
  at: string;
};
export type Balance = {
  employeeId: string;
  employee: string;
  team: string;
  type: LeaveType;
  allowance: number;
  pending: number;
  used: number;
  available: number;
  version: number;
};
export type HRState = {
  user: Person | null;
  people: Person[];
  requests: Leave[];
  balances: Balance[];
  audit: Audit[];
};
export const hrAccounts = [
  {
    id: "alex",
    name: "Alex Morgan",
    email: "alex@people.test",
    role: "employee",
    team: "Product",
    managerId: "maya",
  },
  {
    id: "sam",
    name: "Sam Rivera",
    email: "sam@people.test",
    role: "employee",
    team: "Product",
    managerId: "maya",
  },
  {
    id: "nina",
    name: "Nina Putri",
    email: "nina@people.test",
    role: "employee",
    team: "Operations",
    managerId: "leo",
  },
  {
    id: "maya",
    name: "Maya Chen",
    email: "maya@people.test",
    role: "manager",
    team: "Product",
  },
  {
    id: "leo",
    name: "Leo Santos",
    email: "leo@people.test",
    role: "manager",
    team: "Operations",
  },
  {
    id: "harper",
    name: "Harper Ellis",
    email: "harper@people.test",
    role: "hr",
    team: "People",
  },
] as const;
export const hrPassword = "Leave123!";
export const today = () => new Date().toISOString().slice(0, 10);
export function nextWorkday(offset: number) {
  const date = new Date(today() + "T12:00:00Z");
  for (let i = 0; i < offset;) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (![0, 6].includes(date.getUTCDay())) i++;
  }
  while ([0, 6].includes(date.getUTCDay()))
    date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
