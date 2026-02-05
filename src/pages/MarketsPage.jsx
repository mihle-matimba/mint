import React, { useEffect, useState, useRef, useMemo, useId } from "react";
import { supabase } from "../lib/supabase.js";
import { getMarketsSecuritiesWithMetrics } from "../lib/marketData.js";
import { getStrategiesWithMetrics, getPublicStrategies, formatChangePct, formatChangeAbs, getChangeColor } from "../lib/strategyData.js";
import { useProfile } from "../lib/useProfile.js";
import { TrendingUp, Search, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import NotificationBell from "../components/NotificationBell.jsx";
import Skeleton from "../components/Skeleton.jsx";
import { StrategyReturnHeaderChart } from "../components/StrategyReturnHeaderChart.jsx";
import { ChartContainer } from "../components/ui/line-charts-2.jsx";
import { Area, ComposedChart, Line, ReferenceLine, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../lib/formatCurrency.js";

// Fallback sparkline data for strategies without price history
const generateSparkline = (changePct) => {
  const base = 20;
  const trend = changePct || 0;
  return Array.from({ length: 10 }, (_, i) => {
    const progress = i / 9;
    return base + (trend * 5 * progress) + (Math.random() * 2 - 1);
  });
};

const sortOptions = ["Market Cap", "Dividend Yield", "P/E Ratio", "Beta"];

const strategySortOptions = [
  "Recommended",
  "Best performance",
  "Lowest max drawdown",
  "Lowest volatility",
  "Lowest minimum",
  "Most popular",
];

const riskOptions = ["Low risk", "Balanced", "Growth", "High risk"];
const minInvestmentOptions = ["R500+", "R2,500+", "R10,000+"];
const exposureOptions = ["Local", "Global", "Mixed", "Equities", "ETFs"];
const timeHorizonOptions = ["Short", "Medium", "Long"];
const strategySectorOptions = ["Technology", "Consumer", "Healthcare", "Energy", "Financials"];

// Mini chart component for strategy cards
const StrategyMiniChart = ({ values }) => {
  const chartConfig = {
    returnPct: {
      label: "Return",
      color: "var(--color-mint-purple, #5b21b6)",
    },
  };
  const data = useMemo(
    () =>
      values.map((value, index) => ({
        label: `P${index + 1}`,
        returnPct: value,
      })),
    [values],
  );
  const lastIndex = data.length - 1;
  const gradientId = useId();
  const [activeLabel, setActiveLabel] = useState(null);
  const renderLastDot = ({ cx, cy, index }) => {
    if (index !== lastIndex) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#ffffff" opacity={0.95} />
        <circle cx={cx} cy={cy} r={2.5} fill={chartConfig.returnPct.color} />
      </g>
    );
  };

  return (
    <ChartContainer config={chartConfig} className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 6, left: 6, bottom: 4 }}
          onMouseMove={(state) => {
            if (state?.activeLabel) {
              setActiveLabel(state.activeLabel);
            }
          }}
          onMouseLeave={() => {
            setActiveLabel(null);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5b21b6" stopOpacity={0.22} />
              <stop offset="70%" stopColor="#3b1b7a" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>

          {activeLabel ? (
            <ReferenceLine
              x={activeLabel}
              stroke="#CBD5E1"
              strokeOpacity={0.7}
              strokeDasharray="3 3"
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="returnPct"
            stroke="transparent"
            fill={`url(#${gradientId})`}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="returnPct"
            stroke={chartConfig.returnPct.color}
            strokeWidth={2}
            dot={renderLastDot}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

const MarketsPage = ({ 
  initialView = "invest", // Added prop to receive requested tab
  onBack, 
  onOpenNotifications, 
  onOpenStockDetail, 
  onOpenNewsArticle, 
  onOpenFactsheet 
}) => {
  const { profile, loading: profileLoading } = useProfile();
  
  // -- CORE DATA STATE --
  const [securities, setSecurities] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [publicStrategies, setPublicStrategies] = useState([]);
  const [holdingsSecurities, setHoldingsSecurities] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [publicStrategiesLoading, setPublicStrategiesLoading] = useState(true);
  
  // -- SEARCH & NAVIGATION STATE --
  const [searchQuery, setSearchQuery] = useState("");
  const [strategiesSearchQuery, setStrategiesSearchQuery] = useState("");
  const [newsSearchQuery, setNewsSearchQuery] = useState("");
  
  // UPDATED: viewMode is now state, initialized by the prop
  const [viewMode, setViewMode] = useState(initialView);
  
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef(null);
  const isDragging = useRef(false);

  // -- ADDED EFFECT: Syncs tab if initialView changes from parent --
  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);
  
  // -- FILTER STATES: INVEST VIEW --
  const [selectedSort, setSelectedSort] = useState("Market Cap");
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [selectedExchanges, setSelectedExchanges] = useState(new Set());
  const [draftSort, setDraftSort] = useState("Market Cap");
  const [draftSectors, setDraftSectors] = useState(new Set());
  const [draftExchanges, setDraftExchanges] = useState(new Set());
  const [activeChips, setActiveChips] = useState([]);
  
  // -- FILTER STATES: OPENSTRATEGIES VIEW --
  const [strategySort, setStrategySort] = useState("Recommended");
  const [selectedRisks, setSelectedRisks] = useState(new Set());
  const [selectedMinInvestment, setSelectedMinInvestment] = useState("Any");
  const [selectedExposure, setSelectedExposure] = useState(new Set());
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(new Set());
  const [selectedStrategySectors, setSelectedStrategySectors] = useState(new Set());
  const [draftStrategySort, setDraftStrategySort] = useState("Recommended");
  const [draftRisks, setDraftRisks] = useState(new Set());
  const [draftMinInvestment, setDraftMinInvestment] = useState("Any");
  const [draftExposure, setDraftExposure] = useState(new Set());
  const [draftTimeHorizon, setDraftTimeHorizon] = useState(new Set());
  const [draftStrategySectors, setDraftStrategySectors] = useState(new Set());

  const holdingsBySymbol = useMemo(
    () => new Map(holdingsSecurities.map((security) => [security.symbol, security])),
    [holdingsSecurities],
  );

  const getStrategyHoldingsSnapshot = (strategy) => {
    if (!strategy?.holdings || !Array.isArray(strategy.holdings)) return [];
    return strategy.holdings.map((holding) => {
      const symbol = holding.ticker || holding.symbol || holding;
      const security = holdingsBySymbol.get(symbol);
      return {
        symbol,
        name: security?.name || symbol,
        logo_url: security?.logo_url || null,
      };
    });
  };
  
  // News pagination
  const [newsPage, setNewsPage] = useState(1);
  const newsPerPage = 20;

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const fetchSecurities = async () => {
      setLoading(true);
      
      try {
        const data = await getMarketsSecuritiesWithMetrics();
        console.log("📊 Fetched securities:", data);
        console.log("📊 Securities with prices:", data.filter(s => s.currentPrice != null).length);
        console.log("📊 Securities without prices:", data.filter(s => s.currentPrice == null).length);
        setSecurities(data);
      } catch (error) {
        console.error("Error fetching securities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurities();
  }, []);

  // Fetch strategies with metrics
  useEffect(() => {
    const fetchStrategies = async () => {
      setStrategiesLoading(true);
      
      try {
        const data = await getStrategiesWithMetrics();
        console.log("✅ Fetched strategies:", data);
        setStrategies(data);
      } catch (error) {
        console.error("Error fetching strategies:", error);
        setStrategies([]);
      } finally {
        setStrategiesLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  // Fetch public strategies for OpenStrategies view
  useEffect(() => {
    const fetchPublicStrategies = async () => {
      setPublicStrategiesLoading(true);
      
      try {
        const data = await getPublicStrategies();
        console.log("✅ Fetched public strategies:", data);
        setPublicStrategies(data);
      } catch (error) {
        console.error("Error fetching public strategies:", error);
        setPublicStrategies([]);
      } finally {
        setPublicStrategiesLoading(false);
      }
    };

    fetchPublicStrategies();
  }, []);


  useEffect(() => {
    const fetchHoldingsSecurities = async () => {
      const strategySources = [...strategies, ...publicStrategies];
      if (!supabase || strategySources.length === 0) return;

      try {
        // Get all unique ticker symbols from strategies if they have holdings
        const allTickers = [...new Set(
          strategySources
            .filter(s => s.holdings && Array.isArray(s.holdings))
            .flatMap(s => s.holdings.map(h => h.ticker || h.symbol || h))
        )];
        
        if (allTickers.length === 0) return;

        const { data, error } = await supabase
          .from("securities")
          .select("symbol, logo_url, name, currency, security_metrics(last_close)")
          .in("symbol", allTickers);

        if (!error && data) {
          setHoldingsSecurities(data);
        }
      } catch (error) {
        console.error("Error fetching holdings securities:", error);
      }
    };

    fetchHoldingsSecurities();
  }, [strategies, publicStrategies]);

  // Fetch news articles
  useEffect(() => {
    const fetchNewsArticles = async () => {
      if (!supabase) {
        console.log("❌ Supabase not initialized");
        return;
      }

      try {
        console.log("🔍 Fetching news articles from News_articles table...");
        const { data, error, count } = await supabase
          .from("News_articles")
          .select("id, title, source, published_at", { count: 'exact' })
          .order("published_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("❌ Error fetching news articles:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("Error hint:", error.hint);
          console.error("Error details:", error.details);
          console.error("Full error:", JSON.stringify(error, null, 2));
        } else {
          console.log("✅ News articles fetched successfully!");
          console.log("📊 Total count in DB:", count);
          console.log("📰 Articles returned:", data?.length || 0);
          console.log("Sample article:", data?.[0]);
          setNewsArticles(data || []);
        }
      } catch (error) {
        console.error("💥 Exception while fetching news articles:", error);
      }
    };

    fetchNewsArticles();
  }, []);

  // Reset news page when search query changes
  useEffect(() => {
    setNewsPage(1);
  }, [newsSearchQuery]);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const sectors = useMemo(() => {
    return [...new Set(securities.map((s) => s.sector).filter(Boolean))];
  }, [securities]);

  const exchanges = useMemo(() => {
    return [...new Set(securities.map((s) => s.exchange).filter(Boolean))];
  }, [securities]);

  const filteredSecurities = useMemo(() => {
    let filtered = securities.filter((security) => {
      const matchesSearch =
        security.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        security.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        security.sector?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSector = selectedSectors.size === 0 || selectedSectors.has(security.sector);
      const matchesExchange = selectedExchanges.size === 0 || selectedExchanges.has(security.exchange);

      return matchesSearch && matchesSector && matchesExchange;
    });

    // Sort
    if (selectedSort === "Market Cap") {
      filtered.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
    } else if (selectedSort === "Dividend Yield") {
      filtered.sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0));
    } else if (selectedSort === "P/E Ratio") {
      filtered.sort((a, b) => (a.pe || Infinity) - (b.pe || Infinity));
    } else if (selectedSort === "Beta") {
      filtered.sort((a, b) => (b.beta || 0) - (a.beta || 0));
    }

    return filtered;
  }, [securities, searchQuery, selectedSectors, selectedExchanges, selectedSort]);

  const largestCompanies = useMemo(() => {
    return filteredSecurities
      .filter((s) => s.market_cap)
      .sort((a, b) => b.market_cap - a.market_cap)
      .slice(0, 10);
  }, [filteredSecurities]);

  const highestDividendYield = useMemo(() => {
    return filteredSecurities
      .filter((s) => s.dividend_yield && s.dividend_yield > 0)
      .sort((a, b) => b.dividend_yield - a.dividend_yield)
      .slice(0, 10);
  }, [filteredSecurities]);

  const filteredStrategies = useMemo(() => {
    // Use publicStrategies for OpenStrategies view
    const results = publicStrategies.filter((strategy) => {
      const matchesName =
        strategiesSearchQuery.length === 0
          ? true
          : (strategy.name?.toLowerCase().includes(strategiesSearchQuery.toLowerCase()) ||
             strategy.short_name?.toLowerCase().includes(strategiesSearchQuery.toLowerCase()) ||
             strategy.description?.toLowerCase().includes(strategiesSearchQuery.toLowerCase()) ||
             (strategy.tags && strategy.tags.some(tag => tag.toLowerCase().includes(strategiesSearchQuery.toLowerCase()))));
      
      const matchesRisk = selectedRisks.size
        ? selectedRisks.has(strategy.risk_level)
        : true;
      
      // Convert min_investment to minInvestment categories for filtering
      const minInvest = strategy.min_investment || 0;
      let investmentCategory = "R500+";
      if (minInvest >= 10000) investmentCategory = "R10,000+";
      else if (minInvest >= 2500) investmentCategory = "R2,500+";
      
      const matchesMinInvestment = selectedMinInvestment && selectedMinInvestment !== "Any"
        ? investmentCategory === selectedMinInvestment
        : true;
      
      const matchesExposure = selectedExposure.size
        ? selectedExposure.has(strategy.objective)
        : true;
      
      const matchesTimeHorizon = selectedTimeHorizon.size
        ? (strategy.tags && strategy.tags.some(tag => selectedTimeHorizon.has(tag)))
        : true;
      
      const matchesSector = selectedStrategySectors.size
        ? (strategy.sector && selectedStrategySectors.has(strategy.sector))
        : true;

      return (
        matchesName &&
        matchesRisk &&
        matchesMinInvestment &&
        matchesExposure &&
        matchesTimeHorizon &&
        matchesSector
      );
    });

    // Sort strategies - already ordered by is_featured desc, name asc from database
    // But apply client-side sorts if selected
    const sorted = [...results];
    if (strategySort === "Best performance") {
      // Would need performance metrics for this
      sorted.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
    }
    if (strategySort === "Lowest minimum") {
      sorted.sort((a, b) => (a.min_investment || 0) - (b.min_investment || 0));
    }

    return sorted;
  }, [
    publicStrategies,
    strategiesSearchQuery,
    selectedRisks,
    selectedMinInvestment,
    selectedExposure,
    selectedTimeHorizon,
    selectedStrategySectors,
    strategySort,
  ]);

  const gainers = useMemo(() => {
    // Generate mock percentage gains for now (will be replaced with real data)
    return filteredSecurities
      .filter((s) => s.market_cap)
      .map((s) => ({
        ...s,
        // Mock gain calculation based on some metrics
        percentGain: s.dividend_yield ? Number(s.dividend_yield) * 2 + Math.random() * 10 : Math.random() * 15 + 5
      }))
      .sort((a, b) => b.percentGain - a.percentGain)
      .slice(0, 10);
  }, [filteredSecurities]);

  const filteredNews = useMemo(() => {
    return newsArticles.filter(article => 
      newsSearchQuery.length === 0 ||
      article.title?.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
      article.source?.toLowerCase().includes(newsSearchQuery.toLowerCase())
    );
  }, [newsArticles, newsSearchQuery]);

  const paginatedNews = useMemo(() => {
    const startIndex = (newsPage - 1) * newsPerPage;
    const endIndex = startIndex + newsPerPage;
    return filteredNews.slice(startIndex, endIndex);
  }, [filteredNews, newsPage, newsPerPage]);

  const totalNewsPages = Math.ceil(filteredNews.length / newsPerPage);

  const formatMarketCap = (value) => {
    if (!value) return "—";
    const num = Number(value);
    if (num >= 1e12) return `R${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `R${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `R${(num / 1e6).toFixed(2)}M`;
    return `R${num.toFixed(2)}`;
  };

  const getDisplayCurrency = (security) => {
    const currency = security.currency || "R";
    return currency.toUpperCase() === "ZAC" ? "R" : currency;
  };

  const formatPrice = (security) => {
    if (security.currentPrice != null) {
      const currency = security.currency || "R";
      const priceValue = currency.toUpperCase() === "ZAC"
        ? Number(security.currentPrice) / 100
        : Number(security.currentPrice);
      return priceValue.toFixed(2);
    }
    return "—";
  };

  const getHoldingSymbol = (holding) => holding?.ticker || holding?.symbol || holding;

  const getHoldingsMinInvestment = (strategy) => {
    if (!strategy?.holdings || !Array.isArray(strategy.holdings)) return null;
    const total = strategy.holdings.reduce((sum, holding) => {
      const symbol = getHoldingSymbol(holding);
      const security = holdingsSecurities.find((s) => s.symbol === symbol);
      const metrics = Array.isArray(security?.security_metrics)
        ? security.security_metrics[0]
        : security?.security_metrics;
      const lastClose = metrics?.last_close;
      if (lastClose == null) return sum;
      const currency = security?.currency || strategy?.base_currency || "R";
      const normalizedPrice = currency.toUpperCase() === "ZAC"
        ? Number(lastClose) / 100
        : Number(lastClose);
      return sum + (Number.isFinite(normalizedPrice) ? normalizedPrice : 0);
    }, 0);
    return total > 0 ? total : null;
  };

  const resetSheetPosition = () => {
    setSheetOffset(0);
    dragStartY.current = null;
    isDragging.current = false;
  };

  const handleSheetPointerDown = (event) => {
    dragStartY.current = event.clientY;
    isDragging.current = true;
  };

  const handleSheetPointerMove = (event) => {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = event.clientY - dragStartY.current;
    setSheetOffset(delta > 0 ? delta : 0);
  };

  const handleSheetPointerUp = () => {
    if (!isDragging.current) return;
    if (sheetOffset > 80) {
      setIsFilterOpen(false);
    }
    resetSheetPosition();
  };

  const applyFilters = () => {
    setSelectedSort(draftSort);
    setSelectedSectors(new Set(draftSectors));
    setSelectedExchanges(new Set(draftExchanges));
    
    const chips = [];
    if (draftSectors.size) chips.push(...Array.from(draftSectors));
    if (draftExchanges.size) chips.push(...Array.from(draftExchanges));
    setActiveChips(chips);
    setIsFilterOpen(false);
  };

  const clearAllFilters = () => {
    setSelectedSort("Market Cap");
    setSelectedSectors(new Set());
    setSelectedExchanges(new Set());
    setDraftSort("Market Cap");
    setDraftSectors(new Set());
    setDraftExchanges(new Set());
    setActiveChips([]);
  };

  const removeChip = (chip) => {
    if (sectors.includes(chip)) {
      const next = new Set(selectedSectors);
      next.delete(chip);
      setSelectedSectors(next);
    } else if (exchanges.includes(chip)) {
      const next = new Set(selectedExchanges);
      next.delete(chip);
      setSelectedExchanges(next);
    }
    setActiveChips((prev) => prev.filter((item) => item !== chip));
  };

  const applyStrategyFilters = () => {
    setStrategySort(draftStrategySort);
    setSelectedRisks(new Set(draftRisks));
    setSelectedMinInvestment(draftMinInvestment);
    setSelectedExposure(new Set(draftExposure));
    setSelectedTimeHorizon(new Set(draftTimeHorizon));
    setSelectedStrategySectors(new Set(draftStrategySectors));
    
    const chips = [];
    if (draftRisks.size) chips.push(...Array.from(draftRisks));
    if (draftExposure.size) chips.push(...Array.from(draftExposure));
    if (draftMinInvestment) chips.push(draftMinInvestment);
    if (draftTimeHorizon.size) chips.push(...Array.from(draftTimeHorizon));
    if (draftStrategySectors.size) chips.push(...Array.from(draftStrategySectors));
    setActiveChips(chips);
    setIsFilterOpen(false);
  };

  const clearAllStrategyFilters = () => {
    setStrategySort("Recommended");
    setSelectedRisks(new Set());
    setSelectedMinInvestment(null);
    setSelectedExposure(new Set());
    setSelectedTimeHorizon(new Set());
    setSelectedStrategySectors(new Set());
    setDraftStrategySort("Recommended");
    setDraftRisks(new Set());
    setDraftMinInvestment(null);
    setDraftExposure(new Set());
    setDraftTimeHorizon(new Set());
    setDraftStrategySectors(new Set());
    setActiveChips([]);
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
        <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-12 pt-12">
          <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
            <header className="flex items-center justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </header>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
        <div className="mx-auto -mt-10 flex w-full max-w-sm flex-col gap-4 px-4 pb-10 md:max-w-md">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      {/* Header */}
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-6 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="flex items-center justify-between text-white">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-active active:scale-95"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Markets</h1>
            <NotificationBell onClick={onOpenNotifications} />
          </header>

          {/* TAB SWITCHER: This allows the deep-linking to actually show the right tab */}
          <div className="flex gap-2 rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
            <button
              onClick={() => setViewMode("openstrategies")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                viewMode === "openstrategies" ? "bg-white text-slate-900 shadow-md" : "text-white/70"
              }`}
            >
              Strategies
            </button>
            <button
              onClick={() => setViewMode("invest")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                viewMode === "invest" ? "bg-white text-slate-900 shadow-md" : "text-white/70"
              }`}
            >
              Invest
            </button>
            <button
              onClick={() => setViewMode("news")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                viewMode === "news" ? "bg-white text-slate-900 shadow-md" : "text-white/70"
              }`}
            >
              News
            </button>
          </div>

          {/* DYNAMIC SEARCH: Placeholder and Value change based on the active tab */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder={
                viewMode === "news" ? "Search news..." : 
                viewMode === "openstrategies" ? "Search strategies..." : 
                "Search by name, symbol, or sector..."
              }
              value={
                viewMode === "news" ? newsSearchQuery : 
                viewMode === "openstrategies" ? strategiesSearchQuery : 
                searchQuery
              }
              onChange={(e) => {
                if (viewMode === "news") setNewsSearchQuery(e.target.value);
                else if (viewMode === "openstrategies") setStrategiesSearchQuery(e.target.value);
                else setSearchQuery(e.target.value);
              }}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-12 py-3 text-sm text-white placeholder-white/50 backdrop-blur-sm focus:border-white/40 focus:bg-white/15 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto -mt-2 flex w-full max-w-sm flex-col gap-6 px-4 pb-10 md:max-w-md md:px-8">
        
        {/* ==========================================
            1. STRATEGIES TAB (Consolidated & Fixed)
           ========================================== */}
        {viewMode === "openstrategies" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsFilterOpen(true);
                  setDraftStrategySort(strategySort);
                  setDraftRisks(new Set(selectedRisks));
                  setDraftMinInvestment(selectedMinInvestment);
                  setDraftExposure(new Set(selectedExposure));
                  setDraftTimeHorizon(new Set(selectedTimeHorizon));
                  setDraftStrategySectors(new Set(selectedStrategySectors));
                }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              <span className="text-sm font-medium text-slate-500">
                {filteredStrategies.length} strategies
              </span>
            </div>

            {/* Active Filter Chips for Strategies */}
            {(selectedRisks.size > 0 || 
              (selectedMinInvestment !== null && selectedMinInvestment !== "Any") || 
              selectedExposure.size > 0 || 
              selectedTimeHorizon.size > 0 || 
              selectedStrategySectors.size > 0) && (
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedRisks).map((risk) => (
                  <button key={risk} onClick={() => { const next = new Set(selectedRisks); next.delete(risk); setSelectedRisks(next); }} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all active:scale-95">
                    {risk} <X className="h-3 w-3" />
                  </button>
                ))}
                {selectedMinInvestment !== null && selectedMinInvestment !== "Any" && (
                  <button onClick={() => setSelectedMinInvestment("Any")} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all active:scale-95">
                    {selectedMinInvestment} <X className="h-3 w-3" />
                  </button>
                )}
                {Array.from(selectedExposure).map((exp) => (
                  <button key={exp} onClick={() => { const next = new Set(selectedExposure); next.delete(exp); setSelectedExposure(next); }} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all active:scale-95">
                    {exp} <X className="h-3 w-3" />
                  </button>
                ))}
                {Array.from(selectedTimeHorizon).map((th) => (
                  <button key={th} onClick={() => { const next = new Set(selectedTimeHorizon); next.delete(th); setSelectedTimeHorizon(next); }} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all active:scale-95">
                    {th} <X className="h-3 w-3" />
                  </button>
                ))}
                {Array.from(selectedStrategySectors).map((sector) => (
                  <button key={sector} onClick={() => { const next = new Set(selectedStrategySectors); next.delete(sector); setSelectedStrategySectors(next); }} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-all active:scale-95">
                    {sector} <X className="h-3 w-3" />
                  </button>
                ))}
                <button onClick={clearAllStrategyFilters} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all active:scale-95">
                  Clear all
                </button>
              </div>
            )}

            {/* Strategy List (Grouped by Sector) */}
            <div className="space-y-8">
              {publicStrategiesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-2xl" />
                  <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
              ) : filteredStrategies.length === 0 ? (
                <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-md">
                   <p className="text-sm font-semibold text-slate-700">No strategies found</p>
                </div>
              ) : (
                [...new Set(filteredStrategies.map(s => s.sector || 'General'))].map((sector) => {
                  const sectorStrategies = filteredStrategies.filter(s => (s.sector || 'General') === sector);
                  if (sectorStrategies.length === 0) return null;
                  return (
                    <section key={sector}>
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">{sector}</h2>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                        {sectorStrategies.map((strategy) => (
                          <button 
                            key={strategy.id} 
                            onClick={() => setSelectedStrategy(strategy)} 
                            className="flex-shrink-0 w-80 rounded-3xl bg-white p-5 shadow-sm border border-slate-100 text-left snap-center transition-all active:scale-[0.98]"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-slate-900">{strategy.short_name || strategy.name}</h3>
                              <StrategyMiniChart values={generateSparkline(strategy.change_pct)} />
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{strategy.description}</p>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                                {(strategy.tags && strategy.tags.length > 0 ? strategy.tags.slice(0, 2) : [strategy.risk_level]).map((tag, i) => (
                                  <span key={i} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{tag}</span>
                                ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ==========================================
            2. INVEST TAB (Stocks)
           ========================================== */}
        {viewMode === "invest" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setIsFilterOpen(true);
                  setDraftSort(selectedSort);
                  setDraftSectors(new Set(selectedSectors));
                  setDraftExchanges(new Set(selectedExchanges));
                }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-all active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Filter & Sort</span>
              </button>
              <span className="text-sm font-medium text-slate-500">{filteredSecurities.length} stocks</span>
            </div>

            {/* Active Chips for Invest */}
            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeChips.map((chip) => (
                  <button key={chip} onClick={() => removeChip(chip)} className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700">
                    {chip} <X className="h-3 w-3" />
                  </button>
                ))}
                <button onClick={clearAllFilters} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Clear all</button>
              </div>
            )}

            {!searchQuery ? (
              <div className="space-y-8 mt-4">
                {/* Largest Companies */}
                <section>
                  <h2 className="mb-4 text-lg font-bold text-slate-900">Largest companies</h2>
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                    {largestCompanies.map((s) => (
                      <button key={s.id} onClick={() => onOpenStockDetail(s)} className="flex-shrink-0 w-64 snap-center rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm">
                        <div className="flex items-center gap-3">
                            {s.logo_url ? <img src={s.logo_url} className="h-10 w-10 rounded-full" alt={s.symbol} /> : <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">{s.symbol.substring(0,2)}</div>}
                            <div>
                                <p className="font-bold text-slate-900">{s.symbol}</p>
                                <p className="text-xs text-slate-500">{formatMarketCap(s.market_cap)}</p>
                            </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* All Assets List */}
                <section>
                  <h2 className="mb-4 text-lg font-bold text-slate-900">All Assets</h2>
                  <div className="space-y-3">
                    {filteredSecurities.map((s) => (
                      <button key={s.id} onClick={() => onOpenStockDetail(s)} className="w-full rounded-3xl bg-white p-4 flex items-center gap-4 shadow-sm transition-all active:scale-[0.98]">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">{s.symbol?.substring(0, 2)}</div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-slate-900">{s.short_name || s.symbol}</p>
                          <p className="text-xs text-slate-400">{s.sector}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{getDisplayCurrency(s)} {formatPrice(s)}</p>
                           {s.changePct != null && (
                              <p className={`text-xs font-semibold ${s.changePct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%
                              </p>
                           )}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              /* Search Results */
              <div className="space-y-3 mt-4">
                {filteredSecurities.map((s) => (
                  <button key={s.id} onClick={() => onOpenStockDetail(s)} className="w-full rounded-3xl bg-white p-4 flex items-center justify-between shadow-sm">
                    <div className="text-left">
                        <p className="font-bold text-slate-900">{s.short_name || s.symbol}</p>
                        <p className="text-xs text-slate-400">{s.symbol}</p>
                    </div>
                    <div className="text-right font-bold text-slate-900">{getDisplayCurrency(s)} {formatPrice(s)}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ==========================================
            3. NEWS TAB
           ========================================== */}
        {viewMode === "news" && (
          <div className="space-y-3 pt-4">
            {filteredNews.length === 0 ? (
              <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-md">
                <p className="text-sm font-semibold text-slate-700">No news articles found</p>
              </div>
            ) : (
              <>
                {paginatedNews.map((article) => (
                  <button key={article.id} onClick={() => onOpenNewsArticle(article.id)} className="w-full rounded-3xl bg-white p-5 shadow-md text-left transition-all active:scale-[0.98]">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{article.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <span className="text-violet-600">{article.source}</span>
                      <span>•</span>
                      <span>{new Date(article.published_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
                {/* Pagination */}
                {totalNewsPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button onClick={() => setNewsPage(p => Math.max(1, p - 1))} disabled={newsPage === 1} className="text-xs font-bold text-slate-400 disabled:opacity-30">PREVIOUS</button>
                    <span className="text-xs font-bold text-slate-900">{newsPage} / {totalNewsPages}</span>
                    <button onClick={() => setNewsPage(p => Math.min(totalNewsPages, p + 1))} disabled={newsPage === totalNewsPages} className="text-xs font-bold text-violet-600 disabled:opacity-30">NEXT</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* STRATEGY PREVIEW MODAL */}
      {selectedStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="relative z-10 w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl">
            <button onClick={() => setSelectedStrategy(null)} className="absolute right-4 top-4 text-slate-400"><X className="h-4 w-4" /></button>
            <h2 className="text-xl font-bold mb-2">{selectedStrategy.name}</h2>
            <p className="text-sm text-slate-500 mb-6">{selectedStrategy.description}</p>
            <button 
              onClick={() => { setSelectedStrategy(null); onOpenFactsheet(selectedStrategy); }}
              className="w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-4 font-bold text-white shadow-lg"
            >
              View Factsheet
            </button>
          </div>
        </div>
      )}

      {/* FILTER SHEET */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 px-4 pb-6">
          <div className="relative z-10 h-[65vh] w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Filters</h3>
              <button onClick={() => setIsFilterOpen(false)} className="text-slate-400"><X /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-6">
               {/* Filters are dynamically rendered based on viewMode here */}
               {viewMode === "openstrategies" ? (
                 <div className="space-y-4">
                    <p className="text-sm font-bold">Sort</p>
                    <div className="flex flex-wrap gap-2">
                        {strategySortOptions.map(opt => (
                            <button key={opt} onClick={() => setDraftStrategySort(opt)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${draftStrategySort === opt ? 'bg-violet-600 text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>{opt}</button>
                        ))}
                    </div>
                    {/* Add other strategy filters here (Risk, Min Investment, etc) following the same pattern */}
                 </div>
               ) : (
                 <div className="space-y-4">
                    <p className="text-sm font-bold">Sort</p>
                    <div className="flex flex-wrap gap-2">
                        {sortOptions.map(opt => (
                            <button key={opt} onClick={() => setDraftSort(opt)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${draftSort === opt ? 'bg-violet-600 text-white border-transparent' : 'border-slate-200 text-slate-600'}`}>{opt}</button>
                        ))}
                    </div>
                    {/* Add other invest filters here (Sector, Exchange) */}
                 </div>
               )}
            </div>

            <button 
               onClick={() => {
                 if (viewMode === "openstrategies") applyStrategyFilters();
                 else applyFilters();
                 setIsFilterOpen(false);
               }}
               className="w-full rounded-2xl bg-slate-900 py-4 text-white font-bold transition-all active:scale-95"
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketsPage;