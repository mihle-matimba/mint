import { createClient } from "@supabase/supabase-js";
import { performCreditCheck } from "../services/creditCheckService.js";
import {
  TOTAL_LOAN_ENGINE_WEIGHT,
  extractClientDeviceMetadata,
  computeCreditScoreContribution,
  computeAdverseListingsContribution,
  computeCreditUtilizationContribution,
  computeDeviceFingerprintContribution,
  computeDTIContribution,
  computeEmploymentTenureContribution,
  computeContractTypeContribution,
  computeEmploymentCategoryContribution,
  computeIncomeStabilityContribution,
  computeAlgolendRepaymentContribution,
  computeAglRetrievalContribution
} from "../services/loanEngine.js";

function normalizeDobForExperian(dob) {
  if (!dob) return dob;
  return String(dob).replace(/-/g, '');
}

function buildUserData(overrides = {}) {
  const base = {
    reference: 'algolendcheck',
    identity_number: '9912060144082',
    passport_number: '',
    surname: 'Mathe',
    forename: 'Sipho',
    middle_name: '',
    gender: 'M',
    date_of_birth: '19991206',
    address1: '123 Main St',
    address2: 'Apartment 4',
    address3: '',
    address4: 'Johannesburg',
    postal_code: '2000',
    cell_tel_no: '0712345678',
    work_tel_no: '',
    home_tel_no: '',
    email: 'sipho.mathe@example.com',
    user_id: 'U12345',
    client_ref: `ALGOLEND-${Date.now()}`
  };

  const merged = { ...base, ...(overrides || {}) };
  if (merged.date_of_birth) {
    merged.date_of_birth = normalizeDobForExperian(merged.date_of_birth);
  }

  return merged;
}

function normalizeCreditScore(result) {
  const scoreCandidate =
    result?.extracted?.extractedCreditScore ??
    result?.creditScore ??
    result?.creditScoreData?.creditScore ??
    result?.creditScore?.score ??
    result?.creditScoreData?.score;

  const score = Number(scoreCandidate);
  return Number.isFinite(score) ? score : 0;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
// UI pages in /public currently call this endpoint without an Authorization header.
// Default: allow unauth unless explicitly disabled.
const ALLOW_UNAUTH = process.env.ALLOW_UNAUTH !== 'false';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  let userId = null;
  if (accessToken) {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured on server' });
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (!userError && userData?.user?.id) {
      userId = userData.user.id;
    } else if (!ALLOW_UNAUTH) {
      return res.status(401).json({ error: 'Invalid or expired session', details: userError?.message });
    }
  } else if (!ALLOW_UNAUTH) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  if (!userId) userId = 'anon-dev';

  const applicationId = body.applicationId || `app_${Date.now()}`;
  const overrides = body.userData || body;
  const normalizedOverrides = {
    ...overrides,
    identity_number: overrides?.identity_number || overrides?.id_number || overrides?.identityNumber,
    surname: overrides?.surname || overrides?.last_name || overrides?.lastName,
    forename: overrides?.forename || overrides?.first_name || overrides?.firstName,
    date_of_birth: overrides?.date_of_birth || overrides?.dateOfBirth,
    address1: overrides?.address1 || overrides?.address,
    contract_type: overrides?.contract_type || overrides?.contractType
  };

  if (normalizedOverrides?.annual_income && !normalizedOverrides?.gross_monthly_income) {
    const annualIncome = Number(normalizedOverrides.annual_income);
    if (Number.isFinite(annualIncome)) {
      normalizedOverrides.gross_monthly_income = annualIncome / 12;
    }
  }

  if (normalizedOverrides?.years_in_current_job && !normalizedOverrides?.months_in_current_job) {
    const yearsValue = Number(normalizedOverrides.years_in_current_job);
    if (Number.isFinite(yearsValue)) {
      normalizedOverrides.months_in_current_job = yearsValue * 12;
    }
  }

  const userPayload = buildUserData(normalizedOverrides);
  userPayload.user_id = overrides?.user_id || userId;

  if (!userPayload.identity_number || !userPayload.surname || !userPayload.forename) {
    return res.status(400).json({ error: 'Missing required identity fields', required: ['identity_number', 'surname', 'forename'] });
  }

  try {
    const result = await performCreditCheck(userPayload, applicationId, accessToken);

    const creditScoreData = (result && typeof result.creditScore === 'object' && result.creditScore)
      ? result.creditScore
      : (result?.creditScoreData || result?.extracted?.creditScoreData || {});

    const creditScoreValue = normalizeCreditScore({
      ...result,
      creditScoreData,
      creditScore: creditScoreData
    });

    const accountExposure = creditScoreData?.accounts?.exposure || {};
    const accountSummary = creditScoreData?.accountSummary || {};
    const accountMetrics = {
      ...accountExposure,
      ...accountSummary,
      totalMonthlyInstallment: accountExposure.totalMonthlyInstallments ?? accountSummary.totalMonthlyInstallments ?? 0
    };

    const employmentHistory = creditScoreData?.employmentHistory || result?.employmentHistory || [];

    const deviceFingerprint = extractClientDeviceMetadata(req);

    const creditScoreBreakdown = computeCreditScoreContribution(creditScoreValue);
    const adverseListingsBreakdown = computeAdverseListingsContribution(creditScoreData);
    const creditUtilizationBreakdown = computeCreditUtilizationContribution(accountMetrics);
    const deviceFingerprintBreakdown = computeDeviceFingerprintContribution(deviceFingerprint);

    const totalMonthlyDebt = accountMetrics.totalMonthlyInstallment || 0;
    const grossMonthlyIncome = Number(userPayload.gross_monthly_income || 0);
    const dtiBreakdown = computeDTIContribution(totalMonthlyDebt, grossMonthlyIncome);

    const employmentTenureBreakdown = computeEmploymentTenureContribution(userPayload.months_in_current_job);
    const contractTypeBreakdown = computeContractTypeContribution(userPayload.contract_type);
    const employmentCategoryBreakdown = computeEmploymentCategoryContribution(userPayload);
    const incomeStabilityBreakdown = computeIncomeStabilityContribution(userPayload);
    const algolendRepaymentBreakdown = computeAlgolendRepaymentContribution(userPayload.algolend_is_new_borrower);
    const aglRetrievalBreakdown = computeAglRetrievalContribution();

    // Match the naming expected by public/money/personal/credit-check.js
    const breakdown = {
      creditScore: creditScoreBreakdown,
      creditUtilization: creditUtilizationBreakdown,
      adverseListings: adverseListingsBreakdown,
      deviceFingerprint: deviceFingerprintBreakdown,
      dti: dtiBreakdown,
      employmentTenure: employmentTenureBreakdown,
      contractType: contractTypeBreakdown,
      employmentCategory: employmentCategoryBreakdown,
      incomeStability: incomeStabilityBreakdown,
      algolendRepayment: algolendRepaymentBreakdown,
      aglRetrieval: aglRetrievalBreakdown
    };

    const loanEngineScore = Object.values(breakdown)
      .map(item => item?.contributionPercent)
      .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    const loanEngineScoreMax = TOTAL_LOAN_ENGINE_WEIGHT;
    const loanEngineScoreNormalized = loanEngineScoreMax > 0
      ? Math.min(100, (loanEngineScore / loanEngineScoreMax) * 100)
      : 0;

    const creditExposure = {
      totalBalance: accountMetrics.totalBalance || 0,
      totalLimits: accountMetrics.totalLimits || 0,
      revolvingBalance: accountMetrics.revolvingBalance || 0,
      revolvingLimits: accountMetrics.revolvingLimits || 0,
      totalMonthlyInstallment: accountMetrics.totalMonthlyInstallment || 0
    };

    const scoreReasons = [];
    if (creditScoreValue < 580) scoreReasons.push('Low credit score');
    if (creditUtilizationBreakdown.ratioPercent !== null && creditUtilizationBreakdown.ratioPercent > 75) {
      scoreReasons.push('High credit utilization');
    }
    if ((adverseListingsBreakdown.totalAdverse || 0) > 0) scoreReasons.push('Adverse listings present');
    if (dtiBreakdown.dtiPercent !== null && dtiBreakdown.dtiPercent > 50) scoreReasons.push('High debt-to-income ratio');
    if ((employmentTenureBreakdown.monthsInCurrentJob || 0) < 6) scoreReasons.push('Short employment tenure');

    const success = result?.success === true;
    const ok = success;

    return res.status(200).json({
      success,
      ok,
      applicationId,
      userId,
      creditScore: creditScoreValue,
      recommendation: result?.recommendation,
      riskFlags: result?.riskFlags,
      breakdown,
      loanEngineScore,
      loanEngineScoreMax,
      loanEngineScoreNormalized,
      creditExposure,
      scoreReasons,
      employmentHistory,
      cpaAccounts: result?.cpaAccounts || [],
      deviceFingerprint,
      raw: result
    });
  } catch (error) {
    console.error('Credit check API error:', error);
    return res.status(500).json({ error: error.message || 'Credit check failed' });
  }
};
