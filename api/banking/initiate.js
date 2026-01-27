import { createClient } from '@supabase/supabase-js';
import truIDClient from '../../services/truidClient.js';

const REQUIRED_ENV = ['TRUID_API_KEY', 'TRUID_API_BASE', 'COMPANY_ID', 'BRAND_ID', 'WEBHOOK_URL', 'REDIRECT_URL'];
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function respondMissingEnv(res) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (!missing.length) return false;
  res.status(500).json({
    success: false,
    error: `Missing required environment variables: ${missing.join(', ')}`
  });
  return true;
}

function respondMissingSupabase(res) {
  if (supabase) return false;
  res.status(500).json({
    success: false,
    error: 'Missing Supabase configuration on the server',
    details: 'Set SUPABASE_URL and SUPABASE_ANON_KEY.'
  });
  return true;
}

function parseBody(req) {
  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }
  return body || {};
}

function parseServices(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (respondMissingEnv(res)) return;
  if (respondMissingSupabase(res)) return;

  const body = parseBody(req);
  const {
    idType = process.env.TEST_ID_TYPE || 'id',
    provider = process.env.TEST_PROVIDER,
    accounts,
    auto,
    rememberMe = process.env.TEST_REMEMBER_ME,
    consentId,
    services,
    correlation,
    force
  } = body || {};

  const requestedServices = parseServices(services);
  const envServices = parseServices(process.env.TRUID_SERVICES);
  const defaultServices = envServices.length
    ? envServices
    : [
        'eeh03fzauckvj8u982dbeq1d8',
        'amqfuupe00xk3cfw3dergvb9n',
        's8d7f67de8w9iekjrfu',
        'mk2weodif8gutjre4kwsdfd',
        '12wsdofikgjtm5k4eiduy',
        'apw99w0lj1nwde4sfxd0'
      ];
  const finalServices = requestedServices.length ? requestedServices : defaultServices;

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!accessToken) {
    return res.status(401).json({ success: false, error: 'Missing bearer token' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user?.id) {
    const message = userError?.message || 'Invalid or expired session';
    return res.status(401).json({ success: false, error: 'Invalid or expired session', details: message });
  }

  const profileClient = supabaseAdmin || supabase;
  let { data: profile, error: profileError } = await profileClient
    .from('profiles')
    .select('first_name,last_name,id_number,phone,email,email_address')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    console.error('[api/banking/initiate] profile lookup failed', {
      userId: userData.user.id,
      profileError: profileError?.message || null,
      supabaseAdmin: !!supabaseAdmin
    });

    if (!supabaseAdmin) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        details:
          'Profile lookup failed. Missing SUPABASE_SERVICE_ROLE_KEY or RLS policy may prevent access. Provide SUPABASE_SERVICE_ROLE_KEY on the server to allow read/create, or ensure a profile row exists.'
      });
    }

    const newProfile = {
      id: userData.user.id,
      email: userData.user.email,
      email_address: userData.user.email,
      first_name: userData.user.user_metadata?.first_name || userData.user.user_metadata?.firstName || '',
      last_name: userData.user.user_metadata?.last_name || userData.user.user_metadata?.lastName || '',
      id_number: userData.user.user_metadata?.id_number || userData.user.user_metadata?.idNumber || '',
      phone: userData.user.user_metadata?.phone || userData.user.phone || ''
    };

    const { data: createdProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert(newProfile)
      .select('first_name,last_name,id_number,phone,email,email_address')
      .single();

    if (createError || !createdProfile) {
      console.error('[api/banking/initiate] failed to create profile', { createError: createError?.message });
      return res.status(500).json({
        success: false,
        error: 'Profile not found and could not be created',
        details: createError?.message
      });
    }

    profile = createdProfile;
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  const idNumber = profile.id_number ? String(profile.id_number).trim() : '';
  const email = profile.email || profile.email_address || '';
  const mobile = profile.phone || '';

  if (!fullName || !idNumber) {
    return res.status(400).json({
      success: false,
      error: 'Profile missing required fields',
      required: ['first_name', 'last_name', 'id_number']
    });
  }

  try {
    const collection = await truIDClient.createCollection({
      name: fullName,
      idNumber,
      idType,
      email,
      mobile,
      provider,
      accounts,
      auto,
      rememberMe,
      consentId,
      services: finalServices,
      correlation,
      force
    });

    res.status(201).json({
      success: true,
      collectionId: collection.collectionId,
      consumerUrl: collection.consumerUrl,
      consentId: collection.consentId
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}