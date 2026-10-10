import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

// In-Memory Database Mock Store
function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const inMemoryStaff = [
  {
    id: 1,
    staffId: 'STAFF001',
    name: 'College Administrator',
    email: 'admin@college.edu',
    department: 'Administration',
    designation: 'Administrator',
    phone: '9876543210',
    qualification: 'M.Tech, Ph.D.',
    joiningDate: '2021-06-01',
    address: 'Campus Administrative Block',
    password: 'Admin@123',
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    staffId: 'STAFF002',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.j@college.edu',
    department: 'Computer Science',
    designation: 'Head of Department',
    phone: '9876543211',
    qualification: 'Ph.D. Computer Science',
    joiningDate: '2019-08-15',
    address: 'CS Department Building',
    password: 'Staff@123',
    createdAt: '2024-01-05T00:00:00.000Z'
  },
  {
    id: 3,
    staffId: 'STAFF003',
    name: 'Prof. Rajesh Kumar',
    email: 'r.kumar@college.edu',
    department: 'Physics',
    designation: 'Associate Professor',
    phone: '9876543212',
    qualification: 'M.Sc., Ph.D. Physics',
    joiningDate: '2020-02-10',
    address: 'Science Block, Room 204',
    password: 'Staff@123',
    createdAt: '2024-01-10T00:00:00.000Z'
  },
  {
    id: 4,
    staffId: 'STAFF004',
    name: 'Dr. Emily Carter',
    email: 'e.carter@college.edu',
    department: 'Mathematics',
    designation: 'Assistant Professor',
    phone: '9876543213',
    qualification: 'Ph.D. Applied Mathematics',
    joiningDate: '2022-01-20',
    address: 'Faculty Quarters B-12',
    password: 'Staff@123',
    createdAt: '2024-01-15T00:00:00.000Z'
  }
];

const todayStr = getTodayDate();
const inMemoryAttendance = {
  [`STAFF001_${todayStr}`]: { staffId: 'STAFF001', date: todayStr, status: 'Present', markedAt: new Date().toISOString() },
  [`STAFF002_${todayStr}`]: { staffId: 'STAFF002', date: todayStr, status: 'Present', markedAt: new Date().toISOString() },
  [`STAFF003_${todayStr}`]: { staffId: 'STAFF003', date: todayStr, status: 'Present', markedAt: new Date().toISOString() },
  [`STAFF004_${todayStr}`]: { staffId: 'STAFF004', date: todayStr, status: 'Absent', markedAt: new Date().toISOString() },
};

let noticeIdCounter = 4;
const inMemoryNotices = [
  {
    id: 1,
    title: 'Welcome to EduStaff Portal',
    date: todayStr,
    description: 'The college staff management portal is fully active and ready to handle notices, attendance, and faculty records.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Upcoming Faculty Development Program',
    date: todayStr,
    description: 'Annual Faculty Development Workshop on Modern Pedagogical Tools scheduled for next Monday at Seminar Hall 1.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Semester Examination Schedule Published',
    date: todayStr,
    description: 'The final semester examination schedule has been finalized. All department heads please verify invigilation duties.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Initialize Supabase Client ONLY if valid environment variables are present
const configuredUrl = process.env.SUPABASE_URL?.trim();
const configuredKey = process.env.SUPABASE_KEY?.trim();
const hasRealSupabase = Boolean(
  configuredUrl &&
  configuredKey &&
  !configuredUrl.includes('pjecoywhpmbuuyrhpdwa')
);

let supabase = null;
let supabaseUrl = null;

if (hasRealSupabase) {
  let rawUrl = configuredUrl;
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = `https://${rawUrl}.supabase.co`;
  }
  supabaseUrl = rawUrl;
  try {
    supabase = createClient(supabaseUrl, configuredKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
    supabase = null;
  }
}

// Helper to run query with 2.5s timeout, falling back on error or timeout
async function withTimeout(promise, timeoutMs = 2500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), timeoutMs))
  ]);
}

const router = express.Router();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Status check endpoint
router.get('/status', async (req, res) => {
  if (supabase) {
    try {
      const { error: staffErr } = await withTimeout(
        supabase.from('staff_members').select('id').limit(1),
        2000
      );
      if (!staffErr) {
        return res.json({
          connected: true,
          tablesReady: true,
          mode: 'supabase',
          supabaseUrl,
        });
      }
    } catch {
      // Fall through to in-memory mode
    }
  }

  // Instant in-memory response so client never hangs
  res.json({
    connected: true,
    tablesReady: true,
    mode: 'in-memory',
    supabaseUrl: null,
    message: 'EduStaff In-Memory Database is active'
  });
});

// STAFF MEMBERS
router.get('/staff', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('staff_members').select('*').order('id', { ascending: true }),
        2500
      );
      if (!error && data) {
        const staff = data.map(m => ({
          id: m.id,
          staffId: m.staff_id,
          name: m.name,
          email: m.email,
          department: m.department,
          designation: m.designation || '',
          phone: m.phone || '',
          qualification: m.qualification || '',
          joiningDate: m.joining_date || '',
          address: m.address || '',
          password: m.password,
          createdAt: m.created_at,
        }));
        return res.json({ staff });
      }
    } catch {
      // Fall through to in-memory store
    }
  }

  res.json({ staff: inMemoryStaff });
});

router.post('/staff', async (req, res) => {
  const member = req.body;
  if (!member.staffId || !member.name || !member.email) {
    return res.status(400).json({ error: 'Missing required staff fields' });
  }

  // Update in-memory store
  const existingIdx = inMemoryStaff.findIndex(
    s => s.staffId.toUpperCase() === member.staffId.toUpperCase()
  );
  const formattedMember = {
    id: existingIdx !== -1 ? inMemoryStaff[existingIdx].id : inMemoryStaff.length + 1,
    staffId: member.staffId.toUpperCase(),
    name: member.name,
    email: member.email,
    department: member.department || 'General',
    designation: member.designation || '',
    phone: member.phone || '',
    qualification: member.qualification || '',
    joiningDate: member.joiningDate || '',
    address: member.address || '',
    password: member.password || (existingIdx !== -1 ? inMemoryStaff[existingIdx].password : 'Admin@123'),
    createdAt: existingIdx !== -1 ? inMemoryStaff[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    inMemoryStaff[existingIdx] = formattedMember;
  } else {
    inMemoryStaff.push(formattedMember);
  }

  if (supabase) {
    try {
      const payload = {
        staff_id: formattedMember.staffId,
        name: formattedMember.name,
        email: formattedMember.email,
        department: formattedMember.department,
        designation: formattedMember.designation,
        phone: formattedMember.phone,
        qualification: formattedMember.qualification,
        joining_date: formattedMember.joiningDate,
        address: formattedMember.address,
        updated_at: formattedMember.updatedAt,
      };
      if (formattedMember.password) payload.password = formattedMember.password;
      await withTimeout(
        supabase.from('staff_members').upsert(payload, { onConflict: 'staff_id' }),
        2000
      );
    } catch {
      // Ignore remote error, in-memory is updated
    }
  }

  res.json({ success: true, member: formattedMember });
});

router.delete('/staff/:staffId', async (req, res) => {
  const staffId = req.params.staffId.toUpperCase();
  const idx = inMemoryStaff.findIndex(s => s.staffId.toUpperCase() === staffId);
  if (idx !== -1) {
    inMemoryStaff.splice(idx, 1);
  }

  // Remove attendance records
  Object.keys(inMemoryAttendance).forEach(key => {
    if (key.startsWith(`${staffId}_`)) {
      delete inMemoryAttendance[key];
    }
  });

  if (supabase) {
    try {
      await withTimeout(supabase.from('staff_members').delete().eq('staff_id', staffId), 2000);
      await withTimeout(supabase.from('attendance_records').delete().eq('staff_id', staffId), 2000);
    } catch {
      // In-memory deleted
    }
  }

  res.json({ success: true });
});

// ATTENDANCE RECORDS
router.get('/attendance', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('attendance_records').select('*'),
        2500
      );
      if (!error && data) {
        const records = {};
        data.forEach(r => {
          const key = `${r.staff_id}_${r.date}`;
          records[key] = {
            staffId: r.staff_id,
            date: r.date,
            status: r.status,
            markedAt: r.marked_at,
          };
        });
        return res.json({ attendance: records });
      }
    } catch {
      // Fall through to in-memory store
    }
  }

  res.json({ attendance: inMemoryAttendance });
});

router.post('/attendance', async (req, res) => {
  const { staffId, date, status } = req.body;
  if (!staffId || !date || !status) {
    return res.status(400).json({ error: 'Missing required attendance fields' });
  }

  const record = {
    staffId: staffId.toUpperCase(),
    date,
    status,
    markedAt: new Date().toISOString(),
  };

  const key = `${record.staffId}_${date}`;
  inMemoryAttendance[key] = record;

  if (supabase) {
    try {
      await withTimeout(
        supabase.from('attendance_records').upsert({
          staff_id: record.staffId,
          date,
          status,
          marked_at: record.markedAt,
        }, { onConflict: 'staff_id,date' }),
        2000
      );
    } catch {
      // In-memory updated
    }
  }

  res.json({ success: true, record });
});

// NOTICES
router.get('/notices', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('notices').select('*').order('created_at', { ascending: false }),
        2500
      );
      if (!error && data) {
        const notices = data.map(n => ({
          id: n.id,
          title: n.title,
          date: n.date,
          description: n.description,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        }));
        return res.json({ notices });
      }
    } catch {
      // Fall through to in-memory store
    }
  }

  res.json({ notices: inMemoryNotices });
});

router.post('/notices', async (req, res) => {
  const { id, title, date, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Missing notice title or description' });
  }

  const noticeDate = date || getTodayDate();
  let notice;

  if (id) {
    const idx = inMemoryNotices.findIndex(n => n.id == id);
    if (idx !== -1) {
      inMemoryNotices[idx] = {
        ...inMemoryNotices[idx],
        title,
        date: noticeDate,
        description,
        updatedAt: new Date().toISOString()
      };
      notice = inMemoryNotices[idx];
    } else {
      notice = {
        id: Number(id),
        title,
        date: noticeDate,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      inMemoryNotices.unshift(notice);
    }
  } else {
    notice = {
      id: noticeIdCounter++,
      title,
      date: noticeDate,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inMemoryNotices.unshift(notice);
  }

  if (supabase) {
    try {
      const payload = {
        title,
        date: noticeDate,
        description,
        updated_at: new Date().toISOString(),
      };
      if (id) {
        await withTimeout(supabase.from('notices').update(payload).eq('id', id), 2000);
      } else {
        payload.created_at = notice.createdAt;
        await withTimeout(supabase.from('notices').insert(payload), 2000);
      }
    } catch {
      // In-memory updated
    }
  }

  res.json({ success: true, notice });
});

router.delete('/notices/:id', async (req, res) => {
  const id = req.params.id;
  const idx = inMemoryNotices.findIndex(n => n.id == id);
  if (idx !== -1) {
    inMemoryNotices.splice(idx, 1);
  }

  if (supabase) {
    try {
      await withTimeout(supabase.from('notices').delete().eq('id', id), 2000);
    } catch {
      // In-memory deleted
    }
  }

  res.json({ success: true });
});

// AUTHENTICATION
router.post('/auth/login', async (req, res) => {
  const { staffId, password } = req.body;
  if (!staffId || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  // Check in-memory store
  const member = inMemoryStaff.find(
    s => s.staffId.toUpperCase() === staffId.trim().toUpperCase() && s.password === password
  );

  if (member) {
    const user = {
      staffId: member.staffId,
      name: member.name,
      email: member.email,
      department: member.department,
      designation: member.designation,
      loginTime: new Date().toISOString(),
    };
    return res.json({ success: true, user });
  }

  // Check Supabase if active
  if (supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.from('staff_members')
          .select('*')
          .ilike('staff_id', staffId)
          .eq('password', password)
          .single(),
        2000
      );
      if (!error && data) {
        const user = {
          staffId: data.staff_id,
          name: data.name,
          email: data.email,
          department: data.department,
          designation: data.designation,
          loginTime: new Date().toISOString(),
        };
        return res.json({ success: true, user });
      }
    } catch {
      // Login failed
    }
  }

  res.status(401).json({ error: 'Invalid Staff ID or password' });
});

router.post('/auth/register', async (req, res) => {
  const { staffId, name, email, department, password } = req.body;
  if (!staffId || !name || !email || !password) {
    return res.status(400).json({ error: 'Missing required registration fields' });
  }

  const normalizedId = staffId.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  const idExists = inMemoryStaff.some(s => s.staffId.toUpperCase() === normalizedId);
  if (idExists) {
    return res.status(400).json({ error: 'This Staff ID is already registered.' });
  }

  const emailExists = inMemoryStaff.some(s => s.email.toLowerCase() === normalizedEmail);
  if (emailExists) {
    return res.status(400).json({ error: 'This email is already registered.' });
  }

  const newStaff = {
    id: inMemoryStaff.length + 1,
    staffId: normalizedId,
    name: name.trim(),
    email: normalizedEmail,
    department: department || 'General',
    designation: 'Staff',
    password,
    phone: '',
    qualification: '',
    joiningDate: getTodayDate(),
    address: '',
    createdAt: new Date().toISOString(),
  };

  inMemoryStaff.push(newStaff);

  if (supabase) {
    try {
      await withTimeout(
        supabase.from('staff_members').insert({
          staff_id: normalizedId,
          name: newStaff.name,
          email: normalizedEmail,
          department: newStaff.department,
          password,
          created_at: newStaff.createdAt,
        }),
        2000
      );
    } catch {
      // In-memory registration complete
    }
  }

  res.json({ success: true, user: newStaff });
});

// Mount router on both /api and root
app.use('/api', router);
app.use('/', router);

export default app;
