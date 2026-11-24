const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { PGlite } = require('@electric-sql/pglite');
const ids = require('./fixtures');

test('schema, seed data, constraints, and direct Supabase-style access', async (t) => {
  const db = await PGlite.create();
  t.after(() => db.close());

  // Minimal Supabase Auth schema for testing the real application SQL in PostgreSQL.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `);

  const [schema, seed] = await Promise.all(['smilepoint.sql', 'seed.sql'].map(
    (file) => readFile(resolve(__dirname, '../../database', file), 'utf8'),
  ));
  await db.exec(schema);
  await db.exec(seed);
  await db.exec(seed);

  for (const role of ['admin', 'dentist', 'receptionist', 'inactive', 'unassigned']) {
    await db.query('insert into auth.users (id) values ($1)', [ids[role]]);
  }
  for (const role of ['admin', 'dentist', 'receptionist']) {
    await db.query('insert into staff_profile (id, full_name, role) values ($1, $2, $3)', [ids[role], role, role]);
  }
  await db.query("insert into staff_profile (id, full_name, role, active) values ($1, 'Inactive', 'dentist', false)", [ids.inactive]);

  async function as(role, verify) {
    await db.exec('begin');
    try {
      await db.exec(role === 'anon' ? 'set local role anon' : 'set local role authenticated');
      if (role !== 'anon') await db.query("select set_config('request.jwt.claim.sub', $1, true)", [ids[role]]);
      await verify();
    } finally {
      await db.exec('rollback');
    }
  }

  await t.test('anonymous, inactive, and unassigned sessions cannot read clinic rows', async () => {
    await as('anon', async () => {
      await assert.rejects(db.query('select * from patient'), { code: '42501' });
    });
    for (const role of ['inactive', 'unassigned']) {
      await as(role, async () => {
        assert.deepEqual((await db.query('select id from patient')).rows, []);
        assert.deepEqual((await db.query('select id from appointment')).rows, []);
        assert.equal((await db.query('select id from staff_profile')).rows.length, role === 'inactive' ? 1 : 0);
      });
    }
  });

  await t.test('receptionist can schedule and bill with clinical and role isolation', async () => {
    await as('receptionist', async () => {
      assert.equal((await db.query('select id from patient')).rows.length, 2);
      assert.equal((await db.query('select id from payment')).rows.length, 2);
      assert.deepEqual((await db.query('select id from treatment_record')).rows, []);
      assert.deepEqual((await db.query('select patient_id from medical_history')).rows, []);
      assert.deepEqual((await db.query('select id from staff_profile')).rows, [{ id: ids.receptionist }]);
      assert.equal((await db.query("update staff_profile set role = 'admin' where id = $1 returning id", [ids.receptionist])).rows.length, 0);
      assert.deepEqual((await db.query('update appointment set dentist_id = $1 where id = $2 returning dentist_id',
        [ids.dentist, ids.appointment])).rows, [{ dentist_id: ids.dentist }]);
      assert.equal((await db.query("update appointment set status = 'Completed' where id = $1 returning status", [ids.appointment])).rows[0].status, 'Completed');
      assert.equal((await db.query("update payment set status = 'Paid' where id = $1 returning status", [ids.payment])).rows[0].status, 'Paid');
      await assert.rejects(db.query('select clinic_summary()'), { code: '42501' });
    });
    await as('receptionist', async () => {
      await assert.rejects(db.query("insert into treatment_record (patient_id, treatment) values ($1, 'Exam')", [ids.patient]), { code: '42501' });
    });
  });

  await t.test('dentist can save a clinical record with a repeatable upsert and cannot access payments', async () => {
    await as('dentist', async () => {
      assert.deepEqual((await db.query('select id from payment')).rows, []);
      for (const allergy of ['Latex', 'Penicillin']) {
        await db.query(`
          insert into medical_history (patient_id, allergies) values ($1, array[$2]::text[])
          on conflict (patient_id) do update set patient_id = excluded.patient_id, allergies = excluded.allergies
        `, [ids.patient, allergy]);
      }
      assert.deepEqual((await db.query('select allergies from medical_history where patient_id = $1', [ids.patient])).rows,
        [{ allergies: ['Penicillin'] }]);
      assert.equal((await db.query("update patient set full_name = 'Changed' returning id")).rows.length, 0);
    });
  });

  await t.test('admin can manage profiles and report paid totals, with read-only clinical access', async () => {
    await as('admin', async () => {
      const { rows } = await db.query('select clinic_summary() as summary');
      assert.deepEqual(rows[0].summary, { patients: 2, appointments: 1, services: 2, payments: 1200 });
      assert.equal((await db.query('select id from treatment_record')).rows.length, 1);
      assert.equal((await db.query("update treatment_record set remarks = 'Changed' returning id")).rows.length, 0);
      assert.equal((await db.query('update staff_profile set active = false where id = $1 returning id', [ids.admin])).rows.length, 0);
      assert.deepEqual((await db.query('update staff_profile set active = false where id = $1 returning active', [ids.dentist])).rows, [{ active: false }]);
      await assert.rejects(db.query('delete from patient where id = $1', [ids.patient]), { code: '42501' });
    });
  });

  await t.test('database rejects duplicate slots, dangling foreign keys, and invalid payments', async () => {
    await assert.rejects(db.query(`
      insert into appointment (patient_id, service_id, scheduled_at)
      values ($1, $2, '2026-12-01 02:00:00Z')
    `, [ids.patient, ids.service]), { code: '23505' });
    await assert.rejects(db.query(
      'insert into payment (patient_id, service_id, amount) values ($1, $2, -10)', [ids.patient, ids.service],
    ), { code: '23514' });
    await assert.rejects(db.query(
      'insert into payment (patient_id, service_id, amount) values ($1, $2, 10)', [ids.unassigned, ids.service],
    ), { code: '23503' });
    await assert.rejects(db.query(
      'update appointment set dentist_id = $1 where id = $2', [ids.receptionist, ids.appointment],
    ), { code: '23514' });
  });
});
