import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { initLoanStep, updateLoan } from "./loanApplication";
import employerCsvUrl from "../assets/2025-10-16 JSE Listed Companies.csv?url";

const normalizeContractTypeValue = (value) => {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const aliasMap = {
    PERMANENT: "PERMANENT",
    PERMANENT_EMPLOYEE: "PERMANENT",
    FULL_TIME: "PERMANENT",
    PROBATION: "PERMANENT_ON_PROBATION",
    PERMANENT_ON_PROBATION: "PERMANENT_ON_PROBATION",
    FIXED_TERM: "FIXED_TERM_LT_12",
    FIXED_TERM_12_PLUS: "FIXED_TERM_12_PLUS",
    FIXED_TERM_12_MONTHS: "FIXED_TERM_12_PLUS",
    FIXED_TERM_12_MONTHS_PLUS: "FIXED_TERM_12_PLUS",
    FIXED_TERM_LT_12: "FIXED_TERM_LT_12",
    FIXED_TERM_LT_12_MONTHS: "FIXED_TERM_LT_12",
    FIXED_TERM_UNDER_12: "FIXED_TERM_LT_12",
    FIXED_TERM_UNDER_12_MONTHS: "FIXED_TERM_LT_12",
    SELF_EMPLOYED: "SELF_EMPLOYED_12_PLUS",
    SELF_EMPLOYED_12_PLUS: "SELF_EMPLOYED_12_PLUS",
    SELF_EMPLOYED_12_MONTHS_PLUS: "SELF_EMPLOYED_12_PLUS",
    CONTRACTOR: "FIXED_TERM_LT_12",
    PART_TIME: "PART_TIME",
    PARTTIME: "PART_TIME",
    PART_TIME_EMPLOYEE: "PART_TIME",
    UNEMPLOYED: "UNEMPLOYED_OR_UNKNOWN",
    UNKNOWN: "UNEMPLOYED_OR_UNKNOWN",
    UNEMPLOYED_OR_UNKNOWN: "UNEMPLOYED_OR_UNKNOWN"
  };

  return aliasMap[normalized] || normalized || null;
};

const normalizeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildWarningList = (form, profile) => {
  const warnings = [];
  if (!form.identityNumber) warnings.push("Missing ID number.");
  if (!form.firstName) warnings.push("Missing first name.");
  if (!form.lastName) warnings.push("Missing surname.");
  if (!profile?.id_number) warnings.push("Profile ID number not found in Supabase.");
  return warnings;
};

export function useCreditCheck() {
  const [loanRecord, setLoanRecord] = useState(null);
  const [profile, setProfile] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [intakeError, setIntakeError] = useState("");
  const [locked, setLocked] = useState(false);
  const [engineResult, setEngineResult] = useState(null);
  const [engineStatus, setEngineStatus] = useState("Idle");
  const [mockMode, setMockMode] = useState(null);
  const [employerCsv, setEmployerCsv] = useState([]);
  const [isUpdatingLoan, setIsUpdatingLoan] = useState(false);

  const [form, setForm] = useState({
    identityNumber: "",
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    annualIncome: "",
    annualExpenses: "",
    yearsCurrentEmployer: "",
    contractType: "",
    isNewBorrower: "",
    employmentSector: "",
    employerName: ""
  });

  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const normalizedContractType = useMemo(
    () => normalizeContractTypeValue(form.contractType),
    [form.contractType]
  );

  const warnings = useMemo(() => buildWarningList(form, profile), [form, profile]);

  useEffect(() => {
    initLoanStep(2, { allowRedirect: false })
      .then((record) => setLoanRecord(record))
      .catch(() => null);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setIntakeError("");

      if (!supabase) {
        setIntakeError("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setLoadingProfile(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        setIntakeError("Please sign in to continue.");
        setLoadingProfile(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name,last_name,id_number,annual_income_min,employment_type,date_of_birth,gender,address")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        setIntakeError("Unable to load your profile details. Please refresh.");
        setLoadingProfile(false);
        return;
      }

      const { data: snapshotData } = await supabase
        .from("truid_bank_snapshots")
        .select("avg_monthly_income,avg_monthly_expenses,net_monthly_income")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      setProfile(profileData || null);
      setSnapshot(snapshotData || null);

      setForm((prev) => ({
        ...prev,
        identityNumber: profileData?.id_number || prev.identityNumber,
        firstName: profileData?.first_name || prev.firstName,
        lastName: profileData?.last_name || prev.lastName,
        gender: profileData?.gender || prev.gender,
        dateOfBirth: profileData?.date_of_birth || prev.dateOfBirth,
        address: profileData?.address || prev.address,
        annualIncome: snapshotData?.avg_monthly_income
          ? String(snapshotData.avg_monthly_income * 12)
          : (profileData?.annual_income_min ? String(profileData.annual_income_min) : prev.annualIncome),
        annualExpenses: snapshotData?.avg_monthly_expenses
          ? String(snapshotData.avg_monthly_expenses * 12)
          : prev.annualExpenses,
        contractType: normalizeContractTypeValue(profileData?.employment_type) || prev.contractType
      }));

      setLoadingProfile(false);
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetch(employerCsvUrl)
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        setEmployerCsv(lines.slice(1));
      })
      .catch(() => setEmployerCsv([]));
  }, []);

  const fetchMockMode = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/mock-mode`);
      const payload = await response.json();
      const value = payload?.mockMode ?? payload?.mock ?? null;
      setMockMode(value === null ? null : Boolean(value));
    } catch {
      setMockMode(null);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchMockMode();
  }, [fetchMockMode]);

  const lockInputs = useCallback(() => {
    if (!form.identityNumber || !form.firstName || !form.lastName) {
      setIntakeError("Please complete identity fields before locking inputs.");
      return;
    }
    setLocked(true);
    setIntakeError("");
  }, [form]);

  const editInputs = useCallback(() => {
    setLocked(false);
  }, []);

  const runEngine = useCallback(async () => {
    setEngineStatus("Running");
    setEngineResult(null);

    if (!supabase) {
      setEngineStatus("Failed");
      setIntakeError("Supabase is not configured.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const annualIncome = normalizeNumber(form.annualIncome);
    const annualExpenses = normalizeNumber(form.annualExpenses);

    const payload = {
      userData: {
        identity_number: form.identityNumber,
        surname: form.lastName,
        forename: form.firstName,
        gender: form.gender || undefined,
        date_of_birth: form.dateOfBirth || undefined,
        address1: form.address || undefined,
        annual_income: annualIncome,
        annual_expenses: annualExpenses,
        gross_monthly_income: annualIncome ? annualIncome / 12 : 0,
        net_monthly_income: annualIncome && annualExpenses ? (annualIncome - annualExpenses) / 12 : 0,
        years_in_current_job: normalizeNumber(form.yearsCurrentEmployer),
        months_in_current_job: normalizeNumber(form.yearsCurrentEmployer) * 12,
        contract_type: normalizedContractType,
        employment_sector_type: form.employmentSector,
        employment_employer_name: form.employerName,
        algolend_is_new_borrower: form.isNewBorrower === "yes"
      }
    };

    const response = await fetch(`${apiBase}/credit-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    setEngineResult(result);
    setEngineStatus(result?.success === false || result?.ok === false ? "Failed" : "Complete");
  }, [apiBase, form, normalizedContractType]);

  const proceedToStep3 = useCallback(async () => {
    if (!loanRecord?.id) return;
    setIsUpdatingLoan(true);
    await updateLoan(loanRecord.id, { step_number: 3 });
    setIsUpdatingLoan(false);
  }, [loanRecord]);

  return {
    form,
    setField,
    normalizedContractType,
    profile,
    snapshot,
    loadingProfile,
    intakeError,
    locked,
    lockInputs,
    editInputs,
    engineResult,
    engineStatus,
    runEngine,
    mockMode,
    employerCsv,
    warnings,
    proceedToStep3,
    isUpdatingLoan
  };
}
