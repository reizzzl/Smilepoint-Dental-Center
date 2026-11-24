const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { test } = require('node:test');
const { createApp } = require('../app');
const { createDatabase } = require('../config/db');
const ids = require('./fixtures');

async function listen(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function withApi(t, handleDataRequest) {
  const calls = [];
  const errors = [];
  const key = 'sb_publishable_test';
  const supabase = await listen(t, createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const token = req.headers.authorization?.slice('Bearer '.length);
    const role = token?.replace('access-', '');
    const respond = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    try {
      calls.push([req.method, url.pathname, token]);
      assert.equal(req.headers.apikey, key);
      if (url.pathname === '/auth/v1/user') {
        if (!Object.hasOwn(ids, role)) {
          return respond(401, { message: 'Expired token', error_code: 'bad_jwt' });
        }
        // The API must use the stored profile, even if editable Auth metadata claims to be admin.
        return respond(200, { id: ids[role], user_metadata: { role: 'admin' } });
      }
      assert.ok(token?.startsWith('access-'));
      if (url.pathname === '/rest/v1/staff_profile' && req.method === 'GET'
        && url.searchParams.get('id') === `eq.${ids[role]}`) {
        const active = role !== 'inactive';
        const profile = { id: ids[role], role: active ? role : 'dentist', full_name: role, active };
        return respond(200, role === 'unassigned' ? [] : [profile]);
      }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
      const [status, data] = await handleDataRequest({ req, url, body, role });
      respond(status, data);
    } catch (error) {
      errors.push(error);
      respond(500, { message: 'Unexpected test upstream call' });
    }
  }));
  const database = createDatabase(supabase, key);
  const app = createApp({ database, origins: ['http://localhost:5173'] });
  const base = await listen(t, createServer(app));
  t.after(() => assert.deepEqual(errors, []));

  async function request(path, { role, method = 'GET', body, raw, headers } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(role && { Authorization: `Bearer access-${role}` }),
        ...((body !== undefined || raw !== undefined) && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return {
      status: response.status,
      headers: response.headers,
      json: response.status === 204 ? null : await response.json(),
    };
  }
  return { request, calls };
}

test('public health, CORS, bearer authentication, and active staff enrollment', async (t) => {
  const { request, calls } = await withApi(t);
  const health = await request('/api/health', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(health.json.status, 'OK');
  assert.equal(health.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const preflight = await request('/api/patients', { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
  } });
  assert.equal(preflight.status, 204);
  assert.equal((await request('/api/health', { headers: { Origin: 'https://other.example' } }))
    .headers.get('access-control-allow-origin'), null);
  assert.equal((await request('/api/patients')).status, 401);
  assert.equal(calls.length, 0);
  for (const [role, status] of [['expired', 401], ['unassigned', 403], ['inactive', 403]]) {
    assert.equal((await request('/api/auth/me', { role })).status, status);
  }
  const me = await request('/api/auth/me', { role: 'receptionist' });
  assert.equal(me.status, 200);
  assert.equal(me.json.data.role, 'receptionist');
  assert.equal(me.headers.get('cache-control'), 'no-store');
});

test('role checks gate clinical, billing, service, staff, and dashboard operations', async (t) => {
  const { request, calls } = await withApi(t);
  for (const [role, method, path] of [
    ['receptionist', 'GET', '/api/treatments'],
    ['receptionist', 'GET', `/api/patients/${ids.patient}/medical-history`],
    ['dentist', 'GET', '/api/payments'],
    ['dentist', 'POST', '/api/patients'],
    ['receptionist', 'POST', '/api/services'],
    ['receptionist', 'GET', '/api/dashboard/summary'],
    ['dentist', 'GET', '/api/staff'],
    ['admin', 'POST', '/api/treatments'],
    ['admin', 'PATCH', `/api/staff/${ids.admin.toUpperCase()}`],
    ['admin', 'PUT', `/api/patients/${ids.patient}/dental-chart`],
  ]) {
    assert.equal((await request(path, { role, method, ...(method !== 'GET' && { body: {} }) })).status, 403);
  }
  assert.ok(calls.every(([, path]) => ['/auth/v1/user', '/rest/v1/staff_profile'].includes(path)));
});

test('patient create, get, patch and paginated appointment reads use the caller token', async (t) => {
  let patient;
  const { request } = await withApi(t, ({ req, url, body, role }) => {
    assert.equal(role, 'receptionist');
    if (url.pathname === '/rest/v1/appointment') {
      assert.equal(url.searchParams.get('patient_id'), `eq.${ids.patient}`);
      assert.equal(url.searchParams.get('limit'), '5');
      assert.equal(url.searchParams.get('offset'), '1');
      return [200, [{ id: ids.appointment }]];
    }
    assert.equal(url.pathname, '/rest/v1/patient');
    if (req.method === 'POST') {
      assert.deepEqual(body, { full_name: 'Sample Patient' });
      patient = { id: ids.patient, ...body };
      return [201, patient];
    }
    assert.equal(url.searchParams.get('id'), `eq.${ids.patient}`);
    if (req.method === 'PATCH') patient = { ...patient, ...body };
    return [200, [patient]];
  });
  const role = 'receptionist';
  const created = await request('/api/patients', { role, method: 'POST', body: { full_name: ' Sample Patient ' } });
  assert.equal(created.status, 201);
  const path = created.headers.get('location');
  assert.equal(path, `/api/patients/${ids.patient}`);
  const changed = await request(path, { role, method: 'PATCH', body: { phone: '09170000000' } });
  assert.equal(changed.json.data.phone, '09170000000');
  assert.deepEqual((await request(path, { role })).json.data, changed.json.data);
  assert.deepEqual((await request(`/api/appointments?patient_id=${ids.patient}&limit=5&offset=1`, { role })).json,
    { data: [{ id: ids.appointment }], limit: 5, offset: 1 });
});

test('validates inputs and maps database conflicts, invalid rows, and missing records', async (t) => {
  const { request } = await withApi(t, ({ req, url }) => {
    if (url.pathname === '/rest/v1/appointment') return [409, { code: '23505', message: 'Internal index' }];
    if (req.method === 'POST') return [400, { code: '23514', message: 'Internal constraint' }];
    return [200, []];
  });
  const role = 'receptionist';
  const appointment = {
    patient_id: ids.patient, service_id: ids.service, scheduled_at: '2026-12-01T10:00+08:00',
  };
  for (const [path, body] of [
    ['/api/patients', { full_name: 'Sample', date_of_birth: '2026-02-30' }],
    ['/api/patients', { full_name: 'Sample', id: ids.patient }],
    ['/api/appointments', { ...appointment, scheduled_at: '2026-12-01T10:00' }],
    ['/api/payments', { patient_id: ids.patient, service_id: ids.service, amount: 1.234 }],
  ]) {
    assert.equal((await request(path, { role, method: 'POST', body })).status, 400);
  }
  assert.equal((await request('/api/patients', { role, method: 'POST', raw: '{invalid' })).status, 400);
  assert.equal((await request('/api/patients?limit=101', { role })).status, 400);
  assert.equal((await request('/api/patients/invalid', { role })).status, 400);
  assert.equal((await request(`/api/patients/${ids.patient}`, { role })).status, 404);
  const conflict = await request('/api/appointments', { role, method: 'POST', body: appointment });
  assert.equal(conflict.status, 409);
  assert.doesNotMatch(conflict.json.error, /index/i);
  const constraint = await request('/api/patients', {
    role, method: 'POST', body: { full_name: 'Sample', date_of_birth: '2090-01-01' },
  });
  assert.equal(constraint.status, 400);
});

test('clinical records are upserted with defaults and returned in the clinical frontend format', async (t) => {
  const records = new Map();
  const { request } = await withApi(t, ({ req, url, body, role }) => {
    if (req.method === 'POST') {
      assert.equal(role, 'dentist');
      assert.equal(url.searchParams.get('on_conflict'), 'patient_id');
      assert.match(req.headers.prefer, /resolution=merge-duplicates/);
      records.set(url.pathname, body);
      return [201, body];
    }
    assert.equal(role, 'admin');
    assert.equal(url.searchParams.get('patient_id'), `eq.${ids.patient}`);
    return [200, [records.get(url.pathname)]];
  });
  const path = `/api/patients/${ids.patient}`;
  const history = await request(`${path}/medical-history`, {
    role: 'dentist', method: 'PUT', body: { allergies: ['Latex'] },
  });
  assert.equal(history.status, 200);
  assert.deepEqual(history.json.data, {
    patientId: ids.patient, existingConditions: [], allergies: ['Latex'], currentMedications: [],
    previousDentalHistory: null, clinicalNotes: null,
  });
  assert.deepEqual((await request(`${path}/medical-history`, { role: 'admin' })).json, history.json);
  const teeth = [{ toothIdentifier: '16', condition: 'Restored', notes: null }];
  const chart = await request(`${path}/dental-chart`, { role: 'dentist', method: 'PUT', body: { teeth } });
  assert.equal(chart.status, 200);
  assert.deepEqual(chart.json.data, { patientId: ids.patient, teeth, historySummary: null });
  assert.equal((await request(`${path}/dental-chart`, {
    role: 'dentist', method: 'PUT', body: { teeth: [...teeth, ...teeth] },
  })).status, 400);
});

test('administrator uses the database summary RPC', async (t) => {
  const stats = { patients: 2, appointments: 1, services: 2, payments: 1200 };
  const { request } = await withApi(t, ({ req, url, role }) => {
    assert.equal(role, 'admin');
    assert.equal(req.method, 'POST');
    assert.equal(url.pathname, '/rest/v1/rpc/clinic_summary');
    return [200, stats];
  });
  assert.deepEqual((await request('/api/dashboard/summary', { role: 'admin' })).json, { data: stats });
});
