const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const {
  createApplicant,
  generateWebSDKLink,
} = require("./samsubServices");

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const htmlPath = path.join(publicDir, "samsub.html");

function getAllowedOrigin(req) {
  const requestOrigin = req.headers.origin;
  const configured = (process.env.CORS_ORIGIN || "*").trim();

  if (!requestOrigin) return "*";
  if (configured === "*") return requestOrigin;

  const allowList = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowList.includes(requestOrigin) ? requestOrigin : allowList[0] || "*";
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": payload.__origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    const origin = getAllowedOrigin(req);
    res.writeHead(204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      Vary: "Origin",
    });
    return res.end();
  }

  if (req.url === "/" || req.url === "/samsub") {
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Server error: samsub.html not found.");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
    return;
  }

  if (req.url === "/api/samsub/init-websdk") {
    if (req.method !== "POST") {
      return sendJson(res, 405, { success: false, error: { message: "Method not allowed" } });
    }

    try {
      const body = await readJsonBody(req);
      const levelName = body.levelName || process.env.SUMSUB_DEFAULT_LEVEL || "idv-and-phone-verification";
      const ttlInSecs = Number(body.ttlInSecs) || Number(process.env.SUMSUB_DEFAULT_TTL) || 600;
      const externalUserId = (body.externalUserId || `mint-${crypto.randomUUID()}`)
        .toString()
        .trim();

      const applicant = await createApplicant({
        externalUserId,
        levelName,
        email: body.email,
        phone: body.phone,
        firstName: body.firstName,
        lastName: body.lastName,
      });

      const applicantId = applicant?.id || applicant?.applicantId || applicant?.applicant?.id;
      const websdk = await generateWebSDKLink({
        applicantId,
        externalUserId,
        levelName,
        ttlInSecs,
      });

      return sendJson(res, 200, {
        success: true,
        __origin: getAllowedOrigin(req),
        data: {
          externalUserId,
          applicantId,
          websdkUrl: websdk?.url || websdk?.link || websdk?.href || websdk,
        },
      });
    } catch (err) {
      console.error("Error in /api/samsub/init-websdk:", err.response?.data || err.message);
      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Headers:", err.response.headers);
      }
      return sendJson(res, 500, {
        success: false,
        __origin: getAllowedOrigin(req),
        error: {
          message: err.response?.data?.description || err.message,
          details: err.response?.data,
        },
      });
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
