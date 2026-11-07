export type Fault = {
  api: "store" | "workspace" | "hris";
  action: string;
  mode: "slow" | "unavailable" | "rate" | "lost" | "expire";
};
export type Scenario = {
  id: string;
  title: string;
  area: string;
  path: string;
  setup: string;
  steps: string[];
  expected: string;
  fault?: Fault;
};
export const demoAccount = {
  email: "alex@example.test",
  password: "District123!",
  name: "Alex Sample",
};
export const scenarios: Scenario[] = [
  {
    id: "hris-journey",
    title: "Employee → manager → HR",
    area: "HRIS",
    path: "/hris/login",
    setup:
      "Six accounts across three roles and two teams. Three requests in different states.",
    steps: [
      "Sign in as Alex and submit Annual leave on a free working day.",
      "Sign out, sign in as Maya, open Approvals and approve the new request.",
      "Sign out, sign in as Harper, inspect Alex's balances and Activity.",
    ],
    expected:
      "The employee sees only their own requests. The manager sees only their team. Pending days move to approved days once; available balance stays consistent. HR sees the approval and audit actor.",
  },
  {
    id: "hris-reject",
    title: "Reject, explain, resubmit",
    area: "HRIS",
    path: "/hris/approvals",
    setup:
      "Signed in as Maya, the Product manager. Alex has a pending one-day request.",
    steps: [
      "Open Alex's pending request, choose Reject and try an empty note.",
      "Enter a reason of at least 10 characters and save.",
      "Sign in as Alex; inspect the rejection, balance, and submit another request on those dates.",
    ],
    expected:
      "Missing rejection reason is rejected. Rejection releases the reserved day. A new request can reuse the released dates; the original audit trail remains.",
  },
  {
    id: "hris-permissions",
    title: "Permission checks beyond hidden buttons",
    area: "HRIS",
    path: "/hris/requests",
    setup: "Signed in as Alex, an employee. Nina belongs to a different team.",
    steps: [
      "Visit /hris/approvals and /hris/balances directly.",
      "Attempt decide and adjust-balance through /hris/api as Alex.",
      "Sign in as Maya and attempt a decision on Nina's LV-SEED-003.",
    ],
    expected:
      "Restricted pages show access denied. Employee mutations return 403; a manager accessing another team's record receives 404. No status, balance or audit entry changes.",
  },
  {
    id: "hris-balance",
    title: "Reserved days consume the allowance",
    area: "HRIS",
    path: "/hris/new",
    setup:
      "Signed in as Alex with a one-day Annual allowance already reserved by the seeded request.",
    steps: [
      "Submit another one-day Annual request on non-overlapping dates.",
      "Cancel the seeded pending request, then submit again.",
      "Sign in as HR and try to reduce the allowance below committed days.",
    ],
    expected:
      "The first submission is rejected for insufficient balance. Cancelling releases the day. HR cannot set allowance below approved plus pending days.",
  },
  {
    id: "hris-conflict",
    title: "Two managers' tabs race a decision",
    area: "HRIS",
    path: "/hris/approvals",
    setup: "Signed in as Maya with Alex's pending request at version 1.",
    steps: [
      "Open the same request in two tabs.",
      "Approve in one; try rejecting the old version from the other tab or API.",
      "Inspect balances and Activity.",
    ],
    expected:
      "Exactly one transition is accepted. Stale decisions return 409. Balance and audit history reflect one decision only.",
  },
  {
    id: "hris-filters",
    title: "HR filters, sorting and pagination",
    area: "HRIS",
    path: "/hris/requests",
    setup:
      "Signed in as HR with ten requests across two teams, including seven extra half-day requests.",
    steps: [
      "Go to page two, then filter to Operations and Pending.",
      "Search an impossible name, clear filters and sort by leave start date.",
      "Open a record, use Back, then refresh.",
    ],
    expected:
      "Filters intersect and reset pagination. Empty results are explicit. Back and refresh preserve the URL filters and ordering. Page controls are valid at both ends.",
  },
  {
    id: "hris-retry",
    title: "Leave request saved, response interrupted",
    area: "HRIS",
    path: "/hris/new",
    setup:
      "Signed in as Alex. The next leave submission commits, then returns a simulated 503.",
    steps: [
      "Submit a valid request on a free working day.",
      "Retry the unchanged form after the error.",
      "Inspect requests, balances and Activity.",
    ],
    expected:
      "Only one request, one reserved amount and one submission audit entry exist.",
    fault: { api: "hris", action: "submit", mode: "lost" },
  },
  {
    id: "hris-expiry",
    title: "Employee session expires mid-form",
    area: "HRIS",
    path: "/hris/new",
    setup:
      "Signed in as Alex. The session expires immediately before submitting leave.",
    steps: [
      "Complete and submit a valid request.",
      "Sign in again and inspect requests and balances.",
    ],
    expected:
      "The expired session receives 401, the sign-in form appears, and no request or balance change is saved.",
    fault: { api: "hris", action: "submit", mode: "expire" },
  },

  {
    id: "login",
    title: "Sign in, sign out, come back",
    area: "Authentication",
    path: "/demo/login",
    setup: "A registered account with a saved notebook. Signed out.",
    steps: [
      "Sign in with the sample account below.",
      "Open Saved, sign out, then use Back and reload Account.",
      "Sign in again and open Saved.",
    ],
    expected:
      "Favorites return after login. Account details disappear after logout, including in another tab when it regains focus.",
  },
  {
    id: "guest-merge",
    title: "Guest bag meets an existing account",
    area: "Authentication",
    path: "/demo/login",
    setup:
      "The account has 2 Sand notebooks; the guest has 1. Both saved the same notebook.",
    steps: [
      "Sign in with the sample account.",
      "Open Your bag and Saved.",
      "Sign out, sign in again and check both lists.",
    ],
    expected:
      "One notebook line with quantity 3 and one favorite. Logging in again does not merge the guest bag twice.",
  },
  {
    id: "login-lockout",
    title: "Wrong password and lockout",
    area: "Authentication",
    path: "/demo/login",
    setup: "The sample account has four failed sign-in attempts.",
    steps: [
      "Submit a wrong password of at least 8 characters.",
      "Then submit the correct sample password.",
    ],
    expected:
      "The fifth wrong attempt says email or password is incorrect. The next attempt is rate limited for 15 minutes. Starting this scenario again resets the counter.",
  },
  {
    id: "session-expired",
    title: "Session expires while editing",
    area: "Authentication",
    path: "/demo/account",
    setup:
      "Signed in. The session expires immediately before the next profile save.",
    steps: [
      "Edit Full name, then Save details.",
      "Reload the page, sign in again and inspect the name.",
    ],
    expected:
      "Save is rejected with a sign-in message. The original name remains; the expired session cannot change the account.",
    fault: { api: "store", action: "profile", mode: "expire" },
  },
  {
    id: "filters",
    title: "Combined filters and browser history",
    area: "Search & filters",
    path: "/demo/sites/hireline",
    setup: "Ten jobs, including multiple teams, job types and remote roles.",
    steps: [
      "Combine Team, Job type and Remote only.",
      "Search for an impossible term, then clear the filters.",
      "Set filters again, open a result, use Back and reload.",
    ],
    expected:
      "Every result matches every active filter. Zero results is clear. Clear filters resets all controls. URL, reload and Back preserve the same filtered list.",
  },
  {
    id: "empty-workspace",
    title: "A truly empty workspace",
    area: "Boundaries",
    path: "/demo/sites/daybreak",
    setup: "Tasks and support tickets are empty.",
    steps: [
      "Inspect board counts, then open All tasks.",
      "Create a task and return to the board.",
      "Open Careloop and create its first request.",
    ],
    expected:
      "Counts show zero without NaN. Empty states have working creation links. New records appear and persist after reload.",
  },
  {
    id: "full-workspace",
    title: "At the record limit",
    area: "Boundaries",
    path: "/demo/sites/daybreak/new",
    setup: "200 tasks already exist, the workspace limit.",
    steps: [
      "Try to create another valid task.",
      "Delete one task, then try again.",
    ],
    expected:
      "The extra task is rejected without changing the count. Deleting one creates room for exactly one new task.",
  },
  {
    id: "unicode",
    title: "Unicode, long text and literal markup",
    area: "Search & filters",
    path: "/demo/sites/daybreak/list",
    setup:
      "Tasks include accented text, Arabic, Japanese, emoji and literal HTML-like text.",
    steps: [
      "Search for café, then Japanese text 東京.",
      "Inspect and edit the task containing <img text.",
      "Reload and inspect the saved description.",
    ],
    expected:
      "Search handles case and surrounding whitespace. User text remains literal text and never creates executable HTML. Long text stays within the layout.",
  },
  {
    id: "last-item",
    title: "The last notebook",
    area: "Commerce",
    path: "/demo/checkout",
    setup: "One notebook remains in inventory and one is in the bag.",
    steps: [
      "Complete checkout with valid sample details.",
      "Open the notebook product, then cancel the order.",
      "Cancel again through the API using the same order ID.",
    ],
    expected:
      "Checkout consumes the last item. Cancellation restores exactly one item; repeating cancellation never increases stock twice.",
  },
  {
    id: "booking-conflict",
    title: "Overlapping and adjacent stays",
    area: "Bookings",
    path: "/demo/sites/haven/bookings",
    setup:
      "Bamboo House is booked from three days from today through five days from today.",
    steps: [
      "Note the seeded booking dates.",
      "Try an overlapping Bamboo House stay.",
      "Try a stay starting on the seeded checkout date.",
    ],
    expected:
      "Overlap is rejected. Back-to-back stays are allowed. Cancelling the original frees its dates.",
  },
  {
    id: "last-seat",
    title: "One ticket, two contenders",
    area: "Bookings",
    path: "/demo/sites/gather/events/clay-club",
    setup:
      "Seven of eight Clay Club tickets are reserved in this test workspace.",
    steps: [
      "Open this event in two tabs of this browser.",
      "Reserve the last ticket in each tab.",
      "Cancel the successful reservation and try again.",
    ],
    expected:
      "Only one additional ticket can be reserved. Stale tabs cannot oversell. Cancellation frees one place.",
  },
  {
    id: "stale-edit",
    title: "Two tabs edit the same task",
    area: "Concurrency",
    path: "/demo/sites/daybreak",
    setup: "The normal seeded project board.",
    steps: [
      "Open the same task in two tabs.",
      "Save a changed title in the first tab.",
      "Save the older form in the second tab.",
    ],
    expected:
      "The stale form receives a conflict message. Reloading shows the first tab's change; it is never silently overwritten.",
  },
  {
    id: "slow-save",
    title: "Slow save and double click",
    area: "Network recovery",
    path: "/demo/sites/daybreak/new",
    setup: "The next task save takes 1.5 seconds before processing.",
    steps: [
      "Fill a valid task and rapidly submit twice.",
      "Inspect the disabled busy control and wait for completion.",
    ],
    expected:
      "Exactly one task is created. Pending state prevents a second submission and clears when the response arrives.",
    fault: { api: "workspace", action: "task-save", mode: "slow" },
  },
  {
    id: "retry-save",
    title: "Server error before saving",
    area: "Network recovery",
    path: "/demo/sites/daybreak/new",
    setup: "The next task save returns 503 before changing the database.",
    steps: [
      "Fill and submit a task.",
      "Inspect the error and unchanged form values.",
      "Submit the same form again.",
    ],
    expected:
      "The first save changes nothing. The retry creates one task, retains the entered values and clears the error.",
    fault: { api: "workspace", action: "task-save", mode: "unavailable" },
  },
  {
    id: "lost-response",
    title: "Save succeeds, response is lost",
    area: "Network recovery",
    path: "/demo/sites/daybreak/new",
    setup:
      "The next task save commits, then returns a simulated 503 instead of its result.",
    steps: [
      "Fill and submit a task.",
      "Retry the unchanged form after the error.",
      "Count matching tasks and reload.",
    ],
    expected:
      "The retry reuses its request ID. One task exists, even though the first response reported an error.",
    fault: { api: "workspace", action: "task-save", mode: "lost" },
  },
  {
    id: "checkout-lost",
    title: "Order commits before a lost response",
    area: "Network recovery",
    path: "/demo/checkout",
    setup:
      "One notebook is in the bag. The next checkout commits, then returns a simulated 503.",
    steps: [
      "Enter sample customer details and place the order.",
      "Retry the unchanged checkout after the error.",
      "Inspect order history and inventory.",
    ],
    expected:
      "The same order is returned. History contains one order and inventory decreases only once.",
    fault: { api: "store", action: "checkout", mode: "lost" },
  },
  {
    id: "rate-limit",
    title: "Temporary HTTP rate limit",
    area: "Network recovery",
    path: "/demo/login",
    setup: "The next sign-in returns 429 with Retry-After: 1.",
    steps: [
      "Sign in with the sample account.",
      "Read the error, wait one second and retry.",
    ],
    expected:
      "The first response changes no account state. A retry signs in normally and the error clears.",
    fault: { api: "store", action: "login", mode: "rate" },
  },
  {
    id: "load-error",
    title: "Initial page data fails",
    area: "Network recovery",
    path: "/demo/sites/daybreak",
    setup: "The next workspace bootstrap returns 503.",
    steps: [
      "Open the site and inspect its error state.",
      "Use Retry loading, without re-entering the URL.",
    ],
    expected:
      "A visible error and keyboard-accessible retry are offered. Retrying displays the seeded board.",
    fault: { api: "workspace", action: "bootstrap", mode: "unavailable" },
  },
  {
    id: "coupon-pass",
    title: "Known passing discount",
    area: "Detector controls",
    path: "/demo?bug=0",
    setup: "A 100000 IDR basket with the correct discount implementation.",
    steps: [
      "Enter SAVE10 in coupon-input.",
      "Click apply-coupon.",
      "Assert order-total has exact text 90000.",
    ],
    expected: "The business assertion passes: total is 90000.",
  },
  {
    id: "coupon-fail",
    title: "Known failing discount",
    area: "Detector controls",
    path: "/demo?bug=1",
    setup: "A 100000 IDR basket with an intentional discount defect.",
    steps: [
      "Enter SAVE10 in coupon-input.",
      "Click apply-coupon.",
      "Assert order-total has exact text 90000.",
    ],
    expected:
      "A correct test runner reports a FAILED assertion: expected 90000, actual 100000. The defect is intentional.",
  },
];
export type WorkflowCase = {
  id: string;
  area: string;
  scenario: string;
  title: string;
  steps: string;
  expected: string;
};
const rows: [string, string, string, string, string][] = [
  [
    "HRIS",
    "hris-journey",
    "Three-role approval journey",
    "Employee submits, manager approves, HR checks the balance and audit trail.",
    "Pending → Approved; one reserved amount becomes used once. Each role sees only allowed data.",
  ],
  [
    "HRIS",
    "hris-reject",
    "Rejection requires context",
    "Reject with a blank or short reason, then a valid explanation.",
    "Invalid reasons do not mutate state. Valid rejection releases days and is visible to the employee.",
  ],
  [
    "HRIS",
    "hris-permissions",
    "API role enforcement",
    "As employee POST decide/adjust-balance, including a forged role field.",
    "403; roles come from the authenticated server session, never submitted fields.",
  ],
  [
    "HRIS",
    "hris-permissions",
    "Manager team isolation",
    "Maya attempts to approve Nina's request or reads Operations data.",
    "No cross-team data is returned; the attempted decision returns 404.",
  ],
  [
    "HRIS",
    "hris-permissions",
    "Employee ownership",
    "Alex attempts to cancel Sam's request or forge employeeId on submission.",
    "Cancellation is denied; a submission always belongs to the signed-in employee.",
  ],
  [
    "HRIS",
    "hris-balance",
    "Balance reservation",
    "Submit more days than available, counting Pending requests too.",
    "409; no request or audit row and no negative balance.",
  ],
  [
    "HRIS",
    "hris-balance",
    "Cancellation restores days",
    "Cancel Pending and Approved future requests, then repeat.",
    "Days are released once. Repeating the same request ID is idempotent; a new invalid transition gets 409.",
  ],
  [
    "HRIS",
    "hris-journey",
    "Overlap across leave types",
    "Submit Sick leave overlapping Pending Annual leave.",
    "Overlap is rejected across types and pending/approved states.",
  ],
  [
    "HRIS",
    "hris-journey",
    "Working-day calculation",
    "Submit Friday through Monday, then weekend-only dates.",
    "Friday–Monday counts two days; weekend-only is rejected.",
  ],
  [
    "HRIS",
    "hris-journey",
    "Half-day boundary",
    "Submit one weekday as Half day, then a multi-day Half day.",
    "Single weekday reserves 0.5; multi-day half leave is rejected.",
  ],
  [
    "HRIS",
    "hris-journey",
    "Invalid dates",
    "Submit reversed, past, impossible, over-30-day and over-one-year dates.",
    "Validation errors with no mutation, even when HTML validation is bypassed.",
  ],
  [
    "HRIS",
    "hris-conflict",
    "Concurrent decisions",
    "Send approve and reject for version 1 concurrently.",
    "One succeeds, one gets 409; exactly one decision audit entry.",
  ],
  [
    "HRIS",
    "hris-conflict",
    "Terminal status transitions",
    "Try approving Rejected, Cancelled or already Approved requests.",
    "409; terminal requests cannot return to Pending or change decision.",
  ],
  [
    "HRIS",
    "hris-balance",
    "HR adjustment guard",
    "Reduce allowance below pending plus approved, then set a valid amount with a reason.",
    "Invalid adjustment is rejected; valid change is versioned and audited.",
  ],
  [
    "HRIS",
    "hris-balance",
    "Stale HR balance edit",
    "Submit two adjustments with the same employee version.",
    "Second gets 409; the first adjustment is preserved.",
  ],
  [
    "HRIS",
    "hris-filters",
    "Filter and pagination interaction",
    "Filter while on page 2, clear and sort, use Back and reload.",
    "Page resets on filter changes; count, rows and URL stay consistent.",
  ],
  [
    "HRIS",
    "hris-retry",
    "Ambiguous submission retry",
    "Retry an unchanged submission after its response is interrupted.",
    "Same record ID; one reservation and one audit entry.",
  ],
  [
    "HRIS",
    "hris-expiry",
    "Expired authorization",
    "Submit after session expiry, then sign in again.",
    "401; no request is created and no balance is consumed.",
  ],
  [
    "HRIS",
    "hris-journey",
    "Role switch and logout",
    "Sign out as employee, sign in as manager then HR; replay old session tokens.",
    "Session tokens rotate and old tokens cannot access private data.",
  ],
  [
    "HRIS",
    "hris-journey",
    "Audit integrity",
    "Inspect actor, target, old/new decision and timestamp after submit, decide, cancel and balance change.",
    "Each successful operation records one immutable audit event; rejected operations record none.",
  ],
  [
    "AUTH",
    "login",
    "Email normalization",
    "Sign in with ALEX@EXAMPLE.TEST; repeat with surrounding spaces through the API.",
    "The same account is used, with no duplicate user.",
  ],
  [
    "AUTH",
    "login",
    "Wrong password vs unknown user",
    "Try a wrong password, then an unknown email.",
    "Both return the same generic error and no account data.",
  ],
  [
    "AUTH",
    "login",
    "Duplicate registration",
    "Register the sample email again using different capitalization.",
    "409 conflict; existing account and password are unchanged.",
  ],
  [
    "AUTH",
    "login",
    "Password confirmation",
    "Register with mismatched passwords; correct the confirmation.",
    "Mismatch blocks submission; correction allows creation.",
  ],
  [
    "AUTH",
    "login",
    "Password bounds",
    "Submit passwords of 7, 8, 128 and 129 characters via the API.",
    "Only 8 through 128 characters are accepted; whitespace in passwords is significant.",
  ],
  [
    "AUTH",
    "login-lockout",
    "Persistent lockout",
    "Trigger lockout, reload and try the correct password.",
    "Reload does not reset the 15-minute rate limit.",
  ],
  [
    "AUTH",
    "guest-merge",
    "Guest favorites and cart merge",
    "Sign in twice, with a logout between attempts.",
    "Guest cart merges once and saved IDs remain unique.",
  ],
  [
    "AUTH",
    "session-expired",
    "Expired session write",
    "Save an edited profile after expiry.",
    "401; stored profile is unchanged.",
  ],
  [
    "AUTH",
    "login",
    "Logout across tabs",
    "Open Account in two tabs, sign out in one, focus the other.",
    "The other tab refreshes its session and hides private profile data.",
  ],
  [
    "AUTH",
    "login",
    "Session rotation",
    "Inspect HttpOnly cookies before and after sign-in and sign-out; replay the old token via API.",
    "Tokens rotate; the old token cannot read the account.",
  ],
  [
    "AUTH",
    "login",
    "Account isolation",
    "Use two browser contexts and try to cancel the other user's order ID.",
    "404 and no change to another user's order.",
  ],
  [
    "FILTER",
    "filters",
    "Filter intersection",
    "Combine a team, job type, remote flag and search text.",
    "Results match all active constraints, not just the last one.",
  ],
  [
    "FILTER",
    "filters",
    "Zero results and recovery",
    "Search an impossible term, then clear all filters.",
    "Zero state is explicit; all ten jobs return.",
  ],
  [
    "FILTER",
    "filters",
    "Back and refresh",
    "Filter, open a job, use Back, then reload.",
    "Filter values and result count agree with the URL.",
  ],
  [
    "FILTER",
    "unicode",
    "Case and whitespace",
    "Search CAFÉ and then padded café; search 東京.",
    "Case and outer whitespace do not change matching; Unicode works.",
  ],
  [
    "FILTER",
    "filters",
    "Literal special characters",
    "Search for .* [ ] % and an apostrophe.",
    "Input is literal text, never a regex or query expression.",
  ],
  [
    "FILTER",
    "filters",
    "Invalid URL filters",
    "Load a list with an unknown enum, invalid boolean and nonnumeric guest count.",
    "Invalid values fall back to valid defaults; controls and results agree.",
  ],
  [
    "FILTER",
    "filters",
    "Sort after filtering",
    "At Haven, choose Ubud and sort price low then high.",
    "Only Ubud stays remain and prices are correctly ordered.",
  ],
  [
    "FILTER",
    "filters",
    "Saved jobs plus filters",
    "Save two jobs; combine filters on Saved jobs; remove one.",
    "Only saved matching jobs appear; count updates after removal.",
  ],
  [
    "FILTER",
    "filters",
    "Dietary intersection",
    "At Table & Thyme combine Bowls, vegan and text search.",
    "Only matching vegan bowls remain; clear resets the checkbox too.",
  ],
  [
    "FORM",
    "empty-workspace",
    "Whitespace-only input",
    "Create a task or ticket using only spaces in required text.",
    "Server validation rejects it even if HTML validation is bypassed.",
  ],
  [
    "FORM",
    "unicode",
    "Long values",
    "Try a 120-character task title and then 121 through the API.",
    "120 is accepted; 121 is rejected without partial mutation.",
  ],
  [
    "FORM",
    "unicode",
    "Markup remains text",
    "Save literal <img src=x onerror=alert(1)> in a task description.",
    "The exact text is displayed; no image or script executes.",
  ],
  [
    "FORM",
    "filters",
    "Unsafe portfolio URL",
    "Apply to a job using javascript: or data: as the portfolio URL.",
    "The server accepts only http: or https: URLs.",
  ],
  [
    "FORM",
    "retry-save",
    "Values survive failed save",
    "Enter multiple fields, trigger 503, then inspect and retry.",
    "Entered values remain; error clears on success.",
  ],
  [
    "FORM",
    "empty-workspace",
    "Enter-key submit",
    "Complete a form using Tab and submit with Enter.",
    "Exactly one record is created with an accessible result.",
  ],
  [
    "CART",
    "last-item",
    "Stock boundary",
    "Request quantity zero, negative, fractional, string, 1 and above stock.",
    "Only valid integer quantities within stock are accepted.",
  ],
  [
    "CART",
    "last-item",
    "Aggregate stock across colors",
    "Add the same product in different colors beyond combined availability.",
    "Stock is enforced across variants; failed additions change nothing.",
  ],
  [
    "CART",
    "coupon-pass",
    "Coupon normalization and repeat",
    "Apply padded lowercase save10 twice.",
    "10% applies once and the total remains 90000.",
  ],
  [
    "CART",
    "coupon-pass",
    "Invalid coupon after valid",
    "Apply SAVE10, then an invalid code.",
    "Error appears; the accepted coupon and total remain consistent.",
  ],
  [
    "CART",
    "last-item",
    "Empty bag coupon",
    "Remove the final line, then apply a coupon via API.",
    "Coupon is cleared and the empty-bag request is rejected.",
  ],
  [
    "CART",
    "checkout-lost",
    "Pickup vs delivery validation",
    "Choose pickup with no address; switch to express delivery.",
    "Pickup needs no address; delivery requires address and five-digit postal code.",
  ],
  [
    "CART",
    "checkout-lost",
    "Server-owned prices",
    "Submit a fake total or unit price with checkout.",
    "The server calculates catalog prices and shipping itself.",
  ],
  [
    "CART",
    "checkout-lost",
    "Duplicate checkout",
    "Send the same checkout request ID twice, including concurrently.",
    "One order and one stock deduction; retries return the same order.",
  ],
  [
    "CART",
    "last-item",
    "Repeated cancellation",
    "Cancel an order twice.",
    "Stock is restored only once.",
  ],
  [
    "BOOK",
    "booking-conflict",
    "Overlapping dates",
    "Try partial overlap, identical dates and containing dates.",
    "Every overlap with a confirmed booking is rejected.",
  ],
  [
    "BOOK",
    "booking-conflict",
    "Adjacent dates",
    "Start a new stay exactly on an existing checkout date.",
    "Adjacent stays are accepted.",
  ],
  [
    "BOOK",
    "booking-conflict",
    "Invalid date ranges",
    "Try same-day, reversed, impossible date, 31 nights and over one year ahead.",
    "Invalid ranges are rejected without a booking.",
  ],
  [
    "BOOK",
    "booking-conflict",
    "Guest capacity",
    "Try zero guests and one more than room capacity.",
    "The server rejects both requests.",
  ],
  [
    "BOOK",
    "last-seat",
    "Stale availability race",
    "Reserve the final ticket from two tabs concurrently.",
    "One succeeds, one fails; confirmed total never exceeds capacity.",
  ],
  [
    "BOOK",
    "last-seat",
    "Cancel and reserve again",
    "Cancel a confirmed reservation and repeat the cancellation.",
    "Capacity is released once and can be reserved again.",
  ],
  [
    "STATE",
    "stale-edit",
    "Lost update prevention",
    "Save two different edits based on the same task version.",
    "First succeeds; second receives 409 and does not overwrite it.",
  ],
  [
    "STATE",
    "empty-workspace",
    "Refresh after create",
    "Create a task, reload its details and the board.",
    "The record is saved in PostgreSQL and counts agree.",
  ],
  [
    "STATE",
    "empty-workspace",
    "Deleted record deep link",
    "Delete a task, then revisit its old details URL.",
    "A useful not-found state replaces the edit form.",
  ],
  [
    "STATE",
    "full-workspace",
    "Record count boundary",
    "Attempt task 201; delete one and retry.",
    "The limit is enforced and recovering space works.",
  ],
  [
    "STATE",
    "filters",
    "Duplicate active application",
    "Apply to the same job twice, then withdraw and apply again.",
    "Active duplicate is rejected; reapplication after withdrawal works.",
  ],
  [
    "STATE",
    "empty-workspace",
    "Resolved ticket reply",
    "Create and resolve a ticket, attempt reply via API, reopen and reply.",
    "Closed reply is rejected; reopened reply persists.",
  ],
  [
    "STATE",
    "empty-workspace",
    "Cancellation confirmation",
    "Dismiss a delete/cancel confirmation, then accept it.",
    "Dismissal changes nothing; acceptance performs the change once.",
  ],
  [
    "NET",
    "slow-save",
    "Rapid duplicate clicks",
    "Double-click a slow submit.",
    "One mutation, visible busy state, then enabled controls.",
  ],
  [
    "NET",
    "retry-save",
    "503 before commit",
    "Submit then retry unchanged.",
    "First request changes nothing; retry creates one record.",
  ],
  [
    "NET",
    "lost-response",
    "503 after commit",
    "Submit then retry unchanged.",
    "Same request ID recovers the already-created record.",
  ],
  [
    "NET",
    "rate-limit",
    "429 retry",
    "Inspect Retry-After and retry after one second.",
    "A useful error appears; a later attempt succeeds.",
  ],
  [
    "NET",
    "load-error",
    "Initial load recovery",
    "Trigger failed bootstrap, then use Retry loading.",
    "No infinite loading screen; seeded data appears on retry.",
  ],
  [
    "API",
    "empty-workspace",
    "Malformed request",
    "POST malformed JSON, an array, unknown action and missing fields.",
    "400 responses with safe messages; no partial records.",
  ],
  [
    "API",
    "empty-workspace",
    "Payload limit",
    "POST more than 16 KiB to each business API and the lab API.",
    "413, with no state changes.",
  ],
  [
    "API",
    "empty-workspace",
    "Cross-origin mutation",
    "POST with an unrelated Origin or Sec-Fetch-Site: cross-site.",
    "403 before creating or mutating any state.",
  ],
  [
    "API",
    "lost-response",
    "Reused request ID with new payload",
    "Replay a successful request ID with changed task data.",
    "409; the first record is unchanged.",
  ],
  [
    "API",
    "empty-workspace",
    "Workspace isolation",
    "Read and edit record IDs from another browser context.",
    "Other workspace data is absent and mutations return 404.",
  ],
  [
    "UX",
    "filters",
    "Keyboard-only filters",
    "Navigate controls with Tab and choose values with the keyboard.",
    "Focus is visible and every filter is operable and labeled.",
  ],
  [
    "UX",
    "unicode",
    "Mobile long content",
    "Use a 375px viewport with long and Unicode task content.",
    "No horizontal document overflow or clipped controls.",
  ],
  [
    "UX",
    "retry-save",
    "Accessible error and recovery",
    "Trigger a server error, inspect alert semantics, retry.",
    "The error is announced and removed when the operation succeeds.",
  ],
  [
    "CONTROL",
    "coupon-fail",
    "Known bad assertion",
    "Assert exact total 90000 after SAVE10 in the broken scenario.",
    "A functioning test runner reports failure with actual 100000.",
  ],
  [
    "CONTROL",
    "coupon-pass",
    "Known good assertion",
    "Run the same assertion in the fixed scenario.",
    "The same test passes with actual 90000.",
  ],
  [
    "LAB",
    "login",
    "Fresh-run repeatability",
    "Start a preset, mutate it, then start the preset again.",
    "A new isolated run has its original seed data.",
  ],
  [
    "LAB",
    "login",
    "Normal data preservation",
    "Create a normal record, run a preset, then leave the lab.",
    "The normal browser's data and cookies are restored unchanged.",
  ],
];
const counts: Record<string, number> = {};
export const workflows: WorkflowCase[] = rows.map(
  ([area, scenario, title, steps, expected]) => ({
    id: `${area}-${String((counts[area] = (counts[area] || 0) + 1)).padStart(2, "0")}`,
    area,
    scenario,
    title,
    steps,
    expected,
  }),
);
