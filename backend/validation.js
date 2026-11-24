class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const uuid = (value) => typeof value === 'string'
  && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value);
const text = (max) => (value) => typeof value === 'string'
  && value.trim().length > 0 && [...value].length <= max && !value.includes('\0');
const optional = (check) => (value) => value === null || check(value);
const choice = (...values) => (value) => values.includes(value);
const bool = (value) => typeof value === 'boolean';
const money = (minimum) => (value) => (
  typeof value === 'number' && /^\d{1,8}(?:\.\d{1,2})?$/.test(String(value)) && value >= minimum
);
const date = (value) => typeof value === 'string'
  && /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;
const timestamp = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)
  && date(value.slice(0, 10))
  && Number.isFinite(Date.parse(value));
const email = (value) => text(254)(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const listOf = (check) => (value) => Array.isArray(value) && value.length <= 100 && value.every(check);

function readBody(body, fields, required = [], allowEmpty = false) {
  if (!isObject(body) || (!allowEmpty && Object.keys(body).length === 0)) {
    throw new HttpError(400, 'Provide a JSON object with the resource fields');
  }
  for (const key of required) {
    if (!Object.hasOwn(body, key)) throw new HttpError(400, `Missing field: ${key}`);
  }
  const values = {};
  for (const [key, value] of Object.entries(body)) {
    if (!Object.hasOwn(fields, key)) throw new HttpError(400, `Unknown field: ${key}`);
    if (!fields[key](value)) throw new HttpError(400, `Invalid field: ${key}`);
    values[key] = typeof value === 'string' ? value.trim() : value;
  }
  return values;
}

function readId(value, name = 'id') {
  if (!uuid(value)) throw new HttpError(400, `Invalid ${name}`);
  return value;
}

function readInteger(value, name, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
    throw new HttpError(400, `${name} must be an integer from ${min} to ${max}`);
  }
  return Number(value);
}

function teeth(value) {
  const toothList = listOf((tooth) => isObject(tooth)
    && Object.keys(tooth).length === 3
    && text(10)(tooth.toothIdentifier)
    && /^[a-z\d-]+$/i.test(tooth.toothIdentifier)
    && optional(text(160))(tooth.condition)
    && optional(text(4000))(tooth.notes));
  return toothList(value)
    && new Set(value.map((tooth) => tooth.toothIdentifier.toUpperCase())).size === value.length;
}

module.exports = {
  HttpError, uuid, text, optional, choice, bool, money, date, timestamp, email, listOf, teeth,
  readBody, readId, readInteger,
};
