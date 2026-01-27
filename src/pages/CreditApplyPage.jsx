import React, { useRef, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Landmark, CheckCircle2, UserPen, Zap, TrendingUp, Search } from "lucide-react";
import { MintGradientLayout } from "../components/credit/ui/MintGradientLayout";
import { MintCard } from "../components/credit/ui/MintCard";
import { MintRadarChart } from "../components/credit/ui/MintRadarChart";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";
import { useCreditCheck } from "../lib/useCreditCheck";

// --- Subcomponents for Stages ---

// Stage 1: TruID Connect
const ConnectionStage = ({ onComplete, onError }) => {
  const [status, setStatus] = useState("idle"); // idle, connecting, polling, capturing, success, error
  const [message, setMessage] = useState("");
  const [debugLog, setDebugLog] = useState([]);
  const collectionIdRef = useRef(null);
  const pollingRef = useRef(null);
   const lastStatusRef = useRef(null);

  const addLog = (msg) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const startSession = async () => {
    setStatus("connecting");
    setMessage("Initializing secure connection...");
    addLog("Starting session...");
    
    try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) throw new Error("Authentication required");

       const response = await fetch("/api/banking/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({})
       });
       
       const data = await response.json();
       addLog(`Initiate response: ${JSON.stringify(data)}`);
       if (!data.success) throw new Error(data.error || "Connection failed");

       collectionIdRef.current = data.collectionId;
       
       // Open popup
       const width = 500;
       const height = 700;
       const left = (window.screen.width - width) / 2;
       const top = (window.screen.height - height) / 2;
       
       const popup = window.open(
          data.consumerUrl,
          "TruID Banking",
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
       );

       if (!popup) throw new Error("Popup blocked. Please allow popups for banking connection.");
       
       setMessage("Complete the process in the popup window...");
       setStatus("polling");
       addLog(`Polling started for collectionId: ${data.collectionId}`);
       startPolling(data.collectionId);

    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err.message);
      addLog(`Error starting: ${err.message}`);
      onError(err.message);
    }
  };

  const startPolling = (collectionId) => {
     if (pollingRef.current) clearInterval(pollingRef.current);
     
     pollingRef.current = setInterval(async () => {
        try {
           const res = await fetch(`/api/banking/status?collectionId=${collectionId}`);
           const data = await res.json();
           const rawStatus = data.currentStatus;
           const s = String(rawStatus || "").toUpperCase();
           const numericStatus = Number(rawStatus);
           const hasNumericStatus = Number.isFinite(numericStatus);
           const isComplete = s.includes("SUCCESS") || s.includes("COMPLETED") || (hasNumericStatus && numericStatus >= 2000 && numericStatus < 3000);
           const isFailed = s.includes("FAILED") || s.includes("CANCELLED") || s.includes("ERROR");

           const statusSignature = JSON.stringify({ status: rawStatus });
           if (statusSignature !== lastStatusRef.current) {
             addLog(`Poll Status: ${hasNumericStatus ? numericStatus : s || rawStatus}`);
             addLog(`Status Payload: ${JSON.stringify(data)}`);
             lastStatusRef.current = statusSignature;
           }

           if (isComplete) {
              clearInterval(pollingRef.current);
              setStatus("capturing");
              setMessage("Analyzing banking data...");
              addLog("Status Success. Starting Capture...");
              
              // Capture Data
              try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const captureRes = await fetch(`/api/banking/capture`, {
                      method: "POST",
                      headers: { 
                          "Content-Type": "application/json",
                          "Authorization": session ? `Bearer ${session.access_token}` : ""
                      },
                      body: JSON.stringify({ collectionId })
                  });
                  
                  const captureText = await captureRes.text();
                  addLog(`Capture Raw Response: ${captureText.substring(0, 200)}...`);
                  
                  let captureData;
                  try {
                      captureData = JSON.parse(captureText);
                  } catch(e) {
                      addLog("Failed to parse capture response JSON");
                      throw new Error("Invalid JSON from capture endpoint");
                  }
                  
                  if (!captureRes.ok || !captureData.success) {
                      addLog(`Capture Failed: ${captureData.error || captureRes.statusText}`);
                      throw new Error(captureData.error || "Capture failed");
                  }

                  setStatus("success");
                  setMessage("Banking data verified successfully.");
                  addLog("Capture Success! Saved Snapshot:");
                  addLog(JSON.stringify(captureData.snapshot, null, 2));
                  
                  // Brief delay to show success
                  setTimeout(() => {
                      onComplete(collectionId, captureData.success ? captureData.snapshot : null);
                  }, 3000); // Increased delay so user can see debug logs

              } catch (err) {
                  console.error("Capture error", err);
                  setStatus("error");
                  setMessage("Failed to retrieve banking data.");
                  addLog(`Capture Error Exception: ${err.message}`);
              }

           } else if (isFailed) {
              clearInterval(pollingRef.current);
              setStatus("error");
              setMessage("Bank connection was cancelled or failed.");
              addLog(`Polling Failed Status: ${s || rawStatus}`);
           }
        } catch (e) {
           console.error("Polling error", e);
           addLog(`Polling Exception: ${e.message}`);
        }
     }, 3000);
  };
  
  // Cleanup
  useEffect(() => {
     return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  return (
    <MintCard title="Bank Verification" subtitle="Securely link your primary account to verify income." className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col items-center gap-6 py-4">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'polling' || status === 'capturing' ? 'bg-amber-100 text-amber-600 animate-pulse' : status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
           <Landmark size={32} />
        </div>
        
        <div className="text-center max-w-xs">
           <p className="text-sm font-medium text-slate-600 mb-1">{message || "We use TruID to verify your affordability in real-time."}</p>
           {status === 'error' && <p className="text-xs text-red-500 font-bold mt-2">{message}</p>}
        </div>

        {status !== 'polling' && status !== 'capturing' && status !== 'success' && (
           <button 
             onClick={startSession}
             className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
              <ShieldCheck size={18} /> Connect Bank
           </button>
        )}
        
        {status === 'polling' && (
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
             <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
             Waiting for bank...
           </div>
        )}

        {status === 'capturing' && (
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
             <span className="w-2 h-2 rounded-full bg-amber-600 animate-spin"></span>
             Analyzing...
           </div>
        )}
         
         {status === 'success' && (
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
             <CheckCircle2 size={16} /> Verified
           </div>
        )}

        {/* Debug Log View */}
        {debugLog.length > 0 && (
          <div className="w-full mt-6 bg-slate-900 rounded-lg p-4 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48 overflow-y-auto border border-slate-700 shadow-inner">
             <p className="font-bold text-slate-500 mb-2 uppercase sticky top-0 bg-slate-900 pb-2 border-b border-slate-700">Debug Console</p>
             {debugLog.map((log, i) => (
               <div key={i} className="mb-1 whitespace-pre-wrap border-b border-slate-800/50 pb-1">{log}</div>
             ))}
          </div>
        )}
      </div>
    </MintCard>
  );
};


// Stage 2: Enrichment (Review Details)
const EnrichmentStage = ({ onSubmit, defaultValues, employerOptions }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
      employerName: defaultValues?.employerName || "",
      employmentSector: defaultValues?.employmentSector || "",
      contractType: defaultValues?.contractType || "",
      grossIncome: defaultValues?.grossIncome || "",
      ...defaultValues
  });

  const isMissingData = !formData.employerName || !formData.grossIncome;

  useEffect(() => {
     if (isMissingData) setShowForm(true);
  }, [isMissingData]);

  useEffect(() => {
    // Keep internal state in sync if defaultValues updates from parent
    setFormData(prev => ({
      ...prev,
      ...defaultValues
    }));
  }, [defaultValues]);

  const handleChange = (f, v) => setFormData(prev => ({...prev, [f]: v}));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <MintCard title="Employment Details" className="relative overflow-hidden">
         {!showForm ? (
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                  <p className="text-sm text-slate-500">Employment verified via info.</p>
                  <p className="text-lg font-bold text-slate-900">{formData.employerName || "Unknown Employer"}</p>
                  <p className="text-xs font-medium bg-emerald-50 text-emerald-700 inline-block px-2 py-1 rounded-md mt-2">
                     Derived from bank statement
                  </p>
               </div>
               
               <button onClick={() => setShowForm(true)} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all" title="Review Details">
                  <UserPen size={20} />
               </button>
            </div>
         ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-slate-500 text-xs">Please confirm these details are correct.</p>
                 <button onClick={() => setShowForm(false)} className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-900">Cancel Review</button>
               </div>
               
               <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-400 uppercase">Employer Name</span>
                    <input 
                      list="employer-list"
                      className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none transition-colors"
                      value={formData.employerName}
                      onChange={(e) => handleChange("employerName", e.target.value)}
                      placeholder="e.g. Acme Corp" 
                    />
                    {employerOptions?.length > 0 && (
                      <datalist id="employer-list">
                        {employerOptions.map((name) => (
                           <option key={name} value={name} />
                        ))}
                      </datalist>
                    )}
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <label className="block">
                        <span className="text-xs font-bold text-slate-400 uppercase">Sector</span>
                        <select 
                           value={formData.employmentSector}
                           onChange={(e) => handleChange('employmentSector', e.target.value)}
                           className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none"
                        >
                            <option value="">Select...</option>
                            <option value="government">Government</option>
                            <option value="private">Private</option>
                            <option value="listed">Listed Company</option>
                            <option value="other">Other</option>
                        </select>
                     </label>
                     <label className="block">
                        <span className="text-xs font-bold text-slate-400 uppercase">Contract</span>
                        <select 
                           value={formData.contractType}
                           onChange={(e) => handleChange('contractType', e.target.value)}
                           className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none"
                        >
                            <option value="">Select...</option>
                            <option value="PERMANENT">Permanent</option>
                            <option value="FIXED_TERM_12_PLUS">Fixed Term ({'>'}12m)</option>
                            <option value="FIXED_TERM_LT_12">Fixed Term ({'<'}12m)</option>
                            <option value="SELF_EMPLOYED_12_PLUS">Self Employed</option>
                        </select>
                     </label>
                  </div>

                   <label className="block">
                      <span className="text-xs font-bold text-slate-400 uppercase">Monthly Income</span>
                      <input 
                        type="number"
                        className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none transition-colors"
                        value={formData.grossIncome}
                        onChange={(e) => handleChange("grossIncome", e.target.value)}
                        placeholder="R 0.00" 
                      />
                  </label>
               </div>
            </div>
         )}
      </MintCard>

      <button 
        onClick={() => onSubmit(formData)}
        className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-[20px] font-bold uppercase tracking-widest text-sm shadow-xl shadow-purple-900/20 active:scale-95 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
      >
        Run Assessment <ArrowRight size={18} />
      </button>
    </div>
  );
};


// Stage 3: Results
const ResultStage = ({ score, isCalculating, breakdown }) => {
    
    // Map breakdown or default fake data
    const categories = breakdown ? Object.entries(breakdown).map(([k, v]) => ({
        label: k.replace(/([A-Z])/g, " $1").trim(),
        value: Math.min(100, (v?.contributionPercent || 0) * 100),
        weight: '25%'
    })) : [
        { label: 'Affordability', value: 85 },
        { label: 'Stability', value: 90 },
        { label: 'Credit', value: 75 },
        { label: 'Behavior', value: 65 }
    ];

    return (
        <MintCard className="animate-in zoom-in-95 duration-500 min-h-[400px]">
            <MintRadarChart 
                score={score} 
                categories={categories} 
                isCalculating={isCalculating}
            />
            
            {!isCalculating && score > 0 && (
                <div className="pt-8 border-t border-slate-50 mt-8">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Max Amount</p>
                            <p className="text-lg font-black text-slate-800">R {Math.min(15000, score * 150).toLocaleString()}</p>
                        </div>
                         <div className="bg-slate-50 p-3 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Interest</p>
                            <p className="text-lg font-black text-slate-800">{score > 80 ? '12.5%' : score > 60 ? '18.5%' : '24.5%'}</p>
                        </div>
                     </div>
                </div>
            )}
        </MintCard>
    );
};


// --- ORCHESTRATOR ---

const CreditApplyWizard = ({ onBack }) => {
  const [step, setStep] = useState(0); // 0=Intro, 1=Connect, 2=Enrich, 3=Result
  
  // Real Hook Integration
  const { 
    form: checkForm, 
    setField, 
    runEngine, 
    engineResult, 
    engineStatus, 
    employerCsv,
    lockInputs,
    snapshot,
    proceedToStep3 // Import this to save progress to DB
  } = useCreditCheck();

  const isCalculating = engineStatus === "Running";
  const score = engineResult?.loanEngineScoreNormalized ?? engineResult?.loanEngineScore ?? 0;

  // Sync Supabase Snapshot to Form
  useEffect(() => {
    if (snapshot) {
      if (snapshot.avg_monthly_income) setField("annualIncome", String(snapshot.avg_monthly_income * 12));
      if (snapshot.avg_monthly_expenses) setField("annualExpenses", String(snapshot.avg_monthly_expenses * 12));
    }
  }, [snapshot, setField]);
  
  const handleStart = () => setStep(1);

  const handleConnectionComplete = (collectionId, snapshotData) => {
     if (snapshotData) {
         if (snapshotData.avg_monthly_income) setField("annualIncome", String(snapshotData.avg_monthly_income * 12));
         if (snapshotData.avg_monthly_expenses) setField("annualExpenses", String(snapshotData.avg_monthly_expenses * 12));
     }
     setStep(2);
  };

  const handleEnrichmentSubmit = async (finalData) => {
     // 1. Sync Form Data to Hook
     if(finalData.employerName) setField("employerName", finalData.employerName);
     if(finalData.employmentSector) setField("employmentSector", finalData.employmentSector);
     if(finalData.contractType) setField("contractType", finalData.contractType);
     if(finalData.grossIncome) setField("annualIncome", String(finalData.grossIncome * 12));
     
     // 2. Lock & Run
     lockInputs(); 
     
     // 3. Save progress to Supabase
     if (proceedToStep3) proceedToStep3();

     setStep(3);
     await runEngine();
  };
  
  // Prepare "defaultValues" for Step 2 using the hook's current form state
  const enrichmentDefaults = {
    employerName: checkForm.employerName,
    employmentSector: checkForm.employmentSector,
    contractType: checkForm.contractType,
    grossIncome: checkForm.annualIncome ? Number(checkForm.annualIncome) / 12 : "",
  };
  
  const employerOptions = employerCsv?.map(row => row.split(";")[0]).filter(Boolean).slice(0, 50) || [];

  // Render Based on Step
  const renderContent = () => {
     switch(step) {
        case 0:
            return (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white shadow-xl">
                     <h2 className="text-xl font-bold mb-2">Welcome to Mint Credit</h2>
                     <p className="text-white/70 text-sm leading-relaxed">
                        Sophisticated credit solutions tailored to your financial profile. 
                        We evaluate your real-time banking behavior, not just your history.
                     </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     {[
                        { icon: ShieldCheck, label: "Secure" },
                        { icon: Zap, label: "Instant" },
                        { icon: TrendingUp, label: "Adaptive" },
                        { icon: Landmark, label: "FSP Reg." }
                     ].map((Item, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-sm h-24 hover:-translate-y-1 transition-transform">
                           <Item.icon className="text-slate-900" size={24} />
                           <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{Item.label}</span>
                        </div>
                     ))}
                  </div>

                  <button 
                     onClick={handleStart}
                     className="w-full py-5 bg-white text-slate-900 rounded-full font-bold uppercase tracking-widest text-sm shadow-xl shadow-white/10 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-slate-50"
                  >
                     Initiate Application
                  </button>
                </div>
            );
        case 1:
            return <ConnectionStage onComplete={handleConnectionComplete} onError={() => {}} />;
        case 2:
            return <EnrichmentStage 
                      defaultValues={enrichmentDefaults} 
                      employerOptions={employerOptions} 
                      onSubmit={handleEnrichmentSubmit} 
                   />;
        case 3:
            return <ResultStage 
                      score={score} 
                      isCalculating={isCalculating} 
                      breakdown={engineResult?.breakdown} 
                   />;
        default:
            return null;
     }
  };

  const getTitle = () => {
     if (step === 0) return "Credit Application";
     if (step === 1) return "Link Accounts";
     if (step === 2) return "Confirm Details";
     if (step === 3) return "Assessment Result";
     return "";
  };
  
  const getStepInfo = () => {
    if (step === 0) return "Start";
    return `${step} / 3`;
  };

  return (
    <MintGradientLayout 
        title={getTitle()} 
        subtitle={step === 1 ? "We need to verify your income via your primary bank account." : step === 2 ? "Review the details we found." : ""}
        stepInfo={getStepInfo()}
        onBack={step === 0 ? onBack : () => setStep(s => s - 1)}
    >
      {renderContent()}
    </MintGradientLayout>
  );
};

export default CreditApplyWizard;
