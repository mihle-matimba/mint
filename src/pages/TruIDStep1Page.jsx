import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import "../styles/truid-step1.css";

const COLLECTION_STORAGE_KEY = "truid_collection_id";

const TruIDStep1Page = ({ onBack }) => {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Start TruID Session");
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("Fetching data…");
  const [jsonStatus, setJsonStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [progressStep, setProgressStep] = useState(1);

  const collectionIdRef = useRef(null);
  const pollingRef = useRef(null);

  const stepLineStyle = useMemo(
    () => ({ "--active-segments": Math.max(0, progressStep - 1) }),
    [progressStep]
  );

  const updateProgress = useCallback((step) => {
    const clamped = Math.max(1, Math.min(step, 4));
    setProgressStep(clamped);
  }, []);

  const setLoaderStatus = useCallback(({ fetch, json, save }) => {
    if (typeof fetch === "string") setFetchStatus(fetch);
    if (typeof json === "string") setJsonStatus(json);
    if (typeof save === "string") setSaveStatus(save);
  }, []);

  const showStatus = useCallback((message, type) => {
    setStatusMessage(message);
    setStatusType(type || "");
  }, []);

  const resetButton = useCallback(() => {
    setButtonDisabled(false);
    setButtonLabel("Start TruID Session");
  }, []);

  const formatStatus = useCallback((status) => {
    if (!status) return "pending";
    return String(status).replace("COLLECT_", "").replace(/_/g, " ").toLowerCase();
  }, []);

  const getSession = useCallback(async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  }, []);

  const storeCollectionId = useCallback((collectionId) => {
    if (!collectionId) return;
    try {
      localStorage.setItem(COLLECTION_STORAGE_KEY, collectionId);
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadStoredCollectionId = useCallback(() => {
    try {
      return localStorage.getItem(COLLECTION_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  const uploadCapture = useCallback(async (collectionId) => {
    const session = await getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error("Please sign in to save to the database");
    }

    const response = await fetch("/api/banking/capture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ collectionId })
    });

    const rawText = await response.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Capture failed (${response.status})`);
    }

    return data;
  }, [getSession]);

  const fetchBankingData = useCallback(async (collectionId) => {
    try {
      setShowResults(true);
      setLoaderStatus({ fetch: "Fetching data…", json: "", save: "" });

      const response = await fetch(
        `/api/banking/all?collectionId=${encodeURIComponent(collectionId)}`
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Summary request failed (${response.status})`);
      }

      const resultWrapper = await response.json();

      if (resultWrapper.success && resultWrapper.data) {
        setLoaderStatus({ fetch: "Fetching data…", json: "JSON fetched", save: "" });
        showStatus("Uploading to database…");

        try {
          await uploadCapture(collectionId);
          setLoaderStatus({
            fetch: "Fetching data…",
            json: "JSON fetched",
            save: "Saved to database"
          });
          showStatus("Saved to database.", "success");
          updateProgress(2);
        } catch (error) {
          showStatus(`Database upload failed: ${error.message || "Unknown error"}`, "error");
        }
      } else {
        throw new Error(resultWrapper.error || "No data returned");
      }
    } catch (error) {
      showStatus(`Unable to download collection data: ${error.message}`, "error");
    }
  }, [setLoaderStatus, showStatus, updateProgress, uploadCapture]);

  const startStatusPolling = useCallback(
    (collectionId) => {
      showStatus("Status: pending");
      updateProgress(1);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }

      pollingRef.current = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/banking/status?collectionId=${encodeURIComponent(collectionId)}`
          );
          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Status request failed (${response.status})`);
          }
          const data = await response.json();

          const statusValue = data.currentStatus;
          const normalized = String(statusValue || "").toUpperCase();
          const isSuccess =
            statusValue === "COLLECT_SUCCESS" ||
            Number(statusValue) === 2000 ||
            normalized.includes("COLLECT_SUCCESS") ||
            normalized.includes("SUCCESS") ||
            normalized.includes("COMPLETED") ||
            normalized.includes("COMPLETE");

          if (isSuccess) {
            clearInterval(pollingRef.current);
            showStatus("Fetching data…");
            updateProgress(1);
            await fetchBankingData(collectionId);
            resetButton();
          } else if (
            String(data.currentStatus || "").includes("FAILED") ||
            String(data.currentStatus || "").includes("CANCELLED") ||
            String(data.currentStatus || "").includes("TIMED_OUT")
          ) {
            clearInterval(pollingRef.current);
            showStatus(`Connection ${formatStatus(data.currentStatus)}`, "error");
            resetButton();
            updateProgress(2);
          } else {
            const displayStatus = statusValue ?? "pending";
            showStatus(`Status: ${displayStatus}`);
          }
        } catch (error) {
          console.error(error);
        }
      }, 3000);
    },
    [fetchBankingData, formatStatus, resetButton, showStatus, updateProgress]
  );

  const restoreLastCollection = useCallback(
    async (collectionId) => {
      showStatus("Status: pending");
      try {
        const response = await fetch(
          `/api/banking/status?collectionId=${encodeURIComponent(collectionId)}`
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Status request failed (${response.status})`);
        }
        const data = await response.json();

        if (data.currentStatus === "COLLECT_SUCCESS") {
          showStatus("Previous collection complete. Fetching data…", "success");
          updateProgress(1);
          await fetchBankingData(collectionId);
        } else {
          showStatus(`Status: ${data.currentStatus ?? "pending"}`);
        }
      } catch (error) {
        console.error(error);
        showStatus("Unable to restore previous collection", "error");
      }
    },
    [fetchBankingData, showStatus, updateProgress]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!supabase) {
        showStatus("Supabase client not configured.", "error");
        return;
      }

      const session = await getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        showStatus("Please sign in to continue.", "error");
        updateProgress(1);
        return;
      }

      setButtonDisabled(true);
      setButtonLabel("Starting session…");
      showStatus("Initializing secure connection…");
      updateProgress(1);

      try {
        const response = await fetch("/api/banking/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({})
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Could not start connection");

        collectionIdRef.current = data.collectionId;
        storeCollectionId(collectionIdRef.current);
        showStatus("Opening secure TruID window…");

        const popup = window.open(
          data.consumerUrl,
          "TruID Banking Connection",
          "width=500,height=700,scrollbars=yes,resizable=yes"
        );

        if (!popup) throw new Error("Popup blocked. Please allow popups.");

        startStatusPolling(collectionIdRef.current);
      } catch (error) {
        console.error(error);
        showStatus(error.message || "Unable to start session", "error");
        resetButton();
        updateProgress(1);
      }
    },
    [getSession, resetButton, showStatus, startStatusPolling, storeCollectionId, updateProgress]
  );

  useEffect(() => {
    setShowResults(false);
    setLoaderStatus({ fetch: "Fetching data…", json: "", save: "" });

    const savedCollectionId = loadStoredCollectionId();
    if (savedCollectionId) {
      collectionIdRef.current = savedCollectionId;
      restoreLastCollection(savedCollectionId);
    }

    const handleMessage = (event) => {
      if (event.data?.type === "TRUID_SUCCESS") {
        showStatus("Connection completed in TruID window", "success");
        updateProgress(3);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadStoredCollectionId, restoreLastCollection, setLoaderStatus, showStatus, updateProgress]);

  return (
    <div className="step1-root">
      {onBack ? (
        <button type="button" className="back-link" onClick={onBack} aria-label="Back">
          <i className="fa-solid fa-arrow-left" />
        </button>
      ) : null}

      <div className="container">
        <span className="badge">
          <i className="fa-solid fa-lock" />
          Step 1
        </span>

        <div className="masthead">
          <h1>Connect Your Bank</h1>
          <p className="subtitle">
            Launch a TruID session. <br />
            Securely connect your bank account and share your financial data with our application.
          </p>
        </div>

        <form id="bankForm" onSubmit={handleSubmit}>
          <div className="ctaWrap">
            <button id="startBtn" className="step1-btn" type="submit" disabled={buttonDisabled}>
              <span>{buttonLabel}</span>
            </button>
          </div>
        </form>

        <div className={`status${statusType ? ` ${statusType}` : ""}`} role="status">
          {statusMessage}
        </div>

        {showResults ? (
          <div className="results" id="results">
            <div className="loader-wrap">
              <span className="loader" aria-hidden="true" />
              <div className="loader-text">
                <div id="fetchStatus">{fetchStatus}</div>
                <div className="loader-sub" id="jsonStatus">
                  {jsonStatus}
                </div>
                <div className="loader-sub" id="saveStatus">
                  {saveStatus}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="progress-footer" aria-live="polite">
          <div className="step-track">
            <div className="step-line-base" />
            <div className="step-line-active" style={stepLineStyle} />
            {[1, 2, 3, 4].map((step) => {
              const className =
                step < progressStep
                  ? "step-dot done"
                  : step === progressStep
                  ? "step-dot active"
                  : "step-dot upcoming";
              return (
                <span key={step} className={className}>
                  {step}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruIDStep1Page;