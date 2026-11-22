// PROVIDED: do not edit.
// The only door the screens use to reach TableTurn's backend. Each call returns a Promise of { status, body },
// exactly what a small fetch wrapper gives: the HTTP status, and the JSON body (the answer, or the problem).
//
// Here the backend runs in the browser (src/backend/). To use the real MERN server instead, keep these two
// functions' names and replace what they do with fetch, for example:
//   const API_URL = 'http://localhost:8080';
//   async function call(method, path, body) {
//     const res = await fetch(API_URL + path, {
//       method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
//       body: body === undefined ? undefined : JSON.stringify(body),
//     });
//     return { status: res.status, body: await res.json() };
//   }
import { handle } from './backend/routes.js';

/** What travels over the network is text: the screens and the backend never share an object. */
const overTheWire = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

async function call(method, path, body) {
  return overTheWire(handle(method, path, overTheWire(body)));
}

export const api = {
  get: (path) => call('GET', path),
  post: (path, body) => call('POST', path, body),
};
