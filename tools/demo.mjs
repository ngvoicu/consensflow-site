/**
 * The demo the screenshots show: one small web app, "pantry", run by a chief
 * on Claude Code and a staff of four on Codex, Pi, OpenCode and Devin, with a
 * task in every column of the board. It is written in the shapes the daemon
 * answers the page with (`board.get`, `task.get`, `inbox.get`...), as the
 * app's own page tests write theirs (consensflow/app/tests/core-page.spec.mjs).
 * Times are minutes before the capture, so the page reads them as it would.
 */

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

/** A member of the staff: an agent of the catalog, in one role, at the tier the catalog gives it. */
const member = (id, handle, role, harness, tier) =>
  participant(id, handle, role, { harness, tier })

/** A session of a member: the window one task runs in, named after the member. */
const session = (id, of, name) =>
  participant(id, `${of.handle}-${name}`, of.role, {
    roles: [of.role],
    agent: of.agent,
    harness: of.harness,
    tier: of.tier,
    memberId: of.id,
    member: of.handle,
    session: name,
  })

const human = participant(1, 'human', 'human')
const chief = participant(2, 'chief', 'chief', { agent: 'zeus', harness: 'claude-code' })
const theia = member(3, 'theia', 'worker', 'codex', 'standard')
const merope = member(4, 'merope', 'worker', 'pi', 'standard')
const audhumla = member(5, 'audhumla', 'advisor', 'opencode', 'light')
const seshat = member(6, 'seshat', 'reviewer', 'devin', 'complex')

const sessions = {
  t1: session(7, merope, 'amber-pine'),
  t2: session(8, theia, 'quiet-fern'),
  t3: session(9, audhumla, 'calm-brook'),
  t4: session(10, seshat, 'sunny-birch'),
  t5: session(11, theia, 'hazel-delta'),
  t6: session(12, merope, 'brisk-reed'),
  t7: session(13, merope, 'gentle-cove'),
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

const RESULT_T2 = `Done. The three routes are in \`server/routes/list.ts\`, mounted in \`server/app.ts\`.

- \`POST /api/list\` adds an item; a quantity keeps its decimals (1.5 kg stays 1.5).
- \`PATCH /api/list/:id\` checks an item off, or on again.
- \`DELETE /api/list/checked\` clears what is checked, in one transaction.

18 new tests in \`server/routes/list.test.ts\`. \`npm test\` passes: 64 tests.`

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
  t2: task(
    2,
    'Shopping list API: add, check off, clear',
    [
      '- `POST /api/list` adds an item (name, quantity, unit)',
      '- `PATCH /api/list/:id` checks it off or on',
      '- `DELETE /api/list/checked` clears what is checked',
      '',
      'Keep the routes beside `server/routes/items.ts` and the tests beside theirs. Run `npm test` before you report.',
    ].join('\n'),
    'accepted',
    sessions.t2.handle,
    40,
    { result: RESULT_T2 },
  ),
  t3: task(
    3,
    'How should expiry reminders handle time zones?',
    'We store expires_on as a date. A reminder goes out the morning before. Which zone is "the morning", and what do we need to store for it?',
    'done',
    sessions.t3.handle,
    22,
    {
      pool: 'advisor',
      tier: 'light',
      result:
        'Store each household’s time zone and send at 08:00 in it; a date alone is enough for the item.',
    },
  ),
  t4: task(
    4,
    'Review T-2: the shopping list API',
    'Read the change for T-2 with `cf task get T-2` and the diff. Is it right, and is it tested?',
    'accepted',
    sessions.t4.handle,
    44,
    {
      pool: 'reviewer',
      tier: 'complex',
      result: 'Approve. Routes match the brief, clearing is atomic, the tests cover each route.',
    },
  ),
  t5: task(
    5,
    'Shopping list page: add, check off, clear done',
    'A page at /list on the API from T-2: an input to add, a checkbox per item, a button to clear what is checked.',
    'working',
    sessions.t5.handle,
    12,
    { needs: [{ number: 2, state: 'accepted' }] },
  ),
  t6: task(
    6,
    'Fix: quantities with decimals round to whole numbers',
    'Adding 1.5 kg of flour shows 2 kg on the pantry page.',
    'waiting',
    sessions.t6.handle,
    8,
  ),
  t7: task(
    7,
    'Sort the pantry list by expiry date',
    'Soonest first; items with no date last, by name.',
    'queued',
    sessions.t7.handle,
    1,
    { needs: [{ number: 1, state: 'accepted' }] },
  ),
  t8: task(
    8,
    'Expiry reminders by email',
    'A morning email of what expires tomorrow, one per household, only when something does. Follow T-3’s advice on time zones.',
    'open',
    null,
    20,
    {
      needs: [
        { number: 3, state: 'done' },
        { number: 5, state: 'working' },
      ],
      blockedBy: [3, 5],
    },
  ),
  t9: task(
    9,
    'Review T-5',
    'Once T-5 is done: read its change with `cf task get T-5` and try the page.',
    'open',
    null,
    11,
    {
      pool: 'reviewer',
      tier: 'complex',
      needs: [{ number: 5, state: 'working' }],
      blockedBy: [5],
    },
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

const pane = (who, generation = 1) => ({ id: `p${PROJECT}-${who.handle}`, generation })

const board = {
  project: { id: PROJECT, name: 'pantry', directory: DIRECTORY, state: 'open', gate: false },
  open: [tasks.t8, tasks.t9],
  gated: [],
  lanes: [
    lane(human, []),
    lane(chief, [], 'working', pane(chief, 3)),
    lane(theia, []),
    lane(merope, []),
    lane(audhumla, []),
    lane(seshat, []),
    lane(sessions.t1, [tasks.t1]),
    lane(sessions.t2, [tasks.t2]),
    lane(sessions.t3, [tasks.t3]),
    lane(sessions.t4, [tasks.t4]),
    lane(sessions.t5, [tasks.t5], 'working', pane(sessions.t5)),
    lane(sessions.t6, [tasks.t6], 'idle', pane(sessions.t6)),
    lane(sessions.t7, [tasks.t7], 'starting', pane(sessions.t7)),
  ],
}

function message(id, kind, sender, recipient, body, minutesAgo) {
  return {
    id,
    kind,
    sender,
    recipient,
    state: 'delivered',
    reason: null,
    body,
    createdAt: at(minutesAgo),
  }
}

const theT2 = {
  ...tasks.t2,
  messages: [
    message(3, 'task', 'chief', sessions.t2.handle, tasks.t2.body, 70),
    message(6, 'result', sessions.t2.handle, 'chief', RESULT_T2, 52),
  ],
}

const note = {
  id: 14,
  kind: 'note',
  state: 'queued',
  sender: 'chief',
  recipient: 'human',
  taskNumber: 2,
  body: 'The shopping list API is in: T-2, reviewed in T-4. The page is under way in T-5, and the reminders (T-8) wait for it.',
  createdAt: at(36),
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
  roles: [who.role],
}))

export const demo = {
  directory: DIRECTORY,
  newFolder: '/Users/demo/projects/recipe-cards',
  projects,
  boards: { [PROJECT]: board },
  inbox: { [PROJECT]: [note] },
  tasks: { [`${PROJECT}:2`]: theT2 },
  // What its window wrote is not shown: the fold stays shut, with its count.
  transcripts: { [`${PROJECT}:2`]: { items: [], total: 31 } },
  lastStaff,
}
