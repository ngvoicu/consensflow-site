/**
 * The demo the screenshots show: one small web app, "pantry", run by a chief
 * on Claude Code and a staff in all nine roles, on Codex, Pi, Claude Code,
 * Devin and Muse Code, with a task in every column of the board. A member is
 * named by the model and effort it runs on, as the daemon names one
 * (crates/cf-ledger/src/handles.rs), and a session by its member's name and
 * two words. One worker is out of quota and its backup takes its tasks;
 * another is on Vacation.
 *
 * It is written in the shapes the daemon answers the page with (`board.get`,
 * `task.get`, `inbox.get`, `models.get`...), as the app's own page tests write
 * theirs (consensflow/app/tests/core-page.spec.mjs), and its ids follow one
 * another as the ledger would number them. Times are minutes before the
 * capture, so the page reads them as it would. What the open windows show is
 * in tools/screens.mjs; the specs folder its chief wrote is in tools/specs.mjs.
 */

import { specs } from './specs.mjs'

const DIRECTORY = '/Users/demo/projects/pantry'
const PROJECT = 1

const at = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString()

/** The roles that take no tier (`cf_ledger::roles`): a frontend designer, an architect, a researcher, an integrator, an image designer. */
const UNTIERED = ['frontend', 'architect', 'researcher', 'integrator', 'designer']

function participant(id, handle, role, extra = {}) {
  return {
    id,
    projectId: PROJECT,
    handle,
    role,
    roles: ['human', 'chief'].includes(role) ? [] : [role],
    agent: null,
    harness: null,
    model: null,
    effort: null,
    modelName: null,
    designer: false,
    tier: null,
    outUntil: null,
    memberId: null,
    member: null,
    session: null,
    ...extra,
  }
}

/**
 * A member of the staff, named as the daemon names it: the model's id as its harness lists it
 * (Pi's without its provider), then the effort, in lowercase words joined by "-".
 */
function member(id, roles, harness, model, effort, tier, extra = {}) {
  const shown = model.includes('/') ? model.slice(model.indexOf('/') + 1) : model
  const handle = [shown, effort]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-')
  return participant(id, handle, roles[0], {
    roles,
    harness,
    model,
    effort,
    modelName: model,
    tier: roles.every((role) => UNTIERED.includes(role)) ? null : tier,
    ...extra,
  })
}

/** A session of a member, in one of its roles: the window one task runs in, named after the member. */
const session = (id, of, name, role = of.role) =>
  participant(id, `${of.handle}-${name}`, role, {
    roles: [role],
    harness: of.harness,
    model: of.model,
    effort: of.effort,
    modelName: of.modelName,
    designer: of.designer,
    nameApart: of.nameApart,
    tier: of.tier,
    memberId: of.id,
    member: of.handle,
    session: name,
  })

const human = participant(1, 'human', 'human')
export const chief = participant(2, 'chief', 'chief', {
  harness: 'claude-code',
  model: 'claude-opus-5-5',
  effort: 'xhigh',
  modelName: 'claude-opus-5-5',
})

/** The out-of-quota worker's reset: two hours and a quarter after the capture. */
const OUT_UNTIL = new Date(Date.now() + 135 * 60_000).toISOString()

const staff = {
  // Workers, in two tiers; one out of quota, one on Vacation.
  terra: member(3, ['worker'], 'codex', 'gpt-6.1-terra', 'high', 'standard'),
  astra: member(4, ['worker'], 'pi', 'openai-codex/gpt-6-astra', 'medium', 'standard', {
    modelName: 'openai-codex/gpt-6-astra',
    outUntil: OUT_UNTIL,
  }),
  sonnet: member(5, ['worker'], 'claude-code', 'claude-sonnet-5-5', 'medium', 'light'),
  luna: member(6, ['worker'], 'codex', 'gpt-6-luna', 'low', 'light', { vacationSince: at(1440) }),
  // The roles with no tier.
  sol: member(7, ['frontend'], 'codex', 'gpt-6.1-sol', 'high', null),
  fable: member(8, ['architect'], 'claude-code', 'claude-fable-5-1', 'max', null),
  swe: member(9, ['researcher'], 'devin', 'swe-3', null, null),
  // An advisor and a reviewer in one member.
  opus: member(10, ['reviewer', 'advisor'], 'devin', 'claude-opus-5-5', 'max', 'complex'),
  muse: member(11, ['tester'], 'muse', 'muse-spark-1.3', null, 'standard'),
  haiku: member(12, ['integrator'], 'claude-code', 'claude-haiku-5-5', 'high', null),
  // The image designer draws on Codex's own model: its name says nothing of one.
  designer: participant(13, 'codex-default', 'designer', {
    roles: ['designer'],
    harness: 'codex',
    designer: true,
    nameApart: true,
  }),
}
/** The out-of-quota worker's backup, on another harness and model: it takes that worker's tasks. */
staff.backup = member(14, ['worker'], 'claude-code', 'claude-sonnet-5-5', 'high', 'standard', {
  backupOf: staff.astra.id,
})

const sessions = {
  t1: session(20, staff.astra, 'amber-pine'),
  t2: session(21, staff.terra, 'quiet-harbor'),
  t3: session(22, staff.opus, 'sunny-birch', 'reviewer'),
  t4: session(23, staff.sol, 'hazel-delta'),
  t5: session(24, staff.astra, 'brisk-ridge'),
  t6: session(25, staff.opus, 'calm-brook', 'advisor'),
  t7: session(26, staff.sonnet, 'misty-glade'),
  t8: session(27, staff.backup, 'gentle-cedar'),
  t11: session(28, staff.fable, 'golden-summit'),
  t12: session(29, staff.swe, 'olive-island'),
  t13: session(30, staff.muse, 'keen-meadow'),
  t14: session(31, staff.haiku, 'tidy-harbor'),
  t15: session(32, staff.designer, 'vivid-comet'),
}

function task(number, title, body, state, assignee, minutesAgo, extra = {}) {
  return {
    id: number,
    projectId: PROJECT,
    number,
    title,
    body: `${title}\n\n${body}`,
    state,
    requester: 'chief',
    assignee,
    pool: 'worker',
    tier: 'standard',
    purpose: null,
    needs: [],
    blockedBy: [],
    deletedAt: null,
    createdAt: at(minutesAgo + 6),
    updatedAt: at(minutesAgo),
    stateSince: at(minutesAgo),
    ...extra,
  }
}

/** T-2's thread, oldest first: the brief, a question and its answer, a result, the follow-up, the second result. */
export const T2 = {
  brief: [
    '- `POST /api/list` adds an item (name, quantity, unit)',
    '- `PATCH /api/list/:id` checks it off or on',
    '- `DELETE /api/list/checked` clears what is checked',
    '',
    'Keep the routes beside `server/routes/items.ts` and the tests beside theirs. Run `npm test` before you report.',
  ].join('\n'),
  question:
    'Should clearing delete the checked rows, or keep them and mark them cleared? `items` keeps its history with a `deleted_at` column; the list could do the same.',
  answer:
    'Delete them. The list is a scratch pad: nothing reads old entries, and `items` keeps the history that matters.',
  result1: `Done. The three routes are in \`server/routes/list.ts\`, mounted in \`server/app.ts\`.

- \`POST /api/list\` adds an item; a quantity keeps its decimals (1.5 kg stays 1.5).
- \`PATCH /api/list/:id\` checks an item off, or on again.
- \`DELETE /api/list/checked\` deletes what is checked, as you answered in m-5.

15 new tests in \`server/routes/list.test.ts\`. \`npm test\` passes: 61 tests.`,
  followUp: `The review (T-3) found two things to fix before I accept this:

1. \`DELETE /api/list/checked\` deletes one row at a time; a failure halfway leaves the list half cleared. Clear it in one transaction.
2. \`PATCH /api/list/:id\` answers 500 for an id that does not exist. Answer 404.

Add a test for each, run \`npm test\`, and report.`,
  result2: `Both fixed.

- Clearing runs in one transaction (\`db.transaction\` in \`server/routes/list.ts\`): a failing delete rolls the whole clear back.
- An unknown id answers 404 with \`{ "error": "no such item" }\`.

3 new tests in \`server/routes/list.test.ts\`. \`npm test\` passes: 64 tests.`,
}

export const REVIEW = `Not ready yet: two findings.

1. \`server/routes/list.ts:48\`: clearing deletes row by row, outside a transaction; a failure halfway leaves the list half cleared.
2. \`server/routes/list.ts:31\`: \`PATCH\` with an unknown id throws, so the client gets a 500; it should get a 404.

Otherwise the routes match the brief, and each has its tests.`

/** The advice on time zones, as it reached the chief (tools/screens.mjs shows it arriving). */
export const ADVICE = `Send at 08:00 in each household's own time zone, the day before an item expires. A date is enough for the item; the household needs a time zone.

1. Add \`households.time_zone\` (an IANA name, such as Europe/Lisbon); fill it at sign-up from the browser.
2. Run a job every hour and pick the households whose 08:00 has just passed.
3. Keep \`reminded_on\` per item, so a restart sends nothing twice.`

const tasks = {
  t1: task(
    1,
    'Add expires_on to pantry items, with a migration',
    'A nullable date column, a migration that adds it, and the field in the item form.',
    'accepted',
    sessions.t1.handle,
    95,
    { result: 'Migration 0007 adds expires_on; the item form has a date field. 46 tests pass.' },
  ),
  t2: task(2, 'Shopping list API: add, check off, clear', T2.brief, 'accepted', sessions.t2.handle, 41, {
    result: T2.result2,
  }),
  t3: task(
    3,
    'Review T-2: the shopping list API',
    'Read the change for T-2 with `cf task get T-2` and the diff. Is it right, and is it tested?',
    'accepted',
    sessions.t3.handle,
    41,
    { pool: 'reviewer', tier: 'complex', result: REVIEW },
  ),
  t4: task(
    4,
    'Shopping list page: add, check off, clear done',
    'A page at /list on the API from T-2, for someone at the shop with one hand free: an input to add, a checkbox per item, a button to clear what is checked. Its empty, loading and error states, on a phone first.',
    'working',
    sessions.t4.handle,
    3,
    { pool: 'frontend', tier: null, needs: [{ number: 2, state: 'accepted' }] },
  ),
  t5: task(
    5,
    'Fix: quantities with decimals round to whole numbers',
    'Adding 1.5 kg of flour shows 2 kg on the pantry page.',
    'waiting',
    sessions.t5.handle,
    6,
  ),
  t6: task(
    6,
    'How should expiry reminders handle time zones?',
    'We store expires_on as a date. A reminder goes out the morning before. Which zone is "the morning", and what do we need to store for it?',
    'done',
    sessions.t6.handle,
    14,
    { pool: 'advisor', tier: 'complex', result: ADVICE },
  ),
  t7: task(
    7,
    'Seed a demo household for local development',
    'One household, 20 pantry items with a mix of expiry dates, a few list entries; safe to run twice.',
    'working',
    sessions.t7.handle,
    2,
    { tier: 'light' },
  ),
  t8: task(
    8,
    "Store each household's time zone",
    'households.time_zone, an IANA name, filled at sign-up from the browser; editable in settings.',
    'working',
    sessions.t8.handle,
    1,
  ),
  t9: task(
    9,
    'Expiry reminders by email',
    "A morning email of what expires tomorrow, at 08:00 in the household's time zone (T-6's advice).",
    'open',
    null,
    1,
    {
      needs: [
        { number: 4, state: 'working' },
        { number: 11, state: 'done' },
        { number: 8, state: 'working' },
      ],
      blockedBy: [4, 8, 11],
    },
  ),
  t10: task(
    10,
    'Document the shopping list and the reminders in the README',
    'What the list does, how reminders are sent, and how to run them locally.',
    'open',
    null,
    0,
    { tier: 'light', needs: [{ number: 9, state: 'open' }], blockedBy: [9] },
  ),
  t11: task(
    11,
    'Design the reminder job: its schedule, its table and the email',
    "From T-6's advice: the hourly job, `reminded_on`, and what the email holds. A document and the job's frame in code, no sending yet.",
    'done',
    sessions.t11.handle,
    8,
    { pool: 'architect', tier: null, result: 'The design is in `docs/reminders.md`, the frame in `server/jobs/reminders.ts`.' },
  ),
  t12: task(
    12,
    'Which email services send from our own domain on a free plan?',
    'For the reminders: a free plan, sending from pantry.example, and an API from Node.',
    'accepted',
    sessions.t12.handle,
    5,
    { pool: 'researcher', tier: null, result: 'Three do, each with its limits and where it says so.' },
  ),
  t13: task(
    13,
    'Test the shopping list API against its brief, on a fresh database',
    'Run each route by hand and with the tests; say what passes and what does not, with evidence.',
    'accepted',
    sessions.t13.handle,
    4,
    { pool: 'tester', result: 'Every route behaves as the brief says. 64 tests pass on a fresh database.' },
  ),
  t14: task(
    14,
    'Merge the shopping list API into main, checked',
    'T-2, accepted, and its review T-3: merge, run the checks, land it.',
    'accepted',
    sessions.t14.handle,
    2,
    { pool: 'integrator', tier: null, result: 'Merged and landed: 64 tests pass on main.' },
  ),
  t15: task(
    15,
    'An empty-list drawing for the shopping list page',
    'A paper bag, empty, flat colours; 480 by 360, transparent; saved to client/public/empty-list.png.',
    'queued',
    sessions.t15.handle,
    1,
    { pool: 'designer', tier: null },
  ),
}

const lane = (who, held, activity = 'closed', pane = null, extra = {}) => ({
  participant: who,
  tasks: held,
  activity: { state: activity },
  pane,
  agentMissing: false,
  hidden: false,
  switching: null,
  holding: false,
  ...extra,
})

/** A window, as the board names it: `{id, generation}`. */
export const panes = {
  chief: { id: `p${PROJECT}-chief`, generation: 3 },
  [sessions.t4.handle]: { id: `p${PROJECT}-${sessions.t4.handle}`, generation: 1 },
  [sessions.t5.handle]: { id: `p${PROJECT}-${sessions.t5.handle}`, generation: 1 },
  [sessions.t7.handle]: { id: `p${PROJECT}-${sessions.t7.handle}`, generation: 1 },
  [sessions.t8.handle]: { id: `p${PROJECT}-${sessions.t8.handle}`, generation: 1 },
}

/** The handles the board and the screens name, by what each is. */
export const names = {
  ...Object.fromEntries(Object.entries(staff).map(([key, who]) => [key, who.handle])),
  sessions: Object.fromEntries(Object.entries(sessions).map(([key, who]) => [key, who.handle])),
}

const board = {
  project: {
    id: PROJECT,
    name: 'pantry',
    directory: DIRECTORY,
    state: 'open',
    gate: false,
    ownHands: false,
    compaction: 300_000,
    specs: { on: true, folder: '.specs', variant: 'core' },
  },
  open: [tasks.t9, tasks.t10],
  gated: [],
  lanes: [
    lane(human, []),
    lane(chief, [], 'working', panes.chief),
    lane(staff.terra, []),
    lane(staff.astra, [], 'closed', null, { backupReady: { worker: staff.backup.handle } }),
    lane(staff.backup, []),
    lane(staff.sonnet, []),
    lane(staff.luna, []),
    lane(staff.sol, []),
    lane(staff.fable, []),
    lane(staff.swe, []),
    lane(staff.opus, []),
    lane(staff.muse, []),
    lane(staff.haiku, []),
    lane(staff.designer, []),
    lane(sessions.t1, [tasks.t1]),
    lane(sessions.t2, [tasks.t2]),
    lane(sessions.t3, [tasks.t3]),
    lane(sessions.t4, [tasks.t4], 'working', panes[sessions.t4.handle]),
    lane(sessions.t5, [tasks.t5], 'idle', panes[sessions.t5.handle]),
    lane(sessions.t6, [tasks.t6]),
    lane(sessions.t7, [tasks.t7], 'working', panes[sessions.t7.handle]),
    lane(sessions.t8, [tasks.t8], 'working', panes[sessions.t8.handle]),
    lane(sessions.t11, [tasks.t11]),
    lane(sessions.t12, [tasks.t12]),
    lane(sessions.t13, [tasks.t13]),
    lane(sessions.t14, [tasks.t14]),
    lane(sessions.t15, [tasks.t15], 'starting'),
  ],
}

/** A message of a task's thread as the ledger's MessageView has it, delivered a few seconds after it was sent. */
function message(id, kind, sender, recipient, body, minutesAgo, extra = {}) {
  return {
    id,
    projectId: PROJECT,
    recipient,
    recipientRole: recipient === 'chief' ? 'chief' : 'worker',
    sender,
    kind,
    taskNumber: 2,
    replyTo: null,
    body,
    state: 'delivered',
    attempts: 1,
    reason: null,
    receipt: { evidence: `native-${id}` },
    questions: null,
    choices: null,
    urgent: false,
    createdAt: at(minutesAgo),
    deliveredAt: at(minutesAgo - 0.1),
    ...extra,
  }
}

/**
 * The ledger's messages, numbered in the order they were sent: m-1 and m-2
 * were T-1's; m-3 to m-6 and m-9, m-10 T-2's; m-7, m-8 the review's; m-11 the
 * note below; m-12 to m-15 the briefs of T-4 to T-7; m-16 the advice on its
 * way to the chief, m-17 the Pi worker's question waiting behind it, m-18 T-8's brief.
 */
const worker = sessions.t2.handle
const theT2 = {
  ...tasks.t2,
  messages: [
    message(3, 'task', 'chief', worker, tasks.t2.body, 82),
    message(4, 'question', worker, 'chief', T2.question, 76),
    message(5, 'answer', 'chief', worker, T2.answer, 74, { replyTo: 4 }),
    message(6, 'result', worker, 'chief', T2.result1, 62),
    message(9, 'task', 'chief', worker, T2.followUp, 50),
    message(10, 'result', worker, 'chief', T2.result2, 43),
  ],
}

const note = {
  id: 11,
  kind: 'note',
  state: 'queued',
  sender: 'chief',
  recipient: 'human',
  taskNumber: 2,
  body: 'The shopping list API is in: T-2, reviewed in T-3. The page is under way in T-4.',
  createdAt: at(32),
}

/**
 * The chief's history, as `history.get` pages it: its Claude Code conversation
 * of the afternoon (the one going on now) and the one `/clear` ended before it.
 * A result, a question or an advisor's answer reaches the chief as a delivery,
 * which the history folds to its line: `at` is where in the text it starts.
 */
const delivered = (id, number, kind, from, text) => ({
  text: `[ConsensFlow m-${id} · T-${number} · ${kind} from @${from}]\n${text}`,
  delivery: { line: `· m-${id}: @${from}'s ${kind} on T-${number} (cf task get T-${number})`, at: 0 },
})
const entry = (conversation, row, role, minutesAgo, said) => ({
  conversation,
  row: conversation * 100 + row,
  id: `h-${conversation}-${row}`,
  role,
  complete: true,
  at: at(minutesAgo),
  ...(typeof said === 'string' ? { text: said } : said),
})
const chiefHistory = {
  conversations: [
    {
      id: 1,
      harness: 'claude-code',
      model: chief.model,
      startedAt: at(1620),
      endedAt: at(1590),
      endedBy: { by: 'window', resumed: false },
    },
    { id: 2, harness: 'claude-code', model: chief.model, startedAt: at(185), endedAt: null, endedBy: null },
  ],
  items: [
    entry(1, 0, 'user', 1620, 'Read the pantry app and tell me what it does and how it is tested.'),
    entry(
      1,
      1,
      'assistant',
      1619,
      'A Node and SQLite app: households keep pantry items, with a form and a page to list them. `npm test` runs 46 tests.',
    ),
    entry(
      2,
      0,
      'user',
      180,
      "The pantry app needs a shopping list: add items, check them off, clear what's done. Keep the list on the server, and have the API reviewed before the page is built on it.",
    ),
    entry(
      2,
      1,
      'assistant',
      179,
      'I will read the routes the app has, then put the list on the board: the API first, a review of it, and the page waiting for both.',
    ),
    entry(2, 2, 'tool', 179, {
      kind: 'tool',
      name: 'Bash',
      header: 'ls server/routes',
      text: 'households.ts\nitems.ts',
      status: 'ok',
      tookMs: 40,
    }),
    entry(
      2,
      3,
      'assistant',
      176,
      'T-2 is the API for a standard worker, T-3 its review, and T-4 the page, for the frontend designer once T-2 is accepted.',
    ),
    entry(2, 4, 'user', 114, delivered(4, 2, 'question', worker, T2.question)),
    entry(2, 5, 'assistant', 113, 'Delete them: the list is a scratch pad, and `items` keeps the history that matters.'),
    entry(2, 6, 'user', 62, delivered(6, 2, 'result', worker, T2.result1)),
    entry(2, 7, 'user', 48, delivered(8, 3, 'result', sessions.t3.handle, REVIEW)),
    entry(2, 8, 'assistant', 47, 'The review found two things to fix, so T-2 goes back to the same window.'),
    entry(
      2,
      9,
      'user',
      30,
      'Next: expiry reminders by email, the morning before an item expires. Households are in different time zones, so take care there.',
    ),
    entry(
      2,
      10,
      'assistant',
      29,
      'Time zones are the open question. I will ask an advisor before I write the tasks: which zone is "the morning", and what has to be stored.',
    ),
    entry(2, 11, 'tool', 29, {
      kind: 'tool',
      name: 'Bash',
      header: 'cf task add --advice --tier complex "How should expiry reminders handle time zones?…"',
      text: 'T-6 is on the board for a complex advisor; it starts in a new window of one, and its result arrives in your inbox.',
      status: 'ok',
      tookMs: 310,
    }),
    entry(2, 12, 'user', 14, delivered(16, 6, 'result', sessions.t6.handle, ADVICE)),
    entry(
      2,
      13,
      'assistant',
      12,
      "The advice is clear: store each household's time zone (T-8), have the architect design the job (T-11), then send the reminders (T-9) once the page, the design and the time zone are in.",
    ),
  ],
}

const projects = [
  { id: PROJECT, name: 'pantry', directory: DIRECTORY, state: 'open', resumeOnStart: false },
  {
    id: 2,
    name: 'field-notes',
    directory: '/Users/demo/projects/field-notes',
    state: 'open',
    resumeOnStart: false,
  },
  {
    id: 3,
    name: 'invoice-export',
    directory: '/Users/demo/projects/invoice-export',
    state: 'suspended',
    resumeOnStart: false,
  },
]

/** The staff the New project dialog starts with: the last project's, as `staff.last` gives it. */
const lastStaff = [staff.terra, staff.sonnet, staff.sol, staff.opus, staff.muse].flatMap((who) =>
  who.roles.map((role) => ({
    harness: who.harness,
    model: who.model,
    effort: who.effort,
    modelName: who.modelName,
    designer: false,
    tier: who.tier,
    role,
    roles: [role],
  })),
)

/** A fresh listing of `models`, as a harness gives one. */
const listed = (models) => ({
  models,
  readAt: Date.now() - 60_000,
  freshness: { state: 'fresh' },
  how: 'the harness itself',
})
const efforts = (...names) => names
/**
 * What each installed harness lists of its models, by its program's name, as `models.get`
 * answers: the stand-in harnesses list none, so the demo's are written here, with the ids
 * the app's own tests use.
 */
const models = {
  claude: listed([
    { id: 'claude-opus-5-5', label: 'Opus 5.5', efforts: efforts('low', 'medium', 'high', 'xhigh', 'max') },
    { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', efforts: efforts('low', 'medium', 'high', 'xhigh', 'max') },
    { id: 'claude-haiku-5-5', label: 'Haiku 5.5', efforts: efforts('low', 'medium', 'high') },
    { id: 'claude-fable-5-1', label: 'Fable 5.1', efforts: efforts('low', 'medium', 'high', 'xhigh', 'max') },
  ]),
  codex: listed([
    { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', efforts: efforts('low', 'medium', 'high', 'xhigh', 'max') },
    { id: 'gpt-6.1-terra', label: 'GPT-6.1 Terra', efforts: efforts('low', 'medium', 'high', 'xhigh') },
    { id: 'gpt-6-astra', label: 'GPT-6 Astra', efforts: efforts('low', 'medium', 'high') },
    { id: 'gpt-6-luna', label: 'GPT-6 Luna', efforts: efforts('low', 'medium', 'high') },
  ]),
  pi: listed([
    { id: 'gpt-6-astra', provider: 'openai-codex', label: 'GPT-6 Astra', efforts: efforts('low', 'medium', 'high') },
    { id: 'kimi-k3', provider: 'moonshot', label: 'Kimi K3', efforts: [] },
  ]),
  devin: listed([
    { id: 'swe-3', label: 'SWE-3', efforts: [] },
    { id: 'swe-2', label: 'SWE-2', efforts: [] },
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', efforts: efforts('high', 'max') },
  ]),
  muse: listed([{ id: 'muse-spark-1.3', label: 'Muse Spark 1.3', efforts: [] }]),
}

/**
 * The switch the human makes last (Switch chief, on the chief's card): the
 * chief goes on Codex, on GPT-6.1 Sol at max effort, in a window of its own,
 * the next generation of the chief's pane; its first message is the handoff
 * (tools/screens.mjs). The chief on Claude Code finished its turn first.
 */
export const SWITCH = {
  harness: 'codex',
  harnessLabel: 'Codex',
  model: 'gpt-6.1-sol',
  modelLabel: 'GPT-6.1 Sol',
  effort: 'max',
  pane: { ...panes.chief, generation: 4 },
}

export const demo = {
  directory: DIRECTORY,
  switchTo: SWITCH,
  newFolder: '/Users/demo/projects/recipe-cards',
  projects,
  boards: { [PROJECT]: board },
  inbox: { [PROJECT]: [note] },
  tasks: { [`${PROJECT}:2`]: theT2 },
  // What its window wrote is not shown: the fold stays shut, with its count.
  transcripts: { [`${PROJECT}:2`]: { items: [], total: 58 } },
  lastStaff,
  models,
  // The project's specs folder, its chief's history, and its wake-up calls (every two hours, the default words).
  specs,
  histories: { chief: chiefHistory },
  wakeUps: { [PROJECT]: { on: true, everyMs: 2 * 3_600_000, text: null } },
}
