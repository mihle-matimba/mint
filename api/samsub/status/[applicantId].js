import crypto from "crypto";
import axios from "axios";

const BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";
const APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const APP_SECRET = process.env.SUMSUB_SECRET_KEY || process.env.SUMSUB_APP_SECRET;

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
  res.status(statusCode).set({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  });
  res.send(JSON.stringify(payload));
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

  const sigHeaders = sign(method, pathWithQuery, data ? JSON.stringify(data) : "");

  const res = await axios.request({
    method,
    baseURL: BASE_URL,
    url: pathWithQuery,
    data,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...sigHeaders,
      ...headers,
    },
  });

  return res.data;
};

const deriveOutcome = (reviewStatus, reviewAnswer) => {
  if (reviewStatus === "completed") {
    if (reviewAnswer === "GREEN") return "completed";
    if (reviewAnswer === "RED") return "failed";
    return "pending";
  }
  if (reviewStatus === "pending" || reviewStatus === "onHold" || reviewStatus === "queued") {
    return "pending";
  }
  return "pending";
};

export default async function handler(req, res) {
  const origin = corsOrigin(req);

  if (req.method === "OPTIONS") {
    res.status(204).set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    });
    return res.end();
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { success: false, error: { message: "Method not allowed" } }, origin);
  }

  const { applicantId } = req.query || {};
  if (!applicantId) {
    return sendJson(res, 400, { success: false, error: { message: "Missing applicantId" } }, origin);
  }

  try {
    const applicant = await call("GET", `/resources/applicants/${encodeURIComponent(applicantId)}/one`);
    const reviewStatus = applicant?.review?.reviewStatus || applicant?.reviewStatus || "unknown";
    const reviewAnswer = applicant?.review?.reviewResult?.reviewAnswer || applicant?.reviewResult?.reviewAnswer || "unknown";
    const outcome = deriveOutcome(reviewStatus, reviewAnswer);

    return sendJson(
      res,
      200,
      {
        success: true,
        data: {
          applicantId,
          reviewStatus,
          reviewAnswer,
          outcome,
          raw: applicant,
        },
      },
      origin
    );
  } catch (err) {
    console.error("Error in /api/samsub/status:", err.response?.data || err.message);
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
