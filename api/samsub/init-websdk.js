import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const APP_SECRET = process.env.SUMSUB_SECRET_KEY || process.env.SUMSUB_APP_SECRET;
const DEFAULT_LEVEL = process.env.SUMSUB_DEFAULT_LEVEL || "idv-and-phone-verification";
const DEFAULT_TTL = Number(process.env.SUMSUB_DEFAULT_TTL || 600);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const getSupabaseClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    new URL(SUPABASE_URL);
  } catch {
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
};

const isUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const corsOrigin = (req) => {
  const requestOrigin = req.headers.origin;
  const configured = (process.env.CORS_ORIGIN || "*").trim();

  if (!requestOrigin) return "*";
  if (configured === "*") return requestOrigin;

  const allowList = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowList.includes(requestOrigin) ? requestOrigin : allowList[0] || "*";
};

const sendJson = (res, statusCode, payload, origin) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
  res.end(JSON.stringify(payload));
};

const sign = (method, pathWithQuery, body = "") => {
  if (!APP_TOKEN || !APP_SECRET) {
    const err = new Error("Missing Sumsub app token/secret");
    err.code = "SAMSUB_CONFIG_MISSING";
    throw err;
  }
  const ts = Math.floor(Date.now() / 1000).toString();
  const payload = ts + method.toUpperCase() + pathWithQuery + body;
  const sig = crypto
    .createHmac("sha256", APP_SECRET)
    .update(Buffer.from(payload))
    .digest("hex");

  return {
    "X-App-Token": APP_TOKEN,
    "X-App-Access-Ts": ts,
    "X-App-Access-Sig": sig,
  };
};

const call = async (method, path, { query = {}, data, headers = {} } = {}) => {
  const usp = new URLSearchParams(query);
  const pathWithQuery = usp.toString() ? `${path}?${usp.toString()}` : path;

  let bodyToSend = undefined;
  let extraHeaders = {};

  if (data instanceof FormData) {
    bodyToSend = data;
    extraHeaders = data.getHeaders();
  } else if (data !== undefined) {
    bodyToSend = typeof data === "string" ? data : JSON.stringify(data);
    extraHeaders["Content-Type"] = "application/json";
  }

  const sigHeaders = sign(method, pathWithQuery, typeof bodyToSend === "string" ? bodyToSend : "");

  const res = await axios.request({
    method,
    baseURL: BASE_URL,
    url: pathWithQuery,
    data: bodyToSend,
    headers: {
      Accept: "application/json",
      ...extraHeaders,
      ...sigHeaders,
      ...headers,
    },
    transformRequest: (b) => b,
  });

  return res.data;
};

const createApplicant = async ({ externalUserId, levelName = DEFAULT_LEVEL, email, firstName, lastName, phone }) => {
  const path = "/resources/applicants";
  const query = { levelName };
  const data = {
    externalUserId,
    email,
    phone,
    fixedInfo: { firstName, lastName },
  };
  return call("POST", path, { query, data });
};

const generateWebSDKLink = async ({ applicantId, externalUserId, levelName = DEFAULT_LEVEL, ttlInSecs = DEFAULT_TTL, lang = "en" }) => {
  const path = `/resources/sdkIntegrations/levels/${encodeURIComponent(levelName)}/websdkLink`;
  const query = {
    ttlInSecs,
    lang,
    ...(applicantId ? { userId: applicantId } : {}),
    ...(externalUserId ? { externalUserId } : {}),
  };
  return call("POST", path, { query });
};

const normalizeBody = (body) => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
};

export default async function handler(req, res) {
  const origin = corsOrigin(req);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin");
    return res.end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { success: false, error: { message: "Method not allowed" } }, origin);
  }

  try {
    const body = normalizeBody(req.body);
    const levelName = body.levelName || DEFAULT_LEVEL;
    const ttlInSecs = Number(body.ttlInSecs) || DEFAULT_TTL;
    const bodyUserId = body.userId?.toString().trim();
    let externalUserId = (body.externalUserId || bodyUserId || `mint-${crypto.randomUUID()}`)
      .toString()
      .trim();

    let applicantId = null;
    const supabase = getSupabaseClient();

    if (supabase && isUuid(bodyUserId)) {
      const { data: existing } = await supabase
        .from("user_onboarding")
        .select("sumsub_external_user_id, sumsub_applicant_id")
        .eq("user_id", bodyUserId)
        .maybeSingle();

      if (existing?.sumsub_external_user_id) {
        externalUserId = existing.sumsub_external_user_id;
      }

      if (existing?.sumsub_applicant_id) {
        applicantId = existing.sumsub_applicant_id;
      }
    }

    if (!applicantId) {
      const applicant = await createApplicant({
        externalUserId,
        levelName,
        email: body.email,
        phone: body.phone,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      applicantId = applicant?.id || applicant?.applicantId || applicant?.applicant?.id;
    }

    const websdk = await generateWebSDKLink({
      applicantId,
      externalUserId,
      levelName,
      ttlInSecs,
    });

    const websdkUrl = websdk?.url || websdk?.link || websdk?.href || websdk;

    if (supabase && applicantId && websdkUrl && isUuid(bodyUserId)) {
      await supabase
        .from("user_onboarding")
        .upsert({
          user_id: bodyUserId,
          sumsub_external_user_id: externalUserId,
          sumsub_applicant_id: applicantId,
          sumsub_websdk_url: websdkUrl,
          kyc_status: "pending",
          kyc_checked_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }

    return sendJson(
      res,
      200,
      {
        success: true,
        data: {
          externalUserId,
          applicantId,
          websdkUrl,
        },
      },
      origin
    );
  } catch (err) {
    console.error("Error in /api/samsub/init-websdk:", err.response?.data || err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Headers:", err.response.headers);
    }

    return sendJson(
      res,
      500,
      {
        success: false,
        error: {
          message: err.response?.data?.description || err.message,
          details: err.response?.data,
        },
      },
      origin
    );
  }
}
