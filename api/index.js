import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Supabase Client
let rawUrl = process.env.SUPABASE_URL || 'pjecoywhpmbuuyrhpdwa';
if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
  rawUrl = `https://${rawUrl}.supabase.co`;
}
const supabaseUrl = rawUrl;
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_NjPUM_m8OtWhfReB001jXw_zwoBWH8s';
let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
  }
}

const router = express.Router();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Status check endpoint
router.get('/status', async (req, res) => {
  if (!supabase) {
    return res.json({ connected: false, reason: 'Supabase client not initialized' });
  }

  try {
    const { error: staffErr } = await supabase.from('staff_members').select('id').limit(1);
    const { error: attErr } = await supabase.from('attendance_records').select('id').limit(1);
    const { error: notErr } = await supabase.from('notices').select('id').limit(1);

    const tablesReady = !staffErr && !attErr && !notErr;
    const missing = [];
    if (staffErr?.code === 'PGRST205') missing.push('staff_members');
    if (attErr?.code === 'PGRST205') missing.push('attendance_records');
    if (notErr?.code === 'PGRST205') missing.push('notices');

    res.json({
      connected: true,
      tablesReady,
      missingTables: missing,
      supabaseUrl,
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// STAFF MEMBERS
router.get('/staff', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return res.status(error.code === 'PGRST205' ? 404 : 400).json({ error });
  }

  const staff = (data || []).map(m => ({
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

  res.json({ staff });
});

router.post('/staff', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const member = req.body;
  if (!member.staffId || !member.name || !member.email) {
    return res.status(400).json({ error: 'Missing required staff fields' });
  }

  const payload = {
    staff_id: member.staffId,
    name: member.name,
    email: member.email,
    department: member.department || 'General',
    designation: member.designation || '',
    phone: member.phone || '',
    qualification: member.qualification || '',
    joining_date: member.joiningDate || '',
    address: member.address || '',
    updated_at: new Date().toISOString(),
  };

  if (member.password) {
    payload.password = member.password;
  }

  const { data, error } = await supabase
    .from('staff_members')
    .upsert(payload, { onConflict: 'staff_id' })
    .select();

  if (error) {
    return res.status(400).json({ error });
  }

  res.json({ success: true, member: data?.[0] });
});

router.delete('/staff/:staffId', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { staffId } = req.params;
  const { error } = await supabase
    .from('staff_members')
    .delete()
    .eq('staff_id', staffId);

  if (error) return res.status(400).json({ error });

  await supabase.from('attendance_records').delete().eq('staff_id', staffId);
  res.json({ success: true });
});

// ATTENDANCE RECORDS
router.get('/attendance', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { data, error } = await supabase
    .from('attendance_records')
    .select('*');

  if (error) {
    return res.status(error.code === 'PGRST205' ? 404 : 400).json({ error });
  }

  const records = {};
  (data || []).forEach(r => {
    const key = `${r.staff_id}_${r.date}`;
    records[key] = {
      staffId: r.staff_id,
      date: r.date,
      status: r.status,
      markedAt: r.marked_at,
    };
  });

  res.json({ attendance: records });
});

router.post('/attendance', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { staffId, date, status } = req.body;
  if (!staffId || !date || !status) {
    return res.status(400).json({ error: 'Missing required attendance fields' });
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert({
      staff_id: staffId,
      date,
      status,
      marked_at: new Date().toISOString(),
    }, { onConflict: 'staff_id,date' })
    .select();

  if (error) return res.status(400).json({ error });

  res.json({ success: true, record: data?.[0] });
});

// NOTICES
router.get('/notices', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(error.code === 'PGRST205' ? 404 : 400).json({ error });
  }

  const notices = (data || []).map(n => ({
    id: n.id,
    title: n.title,
    date: n.date,
    description: n.description,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  res.json({ notices });
});

router.post('/notices', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { id, title, date, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Missing notice title or description' });
  }

  const payload = {
    title,
    date: date || new Date().toISOString().split('T')[0],
    description,
    updated_at: new Date().toISOString(),
  };

  let query;
  if (id) {
    query = supabase.from('notices').update(payload).eq('id', id).select();
  } else {
    payload.created_at = new Date().toISOString();
    query = supabase.from('notices').insert(payload).select();
  }

  const { data, error } = await query;
  if (error) return res.status(400).json({ error });

  res.json({ success: true, notice: data?.[0] });
});

router.delete('/notices/:id', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { id } = req.params;
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ error });
  res.json({ success: true });
});

// AUTHENTICATION
router.post('/auth/login', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { staffId, password } = req.body;
  if (!staffId || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .ilike('staff_id', staffId)
    .eq('password', password)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Invalid Staff ID or password' });
  }

  const user = {
    staffId: data.staff_id,
    name: data.name,
    email: data.email,
    department: data.department,
    designation: data.designation,
    loginTime: new Date().toISOString(),
  };

  res.json({ success: true, user });
});

router.post('/auth/register', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

  const { staffId, name, email, department, password } = req.body;
  if (!staffId || !name || !email || !password) {
    return res.status(400).json({ error: 'Missing required registration fields' });
  }

  const { data: existing } = await supabase
    .from('staff_members')
    .select('id, staff_id, email')
    .or(`staff_id.ilike.${staffId},email.ilike.${email}`);

  if (existing && existing.length > 0) {
    const isId = existing.some(e => e.staff_id.toUpperCase() === staffId.toUpperCase());
    return res.status(400).json({
      error: isId ? 'This Staff ID is already registered.' : 'This email is already registered.'
    });
  }

  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      staff_id: staffId.toUpperCase(),
      name,
      email,
      department: department || 'General',
      password,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error });

  res.json({ success: true, user: data });
});

// Mount router on both /api and root
app.use('/api', router);
app.use('/', router);

export default app;
