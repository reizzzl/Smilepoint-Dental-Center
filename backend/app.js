
const express = require('express');
const cors = require('cors');

const {
  HttpError,
  uuid,
  text,
  optional,
  choice,
  bool,
  money,
  date,
  timestamp,
  email,
  listOf,
  teeth,
  readBody,
  readId,
  readInteger,
} = require('./validation');

// ==========================================
// ROLES AND VALIDATION
// ==========================================

const allStaff = ['admin', 'dentist', 'receptionist'];
const frontDesk = ['admin', 'receptionist'];
const clinical = ['admin', 'dentist'];
const admin = ['admin'];
const dentist = ['dentist'];

const name = text(160);
const notes = optional(text(4000));
const staffRole = choice(...allStaff);

const staffColumns =
  'id:staff_id,full_name,role,active:is_active,created_at';

// ==========================================
// API RESOURCES
// ==========================================

const resources = [
  // PATIENT MANAGEMENT

  {
    path: 'patients',
    table: 'patient',
    primaryKey: 'patient_id',
    read: allStaff,
    write: ['receptionist'],

    fields: {
      first_name: name,
      last_name: name,
      middle_name: optional(text(160)),
      sex: optional(text(40)),
      date_of_birth: optional(date),
      phone_number: optional(text(50)),
      email: optional(email),
      address: optional(text(500)),
      emergency_contact_name: optional(text(160)),
      emergency_contact_phone: optional(text(50)),
    },

    required: [
      'first_name',
      'last_name',
    ],
  },

  // APPOINTMENT MANAGEMENT

  {
    path: 'appointments',
    table: 'appointment',
    read: allStaff,
    write: frontDesk,

    fields: {
      patient_id: uuid,
      service_id: uuid,
      dentist_id: optional(uuid),
      scheduled_at: timestamp,

      status: choice(
        'Scheduled',
        'Completed',
        'Cancelled'
      ),

      notes,
    },

    required: [
      'patient_id',
      'service_id',
      'scheduled_at',
    ],
  },

  // DENTAL SERVICES

  {
    path: 'services',
    table: 'dental_service',
    read: allStaff,
    write: admin,

    fields: {
      name,
      description: notes,
      price: money(0),
      active: bool,
    },

    required: [
      'name',
      'price',
    ],
  },

  // TREATMENT RECORDS

  {
    path: 'treatments',
    table: 'treatment_record',
    read: clinical,
    write: dentist,

    fields: {
      patient_id: uuid,
      treatment: name,
      treatment_date: date,
      diagnosis: notes,
      remarks: notes,
      fee: money(0),
    },

    required: [
      'patient_id',
      'treatment',
    ],
  },

  // BILLING AND PAYMENTS

  {
    path: 'payments',
    table: 'payment',
    read: frontDesk,
    write: frontDesk,

    fields: {
      patient_id: uuid,
      service_id: uuid,
      amount: money(0.01),
      status: choice('Pending', 'Paid'),
      billing_date: date,
    },

    required: [
      'patient_id',
      'service_id',
      'amount',
    ],
  },

  // STAFF MANAGEMENT

  {
    path: 'staff',
    table: 'staff_profile',
    read: admin,
    write: admin,

    fields: {
      full_name: name,
      role: staffRole,
      active: bool,
    },

    required: [
      'id',
      'full_name',
      'role',
    ],

    createFields: {
      id: uuid,
    },
  },
];

// ==========================================
// CLINICAL RECORDS
// ==========================================

const medicalList = listOf(text(160));

const clinicalRecords = [
  // MEDICAL HISTORY

  {
    path: 'medical-history',
    table: 'medical_history',

    fields: {
      existingConditions: [
        'existing_conditions',
        medicalList,
        [],
      ],

      allergies: [
        'allergies',
        medicalList,
        [],
      ],

      currentMedications: [
        'current_medications',
        medicalList,
        [],
      ],

      previousDentalHistory: [
        'previous_dental_history',
        notes,
        null,
      ],

      clinicalNotes: [
        'clinical_notes',
        notes,
        null,
      ],
    },
  },

  // DENTAL CHART

  {
    path: 'dental-chart',
    table: 'dental_chart',

    fields: {
      teeth: [
        'teeth',
        teeth,
        [],
      ],

      historySummary: [
        'history_summary',
        notes,
        null,
      ],
    },
  },
];

// ==========================================
// ROLE-BASED ACCESS CONTROL
// ==========================================

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.staff.role)) {
      throw new HttpError(
        403,
        'Insufficient permissions'
      );
    }

    next();
  };
}

// ==========================================
// DATABASE ERROR HANDLING
// ==========================================

function databaseData({ data, error, status }) {
  if (!error) {
    return data;
  }

  switch (error.code) {
    case '23505':
      throw new HttpError(
        409,
        'A record with these unique values already exists'
      );

    case '23503':
      throw new HttpError(
        409,
        'A referenced record does not exist'
      );

    case '23502':
    case '23514':
    case '22001':
    case '22003':
    case '22007':
    case '22008':
    case '22P02':
      throw new HttpError(
        400,
        'The submitted values violate a database constraint'
      );

    case '42501':
      throw new HttpError(
        403,
        'Insufficient permissions'
      );

    default:
      if (status === 401) {
        throw new HttpError(
          401,
          'Invalid or expired access token'
        );
      }

      console.error(
        'Database request failed:',
        error.code
      );

      throw new HttpError(
        502,
        'Database request failed'
      );
  }
}

// ==========================================
// CHECK IF RECORD EXISTS
// ==========================================

function requireRecord(row) {
  if (row === null) {
    throw new HttpError(
      404,
      'Record not found'
    );
  }

  return row;
}

// ==========================================
// REGISTER RESOURCE ROUTES
// ==========================================

function registerResource(api, resource) {
  const {
    path,
    table,
    read,
    write,
    fields,
    required,
    createFields,
    primaryKey = 'id',
  } = resource;

  const collection = `/${path}`;
  const member = `${collection}/:id`;

  const columns = [
    primaryKey === 'id'
      ? 'id'
      : `id:${primaryKey}`,

    ...Object.keys(fields),
    'created_at',
  ].join(',');

  // ========================================
  // GET ALL RECORDS
  // ========================================

  api.get(
    collection,
    requireRole(read),

    async (req, res) => {
      const limit = readInteger(
        req.query.limit,
        'limit',
        25,
        1,
        100
      );

      const offset = readInteger(
        req.query.offset,
        'offset',
        0,
        0,
        1_000_000
      );

      let query = req.db
        .from(table)
        .select(columns)
        .order('created_at', {
          ascending: false,
        })
        .order(primaryKey)
        .range(
          offset,
          offset + limit - 1
        );

      // Optional patient ID filter

      if (req.query.patient_id !== undefined) {
        if (!Object.hasOwn(fields, 'patient_id')) {
          throw new HttpError(
            400,
            'Unsupported patient_id filter'
          );
        }

        query = query.eq(
          'patient_id',
          readId(
            req.query.patient_id,
            'patient_id'
          )
        );
      }

      const data = databaseData(
        await query
      );

      res.json({
        data,
        limit,
        offset,
      });
    }
  );

  // ========================================
  // GET SINGLE RECORD
  // ========================================

  api.get(
    member,
    requireRole(read),

    async (req, res) => {
      const id = readId(req.params.id);

      const row = databaseData(
        await req.db
          .from(table)
          .select(columns)
          .eq(primaryKey, id)
          .maybeSingle()
      );

      res.json({
        data: requireRecord(row),
      });
    }
  );

  // ========================================
  // CREATE RECORD
  // ========================================

  api.post(
    collection,
    requireRole(write),

    async (req, res) => {
      const values = readBody(
        req.body,
        {
          ...fields,
          ...createFields,
        },
        required
      );

      // Automatically record the staff member
      // who registered the patient.

      const insertValues =
        table === 'patient'
          ? {
              ...values,
              created_by: req.staff.id,
            }
          : values;

      const row = databaseData(
        await req.db
          .from(table)
          .insert(insertValues)
          .select(columns)
          .single()
      );

      res
        .location(
          `/api${collection}/${row.id}`
        )
        .status(201)
        .json({
          data: row,
        });
    }
  );

  // ========================================
  // UPDATE RECORD
  // ========================================

  api.patch(
    member,
    requireRole(write),

    async (req, res) => {
      const id = readId(req.params.id);

      // Prevent administrators from modifying
      // their own staff profile.

      if (
        table === 'staff_profile' &&
        id.toLowerCase() ===
          req.staff.id.toLowerCase()
      ) {
        throw new HttpError(
          403,
          'Administrators cannot edit their own staff profile'
        );
      }

      const values = readBody(
        req.body,
        fields
      );

      const row = databaseData(
        await req.db
          .from(table)
          .update(values)
          .eq(primaryKey, id)
          .select(columns)
          .maybeSingle()
      );

      res.json({
        data: requireRecord(row),
      });
    }
  );
}

// ==========================================
// REGISTER CLINICAL RECORD ROUTES
// ==========================================

function registerClinicalRecord(
  api,
  { path, table, fields }
) {
  const endpoint =
    `/patients/:patientId/${path}`;

  const columns = [
    'patient_id',

    ...Object.values(fields).map(
      ([column]) => column
    ),
  ].join(',');

  const validators = Object.fromEntries(
    Object.entries(fields).map(
      ([key, [, check]]) => [
        key,
        check,
      ]
    )
  );

  function format(row) {
    return {
      patientId: row.patient_id,

      ...Object.fromEntries(
        Object.entries(fields).map(
          ([key, [column]]) => [
            key,
            row[column],
          ]
        )
      ),
    };
  }

  // ========================================
  // GET CLINICAL RECORD
  // ========================================

  api.get(
    endpoint,
    requireRole(clinical),

    async (req, res) => {
      const id = readId(
        req.params.patientId,
        'patientId'
      );

      const row = databaseData(
        await req.db
          .from(table)
          .select(columns)
          .eq('patient_id', id)
          .maybeSingle()
      );

      res.json({
        data: format(
          requireRecord(row)
        ),
      });
    }
  );

  // ========================================
  // CREATE OR UPDATE CLINICAL RECORD
  // ========================================

  api.put(
    endpoint,
    requireRole(dentist),

    async (req, res) => {
      const id = readId(
        req.params.patientId,
        'patientId'
      );

      const input = readBody(
        req.body,
        validators,
        [],
        true
      );

      const values = Object.fromEntries(
        Object.entries(fields).map(
          ([key, [column, , fallback]]) => [
            column,

            Object.hasOwn(input, key)
              ? input[key]
              : fallback,
          ]
        )
      );

      const row = databaseData(
        await req.db
          .from(table)
          .upsert(
            {
              patient_id: id,
              ...values,
            },
            {
              onConflict: 'patient_id',
            }
          )
          .select(columns)
          .single()
      );

      res.json({
        data: format(row),
      });
    }
  );
}

// ==========================================
// CREATE EXPRESS APPLICATION
// ==========================================

function createApp({
  database,
  origins = [],
}) {
  const app = express();

  app.disable('x-powered-by');

  // ========================================
  // CORS CONFIGURATION
  // ========================================

  app.use(
    cors({
      origin: origins,

      methods: [
        'GET',
        'POST',
        'PATCH',
        'PUT',
        'OPTIONS',
      ],
    })
  );

  // ========================================
  // PUBLIC ROUTES
  // ========================================

  app.get('/', (req, res) => {
    res.json({
      message:
        'Smilepoint Dental Center Backend is running',

      status: 'success',
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      system: 'Smilepoint Dental Center',
    });
  });

  const api = express.Router();

  // ========================================
  // AUTHENTICATION MIDDLEWARE
  // ========================================

  api.use(async (req, res, next) => {
    res.set(
      'Cache-Control',
      'no-store'
    );

    // Retrieve bearer token

    const token = req
      .get('authorization')
      ?.match(
        /^Bearer ([^\s,]+)$/i
      )?.[1];

    if (!token) {
      throw new HttpError(
        401,
        'A bearer access token is required'
      );
    }

    // Verify Supabase authentication

    const { data, error } =
      await database.getUser(token);

    if (error) {
      if (
        [400, 401, 403, 422].includes(
          error.status
        )
      ) {
        throw new HttpError(
          401,
          'Invalid or expired access token'
        );
      }

      throw new HttpError(
        502,
        'Authentication service request failed'
      );
    }

    if (!data?.user) {
      throw new HttpError(
        401,
        'Invalid or expired access token'
      );
    }

    // Use authenticated Supabase client

    req.db = database.forUser(token);

    // Retrieve staff account from the
    // actual Supabase staff_account table.

    req.staff = databaseData(
      await req.db
        .from('staff_account')
        .select(staffColumns)
        .eq('staff_id', data.user.id)
        .maybeSingle()
    );

    // Check if the account is active

    if (!req.staff?.active) {
      throw new HttpError(
        403,
        'Active clinic staff access required'
      );
    }

    // Check if the role is supported

    if (!allStaff.includes(req.staff.role)) {
      throw new HttpError(
        403,
        'Invalid staff role'
      );
    }

    next();
  });

  // ========================================
  // JSON REQUEST CONFIGURATION
  // ========================================

  api.use(
    express.json({
      limit: '64kb',
    })
  );

  // ========================================
  // AUTHENTICATED USER INFORMATION
  // ========================================

  api.get('/auth/me', (req, res) => {
    res.json({
      data: req.staff,
    });
  });

  // ========================================
  // ADMIN DASHBOARD
  // ========================================

  api.get(
    '/dashboard/summary',
    requireRole(admin),

    async (req, res) => {
      res.json({
        data: databaseData(
          await req.db.rpc(
            'clinic_summary'
          )
        ),
      });
    }
  );

  // ========================================
  // REGISTER ALL RESOURCE MODULES
  // ========================================

  for (const resource of resources) {
    registerResource(
      api,
      resource
    );
  }

  // ========================================
  // REGISTER CLINICAL MODULES
  // ========================================

  for (const record of clinicalRecords) {
    registerClinicalRecord(
      api,
      record
    );
  }

  // ========================================
  // REGISTER API ROUTER
  // ========================================

  app.use('/api', api);

  // ========================================
  // ROUTE NOT FOUND
  // ========================================

  app.use((req, res) => {
    res.status(404).json({
      error: 'Route not found',
    });
  });

  // ========================================
  // GLOBAL ERROR HANDLER
  // ========================================

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    // Custom HTTP errors

    if (error instanceof HttpError) {
      return res
        .status(error.status)
        .json({
          error: error.message,
        });
    }

    // Invalid JSON

    if (
      error.type ===
      'entity.parse.failed'
    ) {
      return res.status(400).json({
        error: 'Invalid JSON body',
      });
    }

    // Request body too large

    if (
      error.type ===
      'entity.too.large'
    ) {
      return res.status(413).json({
        error: 'JSON body is too large',
      });
    }

    // Invalid URL

    if (error instanceof URIError) {
      return res.status(400).json({
        error: 'Invalid request URL',
      });
    }

    // Unsupported encoding

    if (error.status === 415) {
      return res.status(415).json({
        error:
          'Unsupported request body encoding',
      });
    }

    // Unexpected server errors

    console.error(
      'Unhandled Smilepoint API error',
      error.name
    );

    res.status(500).json({
      error: 'Internal server error',
    });
  });

  return app;
}

// ==========================================
// EXPORT APPLICATION
// ==========================================

module.exports = {
  createApp,
};
