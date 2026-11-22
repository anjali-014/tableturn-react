// PROVIDED: do not edit.
// The backend's front door: a method and a path go to the service that answers them, as the MERN routers do, and
// come back as { status, body }. The checks on a query or a body happen here first; a refusal leaves in the one
// problem shape (type, title, status, detail, instance, and its extra fields); a path the app does not serve is a 404.
import { Refusal, validationError } from './errors.js';
import { listParties, party } from './parties/service.js';
import { clear, leave, seat } from './seatings/service.js';
import { currentSeating, floor, table } from './tables/service.js';
import { join } from './waitlist/service.js';

// ── The checks, with the messages the MERN backend's schemas give ────────
/** The type a value has, as the messages name it. */
function typeOf(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isNaN(value)) return 'nan';
  return typeof value;
}

function wrongType(expected, value) {
  return value === undefined ? 'Required' : `Expected ${expected}, received ${typeOf(value)}`;
}

/** A value that must be one of `options`, or absent. */
function oneOf(options, value) {
  if (value === undefined || options.includes(value)) return [];
  return [`Invalid enum value. Expected ${options.map((o) => `'${o}'`).join(' | ')}, received '${value}'`];
}

/** A string of at least `min` and at most `max` characters. */
function text(value, { min, max } = {}) {
  if (typeof value !== 'string') return [wrongType('string', value)];
  const problems = [];
  if (min !== undefined && value.length < min) problems.push(`String must contain at least ${min} character(s)`);
  if (max !== undefined && value.length > max) problems.push(`String must contain at most ${max} character(s)`);
  return problems;
}

/** A whole number from `min` to `max`. */
function wholeNumber(value, { min, max }) {
  if (typeof value !== 'number' || Number.isNaN(value)) return [wrongType('number', value)];
  const problems = [];
  if (!Number.isInteger(value)) problems.push('Expected integer, received float');
  if (value < min) problems.push(`Number must be greater than or equal to ${min}`);
  if (value > max) problems.push(`Number must be less than or equal to ${max}`);
  return problems;
}

/** Throws one 400 naming every bad field, or returns the values. `checks` is { field: [messages] }. */
function parse(values, checks) {
  const errors = Object.entries(checks).flatMap(([field, messages]) => messages.map((message) => ({ field, message })));
  if (errors.length) throw validationError(errors);
  return values;
}

function asObject(body) {
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) return body;
  throw validationError([{ field: '', message: wrongType('object', body) }]);
}

const floorQuery = (q) => parse({ section: q.section, state: q.state }, {
  section: oneOf(['Window', 'Garden', 'Indoor'], q.section),
  state: oneOf(['free', 'seated', 'uncleared'], q.state),
});

function joinBody(body) {
  const { name, covers, phone } = asObject(body);
  return parse({ name, covers, phone }, {
    name: [...text(name, { max: 60 }), ...(typeof name === 'string' && name.trim().length === 0 ? ['must not be blank'] : [])],
    covers: wholeNumber(covers, { min: 1, max: 20 }),
    phone: phone === undefined ? [] : typeof phone !== 'string' ? [wrongType('string', phone)]
      : /^\+[1-9]\d{1,14}$/.test(phone) ? [] : ['must be a phone number in E.164 form, e.g. +919876543210'],
  });
}

function seatBody(body) {
  const { partyId, table: no } = asObject(body);
  return parse({ partyId, table: no }, { partyId: text(partyId, { min: 1 }), table: text(no, { min: 1 }) });
}

// ── The routes ───────────────────────────────────────────────────────────
const ROUTES = [
  ['GET', '/branches/:branch/tables', ({ params, query }) => [200, floor(params.branch, floorQuery(query))]],
  ['GET', '/branches/:branch/tables/:no', ({ params }) => [200, table(params.branch, params.no)]],
  // Not in the MERN API: stands in for the seating id Leave and Clear need (see tables/service.js).
  ['GET', '/branches/:branch/tables/:no/seating', ({ params }) => [200, currentSeating(params.branch, params.no)]],
  ['POST', '/waitlist', ({ body }) => [201, join(joinBody(body))]],
  // Not in the MERN API: stands in for the list of tonight's parties (see parties/service.js).
  ['GET', '/parties', () => [200, listParties()]],
  ['GET', '/parties/:partyId', ({ params }) => [200, party(params.partyId)]],
  ['POST', '/seatings', ({ body }) => [201, seat(seatBody(body))]],
  ['POST', '/seatings/:seatingId/leave', ({ params }) => [200, leave(params.seatingId)]],
  ['POST', '/seatings/:seatingId/clear', ({ params }) => [200, clear(params.seatingId)]],
].map(([method, pattern, run]) => ({
  method,
  names: [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]),
  regex: new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`),
  run,
}));

/** One request: method, path (with its query, if any) and body in; { status, body } out. */
export function handle(method, url, body) {
  const [path, queryText = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryText));
  for (const route of ROUTES) {
    const match = route.method === method && route.regex.exec(path);
    if (!match) continue;
    const params = Object.fromEntries(route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]));
    try {
      const [status, answer] = route.run({ params, query, body });
      return { status, body: answer };
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      const body = { type: error.type, title: error.title, status: error.status, detail: error.message, instance: path };
      return { status: error.status, body: { ...body, ...error.extras } };
    }
  }
  return { status: 404, body: { type: 'about:blank', title: 'Not Found', status: 404, detail: `Nothing is served at ${path}`, instance: path } };
}
