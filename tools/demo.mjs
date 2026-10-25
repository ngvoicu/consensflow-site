/**
 * The demo the screenshots show: one small web app, "pantry", run by a chief
 * on Claude Code and a staff of four on Codex, Pi, OpenCode and Devin, with a
 * task in every column of the board. It is written in the shapes the daemon
 * answers the page with (`board.get`, `task.get`, `inbox.get`...), as the
 * app's own page tests write theirs (consensflow/app/tests/core-page.spec.mjs),
 * and its ids follow one another as the ledger would number them.
 * Times are minutes before the capture, so the page reads them as it would.
 * What the open windows show is in tools/screens.mjs; the specs folder its
 * chief wrote is in tools/specs.mjs.
 */

import { specs } from './specs.mjs'

const DIRECTORY = '/Users/demo/projects/pantry'
const PROJECT = 1

const at = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString()

const STAFF_ROLES = ['worker', 'advisor', 'reviewer']

function participant(id, handle, role, extra = {}) {
  const member = STAFF_ROLES.includes(role)
  return {
    id,
    projectId: PROJECT,
    handle,
    role,
    roles: member ? [role] : [],
    agent: member ? handle : null,
    harness: null,
    designer: false,
    tier: null,
    outUntil: null,
    memberId: null,
    member: null,
    session: null,
    ...extra,
  }
}

/** A member of the staff: an agent of the catalog, in its roles, at the tier the catalog gives it. */
const member = (id, handle, roles, harness, tier) =>
  participant(id, handle, roles[0], { roles, harness, tier })

/** A session of a member, in one of its roles: the window one task runs in, named after the member. */
const session = (id, of, name, role = of.role) =>
  participant(id, `${of.handle}-${name}`, role, {
    roles: [role],
    agent: of.agent,
    harness: of.harness,
    tier: of.tier,
    memberId: of.id,
    member: of.handle,
    session: name,
  })

const human = participant(1, 'human', 'human')
const chief = participant(2, 'chief', 'chief', { agent: 'zeus', harness: 'claude-code' })
const theia = member(3, 'theia', ['worker'], 'codex', 'standard')
const merope = member(4, 'merope', ['worker'], 'pi', 'standard')
const audhumla = member(5, 'audhumla', ['worker'], 'opencode', 'light')
const seshat = member(6, 'seshat', ['reviewer', 'advisor'], 'devin', 'complex')

const sessions = {
  t1: session(7, merope, 'amber-pine'),
  t2: session(8, theia, 'quiet-fern'),
  t3: session(9, seshat, 'sunny-birch', 'reviewer'),
  t4: session(10, theia, 'hazel-delta'),
  t5: session(11, merope, 'brisk-reed'),
  t6: session(12, seshat, 'calm-brook', 'advisor'),
  t7: session(13, audhumla, 'misty-glade'),
  t8: session(14, merope, 'gentle-cove'),
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
    'A page at /list on the API from T-2: an input to add, a checkbox per item, a button to clear what is checked.',
    'working',
    sessions.t4.handle,
    3,
    { needs: [{ number: 2, state: 'accepted' }] },
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
    'queued',
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
        { number: 6, state: 'done' },
        { number: 8, state: 'queued' },
      ],
      blockedBy: [4, 6, 8],
    },
  ),
  t10: task(
    10,
    'Document the shopping list and the reminders in the README',
    'What the list does, how reminders are sent, and how to run them locally.',
    'open',
    null,
    0,
    { needs: [{ number: 9, state: 'open' }], blockedBy: [9] },
  ),
}

const lane = (who, held, activity = 'closed', pane = null) => ({
  participant: who,
  tasks: held,
  activity: { state: activity },
  pane,
  agentMissing: false,
  hidden: false,
  switching: null,
  holding: false,
})

/** A window, as the board names it: `{id, generation}`. */
export const panes = {
  chief: { id: `p${PROJECT}-chief`, generation: 3 },
  [sessions.t4.handle]: { id: `p${PROJECT}-${sessions.t4.handle}`, generation: 1 },
  [sessions.t5.handle]: { id: `p${PROJECT}-${sessions.t5.handle}`, generation: 1 },
  [sessions.t7.handle]: { id: `p${PROJECT}-${sessions.t7.handle}`, generation: 1 },
  [sessions.t8.handle]: { id: `p${PROJECT}-${sessions.t8.handle}`, generation: 1 },
}

const board = {
  project: {
    id: PROJECT,
    name: 'pantry',
    directory: DIRECTORY,
    state: 'open',
    gate: false,
    specs: { on: true, folder: '.specs', variant: 'core' },
  },
  open: [tasks.t9, tasks.t10],
  gated: [],
  lanes: [
    lane(human, []),
    lane(chief, [], 'working', panes.chief),
    lane(theia, []),
    lane(merope, []),
    lane(audhumla, []),
    lane(seshat, []),
    lane(sessions.t1, [tasks.t1]),
    lane(sessions.t2, [tasks.t2]),
    lane(sessions.t3, [tasks.t3]),
    lane(sessions.t4, [tasks.t4], 'working', panes[sessions.t4.handle]),
    lane(sessions.t5, [tasks.t5], 'idle', panes[sessions.t5.handle]),
    lane(sessions.t6, [tasks.t6]),
    lane(sessions.t7, [tasks.t7], 'working', panes[sessions.t7.handle]),
    lane(sessions.t8, [tasks.t8], 'starting', panes[sessions.t8.handle]),
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
 * way to the chief, m-17 merope's question waiting behind it, m-18 T-8's brief.
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
  createdAt: at(39),
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
      agent: 'zeus',
      startedAt: at(1620),
      endedAt: at(1590),
      endedBy: { by: 'window', resumed: false },
    },
    { id: 2, harness: 'claude-code', agent: 'zeus', startedAt: at(185), endedAt: null, endedBy: null },
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
    entry(2, 2, 'tool', 179, 'server/routes/items.ts  server/routes/households.ts  server/app.ts'),
    entry(
      2,
      3,
      'assistant',
      176,
      'T-2 is the API for a standard worker, T-3 its review, and T-4 the page, waiting until T-2 is accepted.',
    ),
    entry(2, 4, 'user', 114, delivered(4, 2, 'question', 'theia', T2.question)),
    entry(2, 5, 'assistant', 113, 'Delete them: the list is a scratch pad, and `items` keeps the history that matters.'),
    entry(2, 6, 'user', 62, delivered(6, 2, 'result', 'theia', T2.result1)),
    entry(2, 7, 'user', 48, delivered(8, 3, 'result', 'seshat', REVIEW)),
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
    entry(2, 11, 'tool', 29, 'cf task add --advice --tier complex "How should expiry reminders handle time zones?"'),
    entry(2, 12, 'user', 14, delivered(16, 6, 'result', 'seshat', ADVICE)),
    entry(
      2,
      13,
      'assistant',
      12,
      "The advice is clear: store each household's time zone (T-8), then send the reminders (T-9) once the page, the advice and the time zone are in.",
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
const lastStaff = [theia, merope, audhumla, seshat].map((who) => ({
  agent: who.agent,
  harness: who.harness === 'claude-code' ? 'claude' : who.harness,
  designer: false,
  tier: who.tier,
  roles: who.roles,
}))

/**
 * The switch the human makes last (Switch chief, on the chief's card): the
 * chief goes on Codex, on hyperion, in a window of its own, the next
 * generation of the chief's pane; its first message is the handoff
 * (tools/screens.mjs). zeus finished its turn first, and is gone.
 */
export const SWITCH = { agent: 'hyperion', harness: 'codex', pane: { ...panes.chief, generation: 4 } }

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
  // The project's specs folder, its chief's history, and its wake-up calls (every two hours, the default words).
  specs,
  histories: { chief: chiefHistory },
  wakeUps: { [PROJECT]: { on: true, everyMs: 2 * 3_600_000, text: null } },
  // Agents the human adds to the staff in Project settings: a tester and the image designer.
  joining: {
    diana: { harness: 'codex', tier: 'light', designer: false },
    pygmalion: { harness: 'codex', tier: null, designer: true },
  },
}
