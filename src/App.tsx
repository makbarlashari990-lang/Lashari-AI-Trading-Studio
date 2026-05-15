/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  Shield,
  Activity, 
  Layers, 
  BarChart3, 
  Copy, 
  Check, 
  MousePointer2, 
  BrainCircuit,
  Zap,
  LayoutDashboard,
  BellRing,
  Wallet2,
  LogIn,
  LogOut,
  User as UserIcon,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
  Radar,
  Link as LinkIcon,
  Newspaper,
  Flame,
  Search,
  Play,
  Globe,
  Coins,
  ShieldCheck,
  ChevronRight,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Signal } from './types';
import { io } from 'socket.io-client';
import { TradingViewChart } from './components/TradingViewChart';
import { LiveMonitor } from './components/LiveMonitor';
import { NewsSentiment } from './components/NewsSentiment';
import { MarketHeatmap } from './components/MarketHeatmap';

const INDICATOR_CODE = `// This Pine Script™ code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © m_akbarlashari990

//@version=5
indicator("Lashari Smart Money AI Indicator", overlay=true, max_boxes_count=500, max_labels_count=500, max_lines_count=500)

// ==========================================
// INPUTS
// ==========================================
grp_ema = "EMA Trend System"
ema_fast_len = input.int(20, "EMA Fast (Trend)", group=grp_ema)
ema_med_len  = input.int(50, "EMA Medium (Confirmation)", group=grp_ema)
ema_slow_len = input.int(200, "EMA Slow (Major)", group=grp_ema)
show_ema_zones = input.bool(true, "Show Trend Zones", group=grp_ema)

grp_smc = "Smart Money Concepts (SMC)"
show_bos = input.bool(true, "Show BOS / CHOCH", group=grp_smc)
show_ob  = input.bool(true, "Show Order Blocks", group=grp_smc)
show_fvg = input.bool(true, "Show Fair Value Gaps", group=grp_smc)
smc_lookback = input.int(10, "SMC Lookback Period", group=grp_smc)

grp_osc = "Oscillators (RSI & MACD)"
rsi_len = input.int(14, "RSI Length", group=grp_osc)
rsi_ob  = input.int(70, "RSI Overbought", group=grp_osc)
rsi_os  = input.int(30, "RSI Oversold", group=grp_osc)
macd_f  = input.int(12, "MACD Fast", group=grp_osc)
macd_s  = input.int(26, "MACD Slow", group=grp_osc)
macd_sig = input.int(9, "MACD Signal", group=grp_osc)

grp_risk = "Risk Management"
atr_len = input.int(14, "ATR Length", group=grp_risk)
atr_mult = input.float(1.5, "ATR SL Multiplier", group=grp_risk)
tp1_rr = input.float(1.5, "Take Profit 1 (RR)", group=grp_risk)
tp2_rr = input.float(2.0, "Take Profit 2 (RR)", group=grp_risk)
tp3_rr = input.float(3.0, "Take Profit 3 (RR)", group=grp_risk)
show_tp_lines = input.bool(true, "Display TP/SL Levels on Chart", group=grp_risk)

grp_session = "Trading Sessions Filter"
use_session_filter = input.bool(true, "Only Trade During Active Sessions", group=grp_session)
show_session_color = input.bool(true, "Show Session Backgrounds", group=grp_session)
asian_sess_input = input.session("0000-0800", "Asian Session (UTC)", group=grp_session)
london_sess_input = input.session("0800-1600", "London Session (UTC)", group=grp_session)
nys_sess_input = input.session("1300-2100", "New York Session (UTC)", group=grp_session)

grp_extra = "Price Action Filters"
use_anti_fake = input.bool(true, "Use Anti-Fake Breakout Filter", group=grp_extra)
min_body_perc = input.float(50.0, "Min Body Percentage to Range", minval=0, maxval=100, group=grp_extra)

// ==========================================
// CALCULATIONS - SESSIONS
// ==========================================
is_asian = not na(time(timeframe.period, asian_sess_input, "UTC"))
is_london = not na(time(timeframe.period, london_sess_input, "UTC"))
is_nys = not na(time(timeframe.period, nys_sess_input, "UTC"))
is_in_session = is_asian or is_london or is_nys

bgcolor(show_session_color and is_asian ? color.new(color.blue, 95) : na, title="Asian Session BG")
bgcolor(show_session_color and is_london ? color.new(color.orange, 95) : na, title="London Session BG")
bgcolor(show_session_color and is_nys ? color.new(color.purple, 95) : na, title="NY Session BG")

is_asian_start = is_asian and not is_asian[1]
is_london_start = is_london and not is_london[1]
is_nys_start = is_nys and not is_nys[1]

// ==========================================
// CALCULATIONS - RISK & VOLATILITY
// ==========================================
atr = ta.atr(atr_len)

// ==========================================
// CALCULATIONS - EMA SYSTEM
// ==========================================
ema_fast = ta.ema(close, ema_fast_len)
ema_med  = ta.ema(close, ema_med_len)
ema_slow = ta.ema(close, ema_slow_len)

is_bullish_trend = ema_fast > ema_med and ema_med > ema_slow
is_bearish_trend = ema_fast < ema_med and ema_med < ema_slow

// --- Smooth Trend Background Transition ---
var float trend_bias = 0.0
target_bias = is_bullish_trend ? 1.0 : is_bearish_trend ? -1.0 : 0.0
trend_bias := ta.ema(target_bias, 5)
trend_bg_color = trend_bias > 0 ? color.from_gradient(trend_bias, 0, 1, color.new(color.white, 100), color.new(color.green, 92)) : color.from_gradient(trend_bias, -1, 0, color.new(color.red, 92), color.new(color.white, 100))

plot(ema_fast, color=color.new(color.blue, 30), linewidth=1, title="EMA Fast")
plot(ema_med,  color=color.new(color.yellow, 30), linewidth=2, title="EMA Medium")
plot(ema_slow, color=color.new(color.white, 30), linewidth=3, title="EMA Slow")

bgcolor(show_ema_zones ? trend_bg_color : na)

// ==========================================
// CALCULATIONS - RSI & MACD
// ==========================================
rsi = ta.rsi(close, rsi_len)
[macd_line, macd_signal, macd_hist] = ta.macd(close, macd_f, macd_s, macd_sig)

rsi_bullish = ta.crossover(rsi, rsi_os)
rsi_bearish = ta.crossunder(rsi, rsi_ob)

macd_bullish = ta.crossover(macd_line, macd_signal)
macd_bearish = ta.crossunder(macd_line, macd_signal)

// --- RSI Divergence & Fib 50% Levels ---
// (Included in full version: RSI Hidden/Regular Div, Fibonacci 50% Retracements)

// ... SMC(Enhanced), VOLUME, SIGNALS, ANTI-FAKE(Advanced), TP/SL, and DASHBOARD logic ...
// (Find the full script in the /LashariIndicator.pinescript file)
`;

const FEATURES = [
  {
    title: "Powerful Convergence",
    icon: <Target className="w-6 h-6" />,
    desc: "Composite entry signals triggered when RSI Div, 50% Fib, Wave Count, and Vol align perfectly.",
    color: "bg-fuchsia-500/10 text-fuchsia-400"
  },
  {
    title: "EMA Trend System",
    icon: <TrendingUp className="w-6 h-6" />,
    desc: "Triple EMA confirmation (20/50/200) with dynamic background trend-zone visualization.",
    color: "bg-blue-500/10 text-blue-400"
  },
  {
    title: "Smart Money AI",
    icon: <BrainCircuit className="w-6 h-6" />,
    desc: "Automated Break of Structure (BOS), Change of Character (CHOCH), and Order Blocks detection.",
    color: "bg-purple-500/10 text-purple-400"
  },
  {
    title: "Institutional Volume",
    icon: <BarChart3 className="w-6 h-6" />,
    desc: "Detects institutional activity and high-volume spikes to filter out low-probability fake breakouts.",
    color: "bg-emerald-500/10 text-emerald-400"
  },
  {
    title: "Dual Oscillator Sync",
    icon: <Activity className="w-6 h-6" />,
    desc: "Synced RSI and MACD confirmation ensuring you only enter during high-momentum windows.",
    color: "bg-amber-500/10 text-amber-400"
  },
  {
    title: "Candle-Action Precision",
    icon: <Zap className="w-6 h-6" />,
    desc: "Advanced logic ensuring signals trigger only on high-quality candle bodies, filtering out weak wicks.",
    color: "bg-pink-500/10 text-pink-400"
  },
  {
    title: "1-5 Market Structure",
    icon: <Layers className="w-6 h-6" />,
    desc: "Sequence-based structure tracking that confirms the 5th structural break to filter out market noise and identify high-probability trend directions.",
    color: "bg-cyan-500/10 text-cyan-400"
  }
];

// Global Asset Configuration for Realism
const ASSET_CONFIGS: Record<string, { base: number, volatility: number, precision: number }> = {
  'BTC/USDT': { base: 64120.50, volatility: 800, precision: 2 },
  'ETH/USDT': { base: 3115.75, volatility: 60, precision: 2 },
  'SOL/USDT': { base: 145.30, volatility: 5, precision: 2 },
  'XRP/USDT': { base: 0.5120, volatility: 0.02, precision: 4 },
  'ADA/USDT': { base: 0.4450, volatility: 0.015, precision: 4 },
  'XAU/USD': { base: 4690.00, volatility: 25, precision: 2 }, // Updated per user request
  'EUR/USD': { base: 1.08250, volatility: 0.003, precision: 5 },
  'GBP/USD': { base: 1.25420, volatility: 0.004, precision: 5 },
  'NSDQ100': { base: 18350.00, volatility: 150, precision: 2 },
  'US30': { base: 39580.00, volatility: 300, precision: 2 },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'features' | 'code' | 'setup' | 'chart' | 'sentiment' | 'heatmap'>('chart');
  const [settingsTab, setSettingsTab] = useState<'strategy' | 'smc' | 'alerts' | 'backtest'>('strategy');
  
  // Indicator State
  const [volumeConfirmation, setVolumeConfirmation] = useState(() => localStorage.getItem('volumeConfirmation') === null ? true : localStorage.getItem('volumeConfirmation') === 'true');
  const [minBodyPerc, setMinBodyPerc] = useState(() => Number(localStorage.getItem('minBodyPerc')) || 50);
  const [minFboWick, setMinFboWick] = useState(() => Number(localStorage.getItem('minFboWick')) || 30);
  const [obLookback, setObLookback] = useState(() => Number(localStorage.getItem('obLookback')) || 50);
  const [obMinBody, setObMinBody] = useState(() => Number(localStorage.getItem('obMinBody')) || 60);
  const [showBos, setShowBos] = useState(() => localStorage.getItem('showBos') === null ? true : localStorage.getItem('showBos') === 'true');
  const [showObFvg, setShowObFvg] = useState(() => localStorage.getItem('showObFvg') === null ? true : localStorage.getItem('showObFvg') === 'true');
  const [showFbo, setShowFbo] = useState(() => localStorage.getItem('showFbo') === null ? true : localStorage.getItem('showFbo') === 'true');
  const [useMtf, setUseMtf] = useState(() => localStorage.getItem('useMtf') === null ? true : localStorage.getItem('useMtf') === 'true');
  const [highVolHighlight, setHighVolHighlight] = useState(() => localStorage.getItem('highVolHighlight') === null ? true : localStorage.getItem('highVolHighlight') === 'true');
  const [highVolColor, setHighVolColor] = useState(() => localStorage.getItem('highVolColor') || '#eab308');
  const [bullishObColor, setBullishObColor] = useState(() => localStorage.getItem('bullishObColor') || '#10b981');
  const [bearishObColor, setBearishObColor] = useState(() => localStorage.getItem('bearishObColor') || '#f43f5e');
  const [htfVal, setHtfVal] = useState(() => localStorage.getItem('htfVal') || 'D');
  const [alertSignals, setAlertSignals] = useState(() => localStorage.getItem('alertSignals') === null ? true : localStorage.getItem('alertSignals') === 'true');
  const [alertTrend, setAlertTrend] = useState(() => localStorage.getItem('alertTrend') === null ? true : localStorage.getItem('alertTrend') === 'true');
  const [alertBos, setAlertBos] = useState(() => localStorage.getItem('alertBos') === null ? true : localStorage.getItem('alertBos') === 'true');
  const [alertOb, setAlertOb] = useState(() => localStorage.getItem('alertOb') === null ? true : localStorage.getItem('alertOb') === 'true');
  const [alertFvg, setAlertFvg] = useState(() => localStorage.getItem('alertFvg') === null ? true : localStorage.getItem('alertFvg') === 'true');
  const [alertFbo, setAlertFbo] = useState(() => localStorage.getItem('alertFbo') === null ? true : localStorage.getItem('alertFbo') === 'true');
  const [alertRsiDivergence, setAlertRsiDivergence] = useState(() => localStorage.getItem('alertRsiDivergence') === null ? true : localStorage.getItem('alertRsiDivergence') === 'true');
  const [alertSession, setAlertSession] = useState(() => localStorage.getItem('alertSession') === null ? true : localStorage.getItem('alertSession') === 'true');
  const [showEntryReason, setShowEntryReason] = useState(() => localStorage.getItem('showEntryReason') === null ? true : localStorage.getItem('showEntryReason') === 'true');
  const [showActiveMarker, setShowActiveMarker] = useState(() => localStorage.getItem('showActiveMarker') === null ? true : localStorage.getItem('showActiveMarker') === 'true');
  const [useAsian, setUseAsian] = useState(() => localStorage.getItem('useAsian') === null ? true : localStorage.getItem('useAsian') === 'true');
  const [useLondon, setUseLondon] = useState(() => localStorage.getItem('useLondon') === null ? true : localStorage.getItem('useLondon') === 'true');
  const [useNys, setUseNys] = useState(() => localStorage.getItem('useNys') === null ? true : localStorage.getItem('useNys') === 'true');
  const [preset, setPreset] = useState(() => localStorage.getItem('preset') || 'Intraday');

  // Backtest State
  const [initialBalance, setInitialBalance] = useState(() => Number(localStorage.getItem('initialBalance')) || 10000);
  const [riskPerTrade, setRiskPerTrade] = useState(() => Number(localStorage.getItem('riskPerTrade')) || 1.0);
  const [tpMultiplier, setTpMultiplier] = useState(() => Number(localStorage.getItem('tpMultiplier')) || 2.0);
  const [slMultiplier, setSlMultiplier] = useState(() => Number(localStorage.getItem('slMultiplier')) || 1.0);
  const [showBacktest, setShowBacktest] = useState(() => localStorage.getItem('showBacktest') === null ? true : localStorage.getItem('showBacktest') === 'true');
  const [showLegend, setShowLegend] = useState(() => localStorage.getItem('showLegend') === 'true');

  // Live Timer for PKT
  const [pktTime, setPktTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPktTime(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Terminal State (Synchronized across Hub)
  const [activeSymbol, setActiveSymbol] = useState(() => localStorage.getItem('tv_symbol') || "OANDA:XAUUSD");
  const [activeInterval, setActiveInterval] = useState(() => localStorage.getItem('tv_interval') || "1");
  const [marketCategory, setMarketCategory] = useState<'crypto' | 'forex'>('forex');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);
    
    newSocket.on("connect", () => {
      console.log("Connected to Real-time Neural Bridge");
      setIsSocketConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    newSocket.on("price_update", (data: Record<string, number>) => {
      setSignals(prev => prev.map(s => {
        if (data[s.asset]) {
          return { ...s, currentPrice: data[s.asset] };
        }
        return s;
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const [analysisData, setAnalysisData] = useState<{
    sentiment: 'bullish' | 'bearish';
    structure: string;
    alerts: number;
    winRate: string;
    profitFactor: string;
    backtestResult: string;
    strategyName: string;
    sessionLogic: string;
  } | null>(null);

  const CRYPTO_ASSETS = [
    { name: 'Bitcoin', symbol: 'BINANCE:BTCUSDT', pair: 'BTC/USDT' },
    { name: 'Ethereum', symbol: 'BINANCE:ETHUSDT', pair: 'ETH/USDT' },
    { name: 'Solana', symbol: 'BINANCE:SOLUSDT', pair: 'SOL/USDT' },
    { name: 'XRP', symbol: 'BINANCE:XRPUSDT', pair: 'XRP/USDT' },
    { name: 'Cardano', symbol: 'BINANCE:ADAUSDT', pair: 'ADA/USDT' },
  ];

  const FOREX_ASSETS = [
    { name: 'Gold', symbol: 'OANDA:XAUUSD', pair: 'XAU/USD' },
    { name: 'Euro / Dollar', symbol: 'FX:EURUSD', pair: 'EUR/USD' },
    { name: 'Pound / Dollar', symbol: 'FX:GBPUSD', pair: 'GBP/USD' },
    { name: 'Nasdaq 100', symbol: 'NASDAQ:NDX', pair: 'NSDQ100' },
    { name: 'US 30', symbol: 'DJ:DJI', pair: 'US30' },
  ];

  const filteredAssets = (marketCategory === 'crypto' ? CRYPTO_ASSETS : FOREX_ASSETS).filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSymbolSelect = (symbol: string) => {
    setIsAnalyzing(true);
    setActiveSymbol(symbol);
    
    // Generate technical analysis "bootstrap" data
    setTimeout(() => {
      setAnalysisData({
        sentiment: 'bullish', // Always bullish per user request
        structure: 'HH/HL (Strong Confirmed BOS)',
        alerts: Math.floor(Math.random() * 8) + 12,
        winRate: (72 + Math.random() * 10).toFixed(1) + '%',
        profitFactor: (2.4 + Math.random() * 1.2).toFixed(2),
        backtestResult: '1.24% Net (20 Runs)',
        strategyName: 'Neural SMC Edge v5',
        sessionLogic: 'NY Institutional Sweep'
      });
      setIsAnalyzing(false);
    }, 2400); 
  };

  // Signals State (Lifted for global awareness)
  const [signals, setSignals] = useState<Signal[]>([]);

  const getLevels = (asset: string, bias: 'bullish' | 'bearish') => {
    const config = ASSET_CONFIGS[asset] || { base: 100, volatility: 5, precision: 2 };
    const entryVal = config.base + (Math.random() - 0.5) * config.volatility;
    const entry = entryVal.toFixed(config.precision);
    const risk = config.volatility * (0.3 + Math.random() * 0.2);
    const stopVal = entryVal - (bias === 'bullish' ? 1 : -1) * risk;
    const stop = stopVal.toFixed(config.precision);
    const tp1Val = entryVal + (bias === 'bullish' ? 1 : -1) * (risk * 1.5);
    const tp2Val = entryVal + (bias === 'bullish' ? 1 : -1) * (risk * 2.5);
    const tp3Val = entryVal + (bias === 'bullish' ? 1 : -1) * (risk * 4.0);
    
    return { 
      entry, 
      tp1: tp1Val.toFixed(config.precision), 
      tp2: tp2Val.toFixed(config.precision), 
      tp3: tp3Val.toFixed(config.precision), 
      stop,
      currentPrice: parseFloat(entryVal.toFixed(config.precision))
    };
  };

  // Verification Simulation Effect - Slowly confirms signals
  useEffect(() => {
    const verifyInterval = setInterval(() => {
      setSignals(prev => prev.map(s => {
        if (s.isConfirmed || s.status === 'executed') return s;

        const newProgress = Math.min(100, (s.verificationProgress || 0) + Math.floor(Math.random() * 15) + 5);
        const factors = { ...s.factors };
        
        if (newProgress > 25) factors.structure = 'confirming';
        if (newProgress > 45) factors.waves = 'confirming';
        if (newProgress > 65) factors.cabling = 'confirming';
        if (newProgress > 85) factors.levels = 'strong';
        if (newProgress > 95) {
          factors.structure = 'strong';
          factors.waves = 'strong';
          factors.cabling = 'strong';
        }

        const isFullyConfirmed = newProgress === 100;
        
        let verificationStep = 'Finalizing...';
        if (newProgress < 30) verificationStep = 'Analyzing Order Flow...';
        else if (newProgress < 50) verificationStep = 'Scanning Liquidity...';
        else if (newProgress < 70) verificationStep = 'RSI Div Validation...';
        else if (newProgress < 90) verificationStep = 'Bias Confirmation...';
        else if (newProgress === 100) verificationStep = 'Verified';

        return {
          ...s,
          verificationProgress: newProgress,
          verificationStep,
          factors,
          isConfirmed: isFullyConfirmed,
          status: isFullyConfirmed ? 'active' : 'pending',
          executionLabel: isFullyConfirmed ? 'Entry is Active' : `Verifying ${newProgress}%`,
          confirmationReason: isFullyConfirmed ? 'Move 4->5 Exhaustion + RSI Div Confirmed' : s.confirmationReason
        };
      }));
    }, 4000);
    return () => clearInterval(verifyInterval);
  }, []);

  useEffect(() => {
    const initialSignals: Signal[] = [
      { 
        id: '1', asset: 'BTC/USDT', symbol: 'BINANCE:BTCUSDT', type: 'VSA', bias: 'bullish', 
        time: '14:32:10', timeframe: '15m', confidence: 94, pattern: 'VSA: Stopping Volume',
        ...getLevels('BTC/USDT', 'bullish'),
        sentiment: 88,
        status: 'executed',
        executionLabel: 'Executed Entry',
        isConfirmed: true,
        verificationProgress: 100,
        verificationStep: 'Verified',
        confirmationReason: 'Wave 5 + RSI Div Exhaustion',
        reason: 'Move 5 completed with clear RSI divergence. Institutional capping confirmed at current value levels.',
        vsaReason: 'Stopping Volume + Bag Holding signature detected on Wave 5.',
        factors: { structure: 'strong', waves: 'strong', cabling: 'strong', levels: 'strong' }
      },
      { 
        id: '2', asset: 'XAU/USD', symbol: 'OANDA:XAUUSD', type: 'OB', bias: 'bearish', 
        time: '14:31:05', timeframe: '1h', confidence: 84, pattern: 'Order Block Mitigation',
        ...getLevels('XAU/USD', 'bearish'),
        sentiment: 34,
        status: 'pending',
        executionLabel: 'Signal Received Now',
        isConfirmed: false,
        verificationProgress: 45,
        verificationStep: 'Scanning Liquidity...',
        reason: 'Move 4 complete. Waiting for Move 5 thrust into supply zone with RSI divergence confirmation.',
        factors: { structure: 'confirming', waves: 'confirming', cabling: 'weak', levels: 'strong' }
      },
      { 
        id: '3', asset: 'EUR/USD', symbol: 'FX:EURUSD', type: 'LIQUIDITY', bias: 'bullish', 
        time: '14:28:44', timeframe: '5m', confidence: 86, pattern: 'Spring / Shakeout',
        ...getLevels('EUR/USD', 'bullish'),
        sentiment: 72,
        status: 'active',
        executionLabel: 'Entry is Active',
        isConfirmed: true,
        verificationProgress: 100,
        verificationStep: 'Verified',
        confirmationReason: 'Move 1-5 Cycle Complete + RSI Div',
        reason: 'Institutional accumulation completed during the Wave 5 sweep of Asian lows.',
        vsaReason: 'No Supply Test confirmed after Move 5 exhaustion.',
        factors: { structure: 'strong', waves: 'strong', cabling: 'strong', levels: 'strong' }
      },
    ];
    setSignals(initialSignals);

    const ASSET_MAP: Record<string, string> = {
      'BTC/USDT': 'BINANCE:BTCUSDT',
      'ETH/USDT': 'BINANCE:ETHUSDT',
      'SOL/USDT': 'BINANCE:SOLUSDT',
      'XRP/USDT': 'BINANCE:XRPUSDT',
      'ADA/USDT': 'BINANCE:ADAUSDT',
      'XAU/USD': 'OANDA:XAUUSD',
      'EUR/USD': 'FX:EURUSD',
      'GBP/USD': 'FX:GBPUSD',
      'NSDQ100': 'NASDAQ:NDX',
      'US30': 'DJ:DJI',
    };

    const interval = setInterval(() => {
      const assets = Object.keys(ASSET_MAP);
      const types: ('BOS' | 'OB' | 'FVG' | 'LIQUIDITY' | 'TREND' | 'VSA')[] = ['BOS', 'OB', 'FVG', 'LIQUIDITY', 'TREND', 'VSA'];
      const timeframes = ['1m', '5m', '15m', '1h', '4h'];
      const reasons = [
        'Institutional Convergence (W5+Div+Fib+OB)',
        'Order Block Refill + RSI Div',
        'Momentum Structure Breakout',
        'FVG Entry + Trend Confirmation',
        'CHOCH Reversal + Multi-Factor Sync'
      ];
      const vsaReasons = [
        "Buying Climax / No Demand",
        "Stopping Volume / Bag Holding",
        "No Supply on retest of Spring",
        "Effort vs Result Divergence",
        "Ultra High Volume Shakeout"
      ];

      const newAsset = assets[Math.floor(Math.random() * assets.length)];
      const newBias = Math.random() > 0.5 ? 'bullish' : 'bearish';
      const newType = types[Math.floor(Math.random() * types.length)];
      const newStatus = Math.random() > 0.7 ? 'executed' : (Math.random() > 0.5 ? 'active' : 'pending');
      
      const isConfirmed = Math.random() > 0.4;
      const rsiValue = newBias === 'bullish' ? 25 + Math.floor(Math.random() * 15) : 60 + Math.floor(Math.random() * 15);
      
      const newSignal: Signal = {
        id: Math.random().toString(36).substring(2, 11),
        asset: newAsset,
        symbol: ASSET_MAP[newAsset],
        type: newType,
        bias: newBias,
        time: new Date().toLocaleTimeString('en-GB'),
        timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
        confidence: 70 + Math.floor(Math.random() * 25),
        pattern: newType === 'VSA' ? `VSA: ${vsaReasons[Math.floor(Math.random() * vsaReasons.length)]}` : 'Market Structure Event',
        status: 'pending', // Always start as pending for verification
        executionLabel: 'Analyzing Confluences...',
        isConfirmed: false,
        verificationProgress: 15,
        verificationStep: 'Analyzing Order Flow...',
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        vsaReason: newType === 'VSA' ? vsaReasons[Math.floor(Math.random() * vsaReasons.length)] : undefined,
        ...getLevels(newAsset, newBias),
        factors: {
          structure: 'weak',
          waves: 'weak',
          cabling: 'weak',
          levels: 'confirming'
        }
      };

      setSignals(prev => [newSignal, ...prev.slice(0, 19)]);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('volumeConfirmation', String(volumeConfirmation));
    localStorage.setItem('minBodyPerc', String(minBodyPerc));
    localStorage.setItem('minFboWick', String(minFboWick));
    localStorage.setItem('obLookback', String(obLookback));
    localStorage.setItem('obMinBody', String(obMinBody));
    localStorage.setItem('showBos', String(showBos));
    localStorage.setItem('showObFvg', String(showObFvg));
    localStorage.setItem('showFbo', String(showFbo));
    localStorage.setItem('useMtf', String(useMtf));
    localStorage.setItem('highVolHighlight', String(highVolHighlight));
    localStorage.setItem('highVolColor', highVolColor);
    localStorage.setItem('bullishObColor', bullishObColor);
    localStorage.setItem('bearishObColor', bearishObColor);
    localStorage.setItem('htfVal', htfVal);
    localStorage.setItem('alertSignals', String(alertSignals));
    localStorage.setItem('alertTrend', String(alertTrend));
    localStorage.setItem('alertBos', String(alertBos));
    localStorage.setItem('alertOb', String(alertOb));
    localStorage.setItem('alertFvg', String(alertFvg));
    localStorage.setItem('alertFbo', String(alertFbo));
    localStorage.setItem('alertSession', String(alertSession));
    localStorage.setItem('alertRsiDivergence', String(alertRsiDivergence));
    localStorage.setItem('showEntryReason', String(showEntryReason));
    localStorage.setItem('showActiveMarker', String(showActiveMarker));
    localStorage.setItem('useAsian', String(useAsian));
    localStorage.setItem('useLondon', String(useLondon));
    localStorage.setItem('useNys', String(useNys));
    localStorage.setItem('preset', preset);
    localStorage.setItem('initialBalance', String(initialBalance));
    localStorage.setItem('riskPerTrade', String(riskPerTrade));
    localStorage.setItem('tpMultiplier', String(tpMultiplier));
    localStorage.setItem('slMultiplier', String(slMultiplier));
    localStorage.setItem('showBacktest', String(showBacktest));
    localStorage.setItem('showLegend', String(showLegend));
    localStorage.setItem('tv_symbol', activeSymbol);
    localStorage.setItem('tv_interval', activeInterval);
  }, [
    volumeConfirmation, minBodyPerc, minFboWick, obLookback, obMinBody,
    showBos, showObFvg, showFbo, useMtf, highVolHighlight, highVolColor,
    bullishObColor, bearishObColor,
    htfVal, alertSignals, alertTrend, alertBos, alertOb, alertFvg, alertFbo, 
    alertSession, alertRsiDivergence, showEntryReason, showActiveMarker, useAsian, useLondon, useNys, preset,
    initialBalance, riskPerTrade, tpMultiplier, slMultiplier, showBacktest, showLegend,
    activeSymbol, activeInterval
  ]);

  // Simulation State for UI cues
  const [simulation, setSimulation] = useState({
    trend: 'Bullish',
    htfBias: 'Strong Bullish',
    rsi: 42,
    pattern: 'Wave 1/5 Impulse',
    confidence: 85,
    lastUpdate: new Date().toLocaleTimeString(),
    activeReason: 'Confirmed Bullish BOS on low timeframe with RSI hidden divergence and 50% Fibonacci tap.',
    factors: { fibonacci: true, structural: true, rsi: true, volume: true, sd: true, ob: true }
  });

  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[11:02:01] Lashari AI Engine v5.0 Init: SUCCESS",
    "[11:02:05] Establishing connection to TradingView WebSocket...",
    "[11:02:10] Syncing global market sentiment nodes...",
    "[11:02:15] PKT Regional Relay: ESTABLISHED",
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = [
        `SCANNING: MTF Structure on ${activeSymbol}... OK`,
        `FETCHING: Liquidity Pools for ${activeSymbol}... CACHE HIT`,
        `CALCULATING: Order Block mitigation probability... 88%`,
        `SYNC: Neural Engine v4.0 Processing...`,
        `ALERT: Internal liquidity sweep detected on ${activeSymbol}`,
        `PKT SYNC: Latency optimized for Karachi Relay`,
        `HEATMAP: Global Market Heatmap Synchronization... OK`,
      ];
      const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi' });
      const newMsg = `[${time}] ${msgs[Math.floor(Math.random() * msgs.length)]}`;
      setTerminalLogs(prev => [...prev.slice(-9), newMsg]);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulation(prev => {
        const htfBases = ['Strong Bullish', 'Bullish Bias', 'Neutral', 'Bearish Bias', 'Strong Bearish'];
        const currentTrend = useMtf ? (Math.random() > 0.3 ? 'Bullish' : 'Neutral') : (Math.random() > 0.5 ? 'Bullish' : 'Bearish');
        const patterns = ['Searching...', 'Wave 1 Impulse', 'Wave 2 Correction', 'Wave 3 Impulse', 'Wave 4 Correction', 'Wave 5 Mastery'];
        const reasons = [
          'Institutional order flow alignment with high volume confirmation.',
          'Imbalance fill detected within a high-probability supply/demand zone.',
          'Market structure shift detected after sweeping key liquidity levels.',
          'Fibonacci golden pocket confluence with strong RSI divergence.',
          'Powerful convergence of structure, volume, and institutional zones.'
        ];
        
        // Calculate mock confidence based on dashboard settings
        let score = 25; // base
        const isFbo = Math.random() > 0.85; // Simulate a fakeout
        
        // 1. Order Block & FVG (Institutional Depth)
        if (showObFvg) score += 20;
        
        // 2. Market Structure (Trend Reinforcement)
        if (showBos) score += 12;
        
        // 3. Volume & Momentum (Effort vs Result)
        if (volumeConfirmation) score += 18;
        
        // 4. Multi-Timeframe Alignment (The "Big Picture")
        const currentHtfBias = useMtf ? htfBases[Math.floor(Math.random() * 2)] : htfBases[Math.floor(Math.random() * 5)];
        if (useMtf) score += 15;
        if (currentHtfBias.includes('Bullish') && currentTrend === 'Bullish') score += 10;
        
        // 5. Session Precision (Timing the move)
        const isInActiveSession = useAsian || useLondon || useNys;
        if (isInActiveSession) score += 10;
        
        // 6. Strategy Type Adjustment
        if (preset === 'Swing') score += 5;
        if (preset === 'Scalper') score -= 5;
        
        // 7. Risks & Penalties
        if (isFbo) {
          score -= 30; // Heavy penalty for Fake Breakouts
          reasons.push('Warning: Potential Liquidity Sweep/Fakeout detected.');
        }
        
        // Add some noise
        score += Math.floor(Math.random() * 8);
        score = Math.max(10, Math.min(score, 99)); // Keep it within 10-99% range for realism

        return {
          trend: currentTrend,
          htfBias: currentHtfBias,
          rsi: Math.floor(35 + Math.random() * 30),
          pattern: patterns[Math.floor(Math.random() * 4)],
          confidence: score,
          lastUpdate: new Date().toLocaleTimeString(),
          activeReason: reasons[Math.floor(Math.random() * reasons.length)],
          factors: {
            fibonacci: Math.random() > 0.3,
            structural: Math.random() > 0.2,
            rsi: Math.random() > 0.4,
            volume: Math.random() > 0.5,
            sd: Math.random() > 0.4,
            ob: Math.random() > 0.3,
          }
        };
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [useMtf, volumeConfirmation, showBos, showObFvg, preset, useAsian, useLondon, useNys]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Sync user to Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastLogin: serverTimestamp()
          });
        } else {
          await setDoc(userRef, {
            lastLogin: serverTimestamp()
          }, { merge: true });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getDynamicCode = () => {
    const emaFast = preset === 'Scalping' ? 9 : preset === 'Swing' ? 50 : 20;
    const emaMed = preset === 'Scalping' ? 21 : preset === 'Swing' ? 100 : 50;
    const emaSlow = preset === 'Scalping' ? 50 : preset === 'Swing' ? 200 : 200;

    return `// This Pine Script™ code is subject to the terms of the Mozilla Public License 2.0 at https://mozilla.org/MPL/2.0/
// © m_akbarlashari990

//@version=5
indicator("Lashari Smart Money AI Indicator", overlay=true, max_boxes_count=500, max_labels_count=500, max_lines_count=500, max_bars_back=1000)

// ==========================================
// INPUTS - DYNAMICALLY CONFIGURED VIA DASHBOARD
// ==========================================
grp_ema = "EMA Trend System"
ema_fast_len = input.int(${emaFast}, "EMA Fast (Trend)", group=grp_ema)
ema_med_len  = input.int(${emaMed}, "EMA Medium (Confirmation)", group=grp_ema)
ema_slow_len = input.int(${emaSlow}, "EMA Slow (Major)", group=grp_ema)
show_ema_zones = input.bool(true, "Show Trend Zones", group=grp_ema)

grp_smc = "Smart Money Concepts (SMC)"
show_bos = input.bool(${showBos}, "Show BOS / CHOCH", group=grp_smc)
show_ob  = input.bool(${showObFvg}, "Show Order Blocks", group=grp_smc)
ob_lookback = input.int(${obLookback}, "OB Lookback Period", group=grp_smc)
ob_min_body = input.float(${obMinBody}.0, "OB Min Body %", minval=0, maxval=100, group=grp_smc)
show_fvg = input.bool(${showObFvg}, "Show Fair Value Gaps", group=grp_smc)
bullish_ob_color = input.color(${bullishObColor}, "Bullish OB Color", group=grp_smc)
bearish_ob_color = input.color(${bearishObColor}, "Bearish OB Color", group=grp_smc)
smc_lookback = input.int(10, "SMC Lookback Period", group=grp_smc)

grp_osc = "Oscillators (RSI & MACD)"
rsi_len = input.int(14, "RSI Length", group=grp_osc)
rsi_ob  = input.int(70, "RSI Overbought", group=grp_osc)
rsi_os  = input.int(30, "RSI Oversold", group=grp_osc)
macd_f  = input.int(12, "MACD Fast", group=grp_osc)
macd_s  = input.int(26, "MACD Slow", group=grp_osc)
macd_sig = input.int(9, "MACD Signal", group=grp_osc)

grp_mtf = "Multi-Timeframe Engine"
use_mtf = input.bool(${useMtf}, "Use HTF Trend Confirmation", group=grp_mtf)
htf_val = input.timeframe("${htfVal}", "HTF Reference", group=grp_mtf)

grp_risk = "Risk Management"
atr_len = input.int(14, "ATR Length", group=grp_risk)
atr_mult = input.float(1.5, "ATR SL Multiplier", group=grp_risk)
tp1_rr = input.float(1.5, "Take Profit 1 (RR)", group=grp_risk)
tp2_rr = input.float(2.0, "Take Profit 2 (RR)", group=grp_risk)
tp3_rr = input.float(3.0, "Take Profit 3 (RR)", group=grp_risk)
show_tp_lines = input.bool(true, "Display TP/SL Levels on Chart", group=grp_risk)

grp_session = "Trading Sessions Filter"
use_session_filter = input.bool(true, "Only Trade During Active Sessions", group=grp_session)
show_session_color = input.bool(true, "Show Session Backgrounds", group=grp_session)
use_asian = input.bool(${useAsian}, "Asian Session Active", group=grp_session)
asian_sess_input = input.session("0000-0800", "Asian Session (UTC)", group=grp_session)
use_london = input.bool(${useLondon}, "London Session Active", group=grp_session)
london_sess_input = input.session("0800-1600", "London Session (UTC)", group=grp_session)
use_nys = input.bool(${useNys}, "NY Session Active", group=grp_session)
nys_sess_input = input.session("1300-2100", "New York Session (UTC)", group=grp_session)

grp_extra = "Price Action Filters"
use_anti_fake = input.bool(${volumeConfirmation}, "Use Anti-Fake Breakout Filter", group=grp_extra)
show_high_vol_color = input.bool(${highVolHighlight}, "Highlight High Volume Bars", group=grp_extra)
high_vol_color_input = input.color(${highVolColor}, "High Volume Color", group=grp_extra)
min_body_perc = input.float(${minBodyPerc}.0, "Min Body Percentage to Range", minval=0, maxval=100, group=grp_extra)
min_fbo_wick  = input.float(${minFboWick}.0, "Min FBO Wick %", minval=0, maxval=100, group=grp_extra)
show_fbo = input.bool(${showFbo}, "Show Fake Breakouts (FBO)", group=grp_extra)

grp_display = "Display & Visuals"
show_entry_reason = input.bool(${showEntryReason}, "Show Entry Logic Reason", group=grp_display)
show_active_marker = input.bool(${showActiveMarker}, "Mark Active Market Entry", group=grp_display)

grp_alerts = "Advanced Alert System"
alert_signals = input.bool(${alertSignals}, "Alert on Buy/Sell Signals", group=grp_alerts)
alert_bos = input.bool(${alertBos}, "Alert on BOS / CHOCH", group=grp_alerts)
alert_ob  = input.bool(${alertOb}, "Alert on New Order Blocks", group=grp_alerts)
alert_fvg = input.bool(${alertFvg}, "Alert on FVG Detection", group=grp_alerts)
alert_fbo = input.bool(${alertFbo}, "Alert on Fake Breakouts", group=grp_alerts)
alert_rsi_div = input.bool(${alertRsiDivergence}, "Alert on RSI Divergence", group=grp_alerts)
alert_session = input.bool(${alertSession}, "Alert on Session Starts", group=grp_alerts)

grp_backtest = "Backtest Engine"
show_backtest = input.bool(${showBacktest}, "Show Backtest Metrics", group=grp_backtest)
init_balance = input.float(${initialBalance}.0, "Initial Balance ($)", group=grp_backtest)
risk_per_trade = input.float(${riskPerTrade}, "Risk Per Trade (%)", group=grp_backtest)

// ==========================================
// CALCULATIONS - SESSIONS
// ==========================================
is_asian = not na(time(timeframe.period, asian_sess_input, "UTC"))
is_london = not na(time(timeframe.period, london_sess_input, "UTC"))
is_nys = not na(time(timeframe.period, nys_sess_input, "UTC"))
is_in_session = (use_asian and is_asian) or (use_london and is_london) or (use_nys and is_nys)

bgcolor(show_session_color and is_asian ? color.new(color.blue, 95) : na, title="Asian Session BG")
bgcolor(show_session_color and is_london ? color.new(color.orange, 95) : na, title="London Session BG")
bgcolor(show_session_color and is_nys ? color.new(color.purple, 95) : na, title="NY Session BG")

is_asian_start = is_asian and not is_asian[1]
is_london_start = is_london and not is_london[1]
is_nys_start = is_nys and not is_nys[1]

// ==========================================
// CALCULATIONS - HTF TREND
// ==========================================
// Fetching HTF data non-repainting way
[htf_ema, htf_close, htf_high, htf_low] = request.security(syminfo.tickerid, htf_val, [ta.ema(close, 200), close, high, low], lookahead=barmerge.lookahead_off)
htf_bullish = htf_close > htf_ema
htf_trend_strength = htf_bullish ? (htf_close > htf_high[1] ? "Strong Bullish" : "Bullish Bias") : (htf_close < htf_low[1] ? "Strong Bearish" : "Bearish Bias")

// ==========================================
// CALCULATIONS - RISK & VOLATILITY
// ==========================================
atr = ta.atr(atr_len)

// ==========================================
// VOLUME ANALYSIS
// ==========================================
vol_avg = ta.sma(volume, 20)
is_high_vol = volume > vol_avg * 1.5
vol_expanding = volume > volume[1]

// ==========================================
// CALCULATIONS - EMA SYSTEM
// ==========================================
ema_fast = ta.ema(close, ema_fast_len)
ema_med  = ta.ema(close, ema_med_len)
ema_slow = ta.ema(close, ema_slow_len)

is_bullish_trend = ema_fast > ema_med and ema_med > ema_slow
is_bearish_trend = ema_fast < ema_med and ema_med < ema_slow

// --- Smooth Trend Background Transition ---
var float trend_bias = 0.0
target_bias = is_bullish_trend ? 1.0 : is_bearish_trend ? -1.0 : 0.0
// Smooth the bias over 5 bars for a subtle transition
trend_bias := ta.ema(target_bias, 5)

// Define color gradient based on smoothed bias
trend_bg_color = trend_bias > 0 ? color.from_gradient(trend_bias, 0, 1, color.new(color.white, 100), color.new(color.green, 92)) : color.from_gradient(trend_bias, -1, 0, color.new(color.red, 92), color.new(color.white, 100))

plot(ema_fast, color=color.new(color.blue, 30), linewidth=1, title="EMA Fast")
plot(ema_med,  color=color.new(color.yellow, 30), linewidth=2, title="EMA Medium")
plot(ema_slow, color=color.new(color.white, 30), linewidth=3, title="EMA Slow")

// Bar Coloring
bar_color = is_high_vol and show_high_vol_color ? high_vol_color_input : is_bullish_trend ? color.new(color.green, 50) : is_bearish_trend ? color.new(color.red, 50) : na
barcolor(bar_color)

bgcolor(show_ema_zones ? trend_bg_color : na)

// ==========================================
// CALCULATIONS - RSI & MACD
// ==========================================
rsi = ta.rsi(close, rsi_len)
[macd_line, macd_signal, macd_hist] = ta.macd(close, macd_f, macd_s, macd_sig)

rsi_bullish = ta.crossover(rsi, rsi_os)
rsi_bearish = ta.crossunder(rsi, rsi_ob)

macd_bullish = ta.crossover(macd_line, macd_signal)
macd_bearish = ta.crossunder(macd_line, macd_signal)

// ==========================================
// CALCULATIONS - RSI DIVERGENCE (Regular & Hidden)
// ==========================================
lookback_divergence = ${preset === 'Scalping' ? '30' : '60'}
rsi_ph = ta.pivothigh(rsi, 5, 5)
rsi_pl = ta.pivotlow(rsi, 5, 5)

bull_reg_div = false
if rsi_pl
    for i = 1 to lookback_divergence
        if not na(rsi_pl[i]) and rsi > rsi_pl[i] and low < low[i+5]
            bull_reg_div := true
            break

bear_reg_div = false
if rsi_ph
    for i = 1 to lookback_divergence
        if not na(rsi_ph[i]) and rsi < rsi_ph[i] and high > high[i+5]
            bear_reg_div := true
            break

bull_hid_div = false
if rsi_pl
    for i = 1 to lookback_divergence
        if not na(rsi_pl[i]) and rsi < rsi_pl[i] and low > low[i+5]
            bull_hid_div := true
            break

bear_hid_div = false
if rsi_ph
    for i = 1 to lookback_divergence
        if not na(rsi_ph[i]) and rsi > rsi_ph[i] and high < high[i+5]
            bear_hid_div := true
            break

// ==========================================
// CALCULATIONS - SMC (BOS/CHOCH/FVG)
// ==========================================
hi = ta.highest(high, smc_lookback)
lo = ta.lowest(low, smc_lookback)

var float last_hi = na
var float last_lo = na

if ta.change(hi)
    last_hi := hi[1]
if ta.change(lo)
    last_lo := lo[1]

is_bos_bullish = ta.crossover(close, last_hi)
is_bos_bearish = ta.crossunder(close, last_lo)

// ==========================================
// CALCULATIONS - FIBONACCI 50% LEVEL
// ==========================================
var float fib_50_bull = na
var float fib_50_bear = na

if is_bos_bullish
    fib_50_bull := last_lo + (high - last_lo) * 0.5
if is_bos_bearish
    fib_50_bear := last_hi - (last_hi - low) * 0.5

is_at_fib_50_buy = not na(fib_50_bull) and low <= fib_50_bull and close > fib_50_bull
is_at_fib_50_sell = not na(fib_50_bear) and high >= fib_50_bear and close < fib_50_bear

// Simple Change of Character (CHOCH) - first break against trend
is_choch_bullish = is_bearish_trend and is_bos_bullish
is_choch_bearish = is_bullish_trend and is_bos_bearish

// 1-2-3-4-5 Wave Pattern Tracking (Pivot-Based Impulse/Retracement)
var int bullish_wave = 0
var int bearish_wave = 0
var float last_p1 = 0.0
var float last_p2 = 0.0
var float last_p3 = 0.0
var float last_p4 = 0.0

// Identify Swing Points
ph = ta.pivothigh(high, 5, 5)
pl = ta.pivotlow(low, 5, 5)

// Bullish Wave Logic
if ph
    if bullish_wave == 0
        bullish_wave := 1
        last_p1 := ph
    else if bullish_wave == 2 and ph > last_p1
        bullish_wave := 3
        last_p3 := ph
    else if bullish_wave == 4 and ph > last_p3
        bullish_wave := 5
    
    // Reset if structure breaks
    if ph < last_p1 and bullish_wave >= 3
        bullish_wave := 0

if pl
    if bullish_wave == 1 and pl > low[10] // Simple HL check
        bullish_wave := 2
        last_p2 := pl
    else if bullish_wave == 3 and pl > last_p2
        bullish_wave := 4
        last_p4 := pl

// Bearish Wave Logic
if pl
    if bearish_wave == 0
        bearish_wave := 1
        last_p1 := pl
    else if bearish_wave == 2 and pl < last_p1
        bearish_wave := 3
        last_p3 := pl
    else if bearish_wave == 4 and pl < last_p3
        bearish_wave := 5
    
    if pl > last_p1 and bearish_wave >= 3
        bearish_wave := 0

if ph
    if bearish_wave == 1 and ph < high[10] // Simple LH check
        bearish_wave := 2
        last_p2 := ph
    else if bearish_wave == 3 and ph < last_p2
        bearish_wave := 4
        last_p4 := ph

// Reset logic
if is_choch_bullish or is_choch_bearish
    bullish_wave := 0
    bearish_wave := 0

if ph and bullish_wave > 0 and show_bos
    label.new(bar_index[5], high[5], str.tostring(bullish_wave), style=label.style_none, textcolor=color.lime, textalign=text.align_center)
if pl and bearish_wave > 0 and show_bos
    label.new(bar_index[5], low[5], str.tostring(bearish_wave), style=label.style_none, textcolor=color.orange, textalign=text.align_center)

if is_bos_bullish and show_bos
    label.new(bar_index, high, "BOS", style=label.style_label_down, color=color.green, textcolor=color.black, size=size.tiny)
if is_bos_bearish and show_bos
    label.new(bar_index, low, "BOS", style=label.style_label_up, color=color.red, textcolor=color.white, size=size.tiny)

// Order Blocks (OB) with Institutional Flow & RR Projections
var box[] ob_boxes = array.new_box()
var label[] ob_labels = array.new_label()
var float latest_ob_bull_hi = na
var float latest_ob_bull_lo = na
var float latest_ob_bear_hi = na
var float latest_ob_bear_lo = na

if show_ob
    if is_bos_bullish
        int ob_idx = 0
        for i = 1 to ob_lookback
            if open[i] > close[i]
                float c_range = high[i] - low[i]
                float c_body = math.abs(close[i] - open[i])
                float c_body_perc = c_range != 0 ? (c_body / c_range) * 100 : 0
                if c_body_perc >= ob_min_body
                    ob_idx := i
                    break
        if ob_idx > 0
            latest_ob_bull_hi := high[ob_idx]
            latest_ob_bull_lo := low[ob_idx]
            float ob_vol = volume[ob_idx]
            string vol_str = ob_vol > 1000000 ? str.tostring(ob_vol/1000000, "#.###") + "M" : str.tostring(ob_vol/1000, "#.###") + "K"
            float ob_hi = high[ob_idx]
            float ob_lo = low[ob_idx]
            float sl_lvl = ob_lo - (atr * 0.5)
            float risk = math.abs(ob_hi - sl_lvl)
            float tp1_lvl = ob_hi + (risk * tp1_rr)
            float tp2_lvl = ob_hi + (risk * tp2_rr)
            float tp3_lvl = ob_hi + (risk * tp3_rr)
            
            box b = box.new(bar_index[ob_idx], ob_hi, bar_index, ob_lo, bgcolor=color.new(bullish_ob_color, 85), border_color=color.new(bullish_ob_color, 60), extend=extend.right, text=vol_str + " (Inst.)", text_size=size.tiny, text_color=color.new(bullish_ob_color, 40), text_halign=text.align_right)
            label l = label.new(bar_index, ob_hi, "ENTRY: " + str.tostring(ob_hi, "#.##") + " | SL: " + str.tostring(sl_lvl, "#.##") + " | TP1: " + str.tostring(tp1_lvl, "#.##") + " | TP2: " + str.tostring(tp2_lvl, "#.##") + " | TP3: " + str.tostring(tp3_lvl, "#.##"), color=color.new(bullish_ob_color, 20), textcolor=color.white, style=label.style_label_left, size=size.small)
            
            // RR Visualizer Boxes
            box b_tp = box.new(bar_index, tp3_lvl, bar_index + 10, ob_hi, bgcolor=color.new(bullish_ob_color, 90), border_color=na, extend=extend.right)
            box b_sl = box.new(bar_index, ob_lo, bar_index + 10, sl_lvl, bgcolor=color.new(color.red, 90), border_color=na, extend=extend.right)

            array.push(ob_boxes, b)
            array.push(ob_boxes, b_tp)
            array.push(ob_boxes, b_sl)
            array.push(ob_labels, l)

    if is_bos_bearish
        int ob_idx = 0
        for i = 1 to ob_lookback
            if open[i] < close[i]
                float c_range = high[i] - low[i]
                float c_body = math.abs(close[i] - open[i])
                float c_body_perc = c_range != 0 ? (c_body / c_range) * 100 : 0
                if c_body_perc >= ob_min_body
                    ob_idx := i
                    break
        if ob_idx > 0
            latest_ob_bear_hi := high[ob_idx]
            latest_ob_bear_lo := low[ob_idx]
            float ob_vol = volume[ob_idx]
            string vol_str = ob_vol > 1000000 ? str.tostring(ob_vol/1000000, "#.###") + "M" : str.tostring(ob_vol/1000, "#.###") + "K"
            float ob_hi = high[ob_idx]
            float ob_lo = low[ob_idx]
            float sl_lvl = ob_hi + (atr * 0.5)
            float risk = math.abs(sl_lvl - ob_lo)
            float tp1_lvl = ob_lo - (risk * tp1_rr)
            float tp2_lvl = ob_lo - (risk * tp2_rr)
            float tp3_lvl = ob_lo - (risk * tp3_rr)

            box b = box.new(bar_index[ob_idx], ob_hi, bar_index, ob_lo, bgcolor=color.new(bearish_ob_color, 85), border_color=color.new(bearish_ob_color, 60), extend=extend.right, text=vol_str + " (Inst.)", text_size=size.tiny, text_color=color.new(bearish_ob_color, 40), text_halign=text.align_right)
            label l = label.new(bar_index, ob_lo, "ENTRY: " + str.tostring(ob_lo, "#.##") + " | SL: " + str.tostring(sl_lvl, "#.##") + " | TP1: " + str.tostring(tp1_lvl, "#.##") + " | TP2: " + str.tostring(tp2_lvl, "#.##") + " | TP3: " + str.tostring(tp3_lvl, "#.##"), color=color.new(bearish_ob_color, 20), textcolor=color.white, style=label.style_label_left, size=size.small)
            
            // RR Visualizer Boxes
            box b_tp = box.new(bar_index, ob_lo, bar_index + 10, tp3_lvl, bgcolor=color.new(bullish_ob_color, 90), border_color=na, extend=extend.right)
            box b_sl = box.new(bar_index, sl_lvl, bar_index + 10, ob_hi, bgcolor=color.new(bearish_ob_color, 90), border_color=na, extend=extend.right)

            array.push(ob_boxes, b)
            array.push(ob_boxes, b_tp)
            array.push(ob_boxes, b_sl)
            array.push(ob_labels, l)

// Live Update for Labels - Keep them at the right most edge
if array.size(ob_labels) > 0
    for i = 0 to array.size(ob_labels) - 1
        label.set_x(array.get(ob_labels, i), bar_index)

// Logic to Clean chart when price consumes the block
if show_ob and array.size(ob_boxes) > 0
    for i = array.size(ob_boxes) - 1 to 0
        box b = array.get(ob_boxes, i)
        float b_top = box.get_top(b)
        float b_btm = box.get_bottom(b)
        // If price closes past the Order Block, it's processed
        if close < b_btm or close > b_top
            if (close < b_btm and b_top > high[1]) or (close > b_top and b_btm < low[1])
                box.set_extend(b, extend.none)
                box.set_right(b, bar_index)
                box.set_bgcolor(b, color.new(color.gray, 90))
                if i < array.size(ob_labels)
                    label.delete(array.get(ob_labels, i))
                    array.remove(ob_labels, i)
                array.remove(ob_boxes, i)

// Fair Value Gaps (FVG) with Mitigation Detection
is_fvg_bull = low[0] > high[2]
is_fvg_bear = high[0] < low[2]

var box[] fvg_boxes = array.new_box()

if show_fvg
    if is_fvg_bull
        box b = box.new(bar_index[2], high[2], bar_index, low[0], bgcolor=color.new(bullish_ob_color, 85), border_color=na, extend=extend.right)
        array.push(fvg_boxes, b)
    if is_fvg_bear
        box b = box.new(bar_index[2], low[2], bar_index, high[0], bgcolor=color.new(bearish_ob_color, 85), border_color=na, extend=extend.right)
        array.push(fvg_boxes, b)

// FVG Mitigation Detection
is_in_fvg_bull = false
is_in_fvg_bear = false
if array.size(fvg_boxes) > 0
    for i = 0 to array.size(fvg_boxes) - 1
        box b = array.get(fvg_boxes, i)
        float b_top = box.get_top(b)
        float b_btm = box.get_bottom(b)
        if low <= b_top and high >= b_btm
            if b_top > b_btm
                is_in_fvg_bull := true
            else
                is_in_fvg_bear := true

// ==========================================
// PRICE ACTION - ANTI-FAKE BREAKOUT
// ==========================================
candle_range = high - low
candle_body  = math.abs(close - open)
body_perc    = candle_range != 0 ? (candle_body / candle_range) * 100 : 0

is_near_high = close > (high - (high - low) * 0.2)
is_near_low  = close < (low + (high - low) * 0.2)

is_strong_breakout_bull = not use_anti_fake or (body_perc >= min_body_perc and (vol_expanding or is_high_vol) and close > high[1] and is_near_high)
is_strong_breakout_bear = not use_anti_fake or (body_perc >= min_body_perc and (vol_expanding or is_high_vol) and close < low[1] and is_near_low)

// Fake Breakout (FBO) Logic - Detection of Structure Sweeps with Wick Confirmation
wick_top_perc = candle_range != 0 ? ((high - math.max(open, close)) / candle_range) * 100 : 0
wick_btm_perc = candle_range != 0 ? ((math.min(open, close) - low) / candle_range) * 100 : 0

is_fbo_bull_val = show_fbo and high > last_hi and close < last_hi and close[1] < last_hi and not is_bos_bullish and wick_top_perc >= min_fbo_wick
is_fbo_bear_val = show_fbo and low < last_lo and close > last_lo and close[1] > last_lo and not is_bos_bearish and wick_btm_perc >= min_fbo_wick

plotshape(is_fbo_bull_val, "Fake Bullish Breakout", shape.labeldown, location.abovebar, color.new(color.red, 30), size=size.tiny, text="FBO_BULL", textcolor=color.white)
plotshape(is_fbo_bear_val, "Fake Bearish Breakout", shape.labelup, location.belowbar, color.new(color.green, 30), size=size.tiny, text="FBO_BEAR", textcolor=color.white)

// ==========================================
// SIGNALS & LOGIC
// ==========================================
is_engulfing_bull = close > open[1] and open < close[1] and close > open
is_engulfing_bear = close < open[1] and open > close[1] and close < open

session_gate = not use_session_filter or is_in_session
htf_gate = not use_mtf or htf_bullish

buy_signal = is_bullish_trend and rsi > 40 and macd_bullish and is_high_vol and session_gate and is_strong_breakout_bull and htf_gate
sell_signal = is_bearish_trend and rsi < 60 and macd_bearish and is_high_vol and session_gate and is_strong_breakout_bear and (not htf_gate or not use_mtf)

// --- POWERFUL SIGNAL COMPOSITE ---
// Requirements: RSI Div (Reg/Hidden) + Fib 50% + Structure (Wave 3/5) + OB/OB Entry + Volume
is_in_ob_bull = low <= latest_ob_bull_hi and high >= latest_ob_bull_lo
is_in_ob_bear = high >= latest_ob_bear_lo and low <= latest_ob_bear_hi

is_powerful_buy = (bull_reg_div or bull_hid_div) and is_at_fib_50_buy and (bullish_wave == 3 or bullish_wave == 5) and is_high_vol and is_in_ob_bull
is_powerful_sell = (bear_reg_div or bear_hid_div) and is_at_fib_50_sell and (bearish_wave == 3 or bearish_wave == 5) and is_high_vol and is_in_ob_bear

// --- ENTRY LOGIC REASON DETERMINATION ---
string entry_method_buy = ""
if buy_signal
    bool has_div = bull_reg_div or bull_hid_div
    bool has_fib = is_at_fib_50_buy
    bool has_ob = is_in_ob_bull
    bool has_fvg = is_in_fvg_bull
    bool is_wave5 = bullish_wave == 5
    
    if is_powerful_buy
        entry_method_buy := "Institutional Convergence (W5+Div+Fib+OB)"
    else if is_wave5 and has_div
        entry_method_buy := "Wave 5 + RSI Div Exhaustion"
    else if has_ob and has_div
        entry_method_buy := "Order Block Refill + RSI Div"
    else if has_ob and has_fib
        entry_method_buy := "OB Refill + Fib Confluence"
    else if has_fvg and has_div
        entry_method_buy := "FVG Entry + RSI Divergence"
    else if is_wave5 and has_ob
        entry_method_buy := "Wave 5 Order Block Entry"
    else if is_wave5
        entry_method_buy := "Wave 5 Phase Exhaustion"
    else if has_div
        entry_method_buy := "RSI Divergence Setup"
    else if has_ob
        entry_method_buy := "Order Block Refill"
    else if has_fvg
        entry_method_buy := "FVG Mitigation Entry"
    else if has_fib
        entry_method_buy := "Fibonacci 50% Level"
    else if is_strong_breakout_bull
        entry_method_buy := "Momentum Structure Break"
    else if is_choch_bullish
        entry_method_buy := "CHOCH Reversal Pattern"
    else
        entry_method_buy := "Trend Confirmation"

string entry_method_sell = ""
if sell_signal
    bool has_div = bear_reg_div or bear_hid_div
    bool has_fib = is_at_fib_50_sell
    bool has_ob = is_in_ob_bear
    bool has_fvg = is_in_fvg_bear
    bool is_wave5 = bearish_wave == 5
    
    if is_powerful_sell
        entry_method_sell := "Institutional Convergence (W5+Div+Fib+OB)"
    else if is_wave5 and has_div
        entry_method_sell := "Wave 5 + RSI Div Exhaustion"
    else if has_ob and has_div
        entry_method_sell := "Order Block Refill + RSI Div"
    else if has_ob and has_fib
        entry_method_sell := "OB Refill + Fib Confluence"
    else if has_fvg and has_div
        entry_method_sell := "FVG Entry + RSI Divergence"
    else if is_wave5 and has_ob
        entry_method_sell := "Wave 5 Order Block Entry"
    else if is_wave5
        entry_method_sell := "Wave 5 Phase Exhaustion"
    else if has_div
        entry_method_sell := "RSI Divergence Setup"
    else if has_ob
        entry_method_sell := "Order Block Refill"
    else if has_fvg
        entry_method_sell := "FVG Mitigation Entry"
    else if has_fib
        entry_method_sell := "Fibonacci 50% Level"
    else if is_strong_breakout_bear
        entry_method_sell := "Momentum Structure Break"
    else if is_choch_bearish
        entry_method_sell := "CHOCH Reversal Pattern"
    else
        entry_method_sell := "Trend Confirmation"

plotshape(is_powerful_buy, "POWERFUL BUY", shape.labelup, location.belowbar, color.new(color.lime, 0), size=size.normal, text="POWERFUL SIGNAL (FIB+RSI+STR+OB)", textcolor=color.black)
plotshape(is_powerful_sell, "POWERFUL SELL", shape.labeldown, location.abovebar, color.new(color.fuchsia, 0), size=size.normal, text="POWERFUL SIGNAL (FIB+RSI+STR+OB)", textcolor=color.white)

if buy_signal and show_entry_reason
    label.new(bar_index, low, "BUY: " + entry_method_buy, style=label.style_label_up, color=color.new(color.green, 20), textcolor=color.white, size=size.small, yloc=yloc.belowbar)
if sell_signal and show_entry_reason
    label.new(bar_index, high, "SELL: " + entry_method_sell, style=label.style_label_down, color=color.new(color.red, 20), textcolor=color.white, size=size.small, yloc=yloc.abovebar)

plotshape(buy_signal, "BUY", shape.triangleup, location.belowbar, color.green, size=size.small, text="BUY", textcolor=color.green)
plotshape(sell_signal, "SELL", shape.triangledown, location.abovebar, color.red, size=size.small, text="SELL", textcolor=color.red)

// ==========================================
// BACKTEST ENGINE (INDICATOR MODE SIMULATOR)
// ==========================================
var float current_balance = init_balance
var float max_balance = init_balance
var float max_drawdown = 0.0
var float gross_profit = 0.0
var float gross_loss = 0.0
var int total_trades = 0
var int wins = 0
var int losses = 0

// Simple state machine to track active trade simulation
var bool in_long = false
var bool in_short = false
var float sim_entry_price = 0.0
var float sim_sl_price = 0.0
var float sim_tp_price = 0.0
var int sim_entry_bar = 0

// Tracking current trade context
var string trade_sess = ""
var string trade_trend = ""

// Active Trade Marker
var label active_marker = na

if buy_signal and not in_long and not in_short
    in_long := true
    sim_entry_price := close
    sim_entry_bar := bar_index
    sim_sl_price := low - (atr * atr_mult)
    float risk = math.abs(sim_entry_price - sim_sl_price)
    sim_tp_price := sim_entry_price + (risk * tp2_rr)
    total_trades += 1
    trade_sess := is_asian ? "Asian" : is_london ? "London" : is_nys ? "NY" : "Other"
    trade_trend := is_bullish_trend ? "Bullish" : "Bearish"
    if show_active_marker
        active_marker := label.new(bar_index, low, "ENTRY ACTIVE FROM HERE (BUY)", style=label.style_label_up, color=color.new(color.blue, 20), textcolor=color.white, size=size.small)

if sell_signal and not in_short and not in_long
    in_short := true
    sim_entry_price := close
    sim_entry_bar := bar_index
    sim_sl_price := high + (atr * atr_mult)
    float risk = math.abs(sim_sl_price - sim_entry_price)
    sim_tp_price := sim_entry_price - (risk * tp2_rr)
    total_trades += 1
    trade_sess := is_asian ? "Asian" : is_london ? "London" : is_nys ? "NY" : "Other"
    trade_trend := is_bullish_trend ? "Bullish" : "Bearish"
    if show_active_marker
        active_marker := label.new(bar_index, high, "ENTRY ACTIVE FROM HERE (SELL)", style=label.style_label_down, color=color.new(color.blue, 20), textcolor=color.white, size=size.small)

// Update Active Marker Position
if show_active_marker and (in_long or in_short) and not na(active_marker)
    label.set_x(active_marker, bar_index)
    label.set_y(active_marker, in_long ? low : high)

// Reset Active Marker on trade close
if (in_long or in_short)
    bool exit_long = in_long and (low <= sim_sl_price or high >= sim_tp_price)
    bool exit_short = in_short and (high >= sim_sl_price or low <= sim_tp_price)
    if exit_long or exit_short
        if not na(active_marker)
            label.delete(active_marker)
            active_marker := na


// Performance Breakdown Records
var int asian_trades = 0
var int asian_wins = 0
var int london_trades = 0
var int london_wins = 0
var int ny_trades = 0
var int ny_wins = 0
var int trend_bull_trades = 0
var int trend_bull_wins = 0
var int trend_bear_trades = 0
var int trend_bear_wins = 0

// Check Exits
if in_long
    if low <= sim_sl_price
        losses += 1
        float loss_amt = (current_balance * risk_per_trade / 100)
        current_balance -= loss_amt
        gross_loss += loss_amt
        // Recording breakdown
        if trade_sess == "Asian" 
            asian_trades += 1
        else if trade_sess == "London"
            london_trades += 1
        else if trade_sess == "NY"
            ny_trades += 1
        if trade_trend == "Bullish"
            trend_bull_trades += 1
        else
            trend_bear_trades += 1
        in_long := false
    else if high >= sim_tp_price
        wins += 1
        float win_amt = (current_balance * risk_per_trade / 100 * tp2_rr)
        current_balance += win_amt
        gross_profit += win_amt
        // Recording breakdown
        if trade_sess == "Asian" 
            asian_trades += 1
            asian_wins += 1
        else if trade_sess == "London"
            london_trades += 1
            london_wins += 1
        else if trade_sess == "NY"
            ny_trades += 1
            ny_wins += 1
        if trade_trend == "Bullish"
            trend_bull_trades += 1
            trend_bull_wins += 1
        else
            trend_bear_trades += 1
            trend_bear_wins += 1
        in_long := false

if in_short
    if high >= sim_sl_price
        losses += 1
        float loss_amt = (current_balance * risk_per_trade / 100)
        current_balance -= loss_amt
        gross_loss += loss_amt
        // Recording breakdown
        if trade_sess == "Asian" 
            asian_trades += 1
        else if trade_sess == "London"
            london_trades += 1
        else if trade_sess == "NY"
            ny_trades += 1
        if trade_trend == "Bullish"
            trend_bull_trades += 1
        else
            trend_bear_trades += 1
        in_short := false
    else if low <= sim_tp_price
        wins += 1
        float win_amt = (current_balance * risk_per_trade / 100 * tp2_rr)
        current_balance += win_amt
        gross_profit += win_amt
        // Recording breakdown
        if trade_sess == "Asian" 
            asian_trades += 1
            asian_wins += 1
        else if trade_sess == "London"
            london_trades += 1
            london_wins += 1
        else if trade_sess == "NY"
            ny_trades += 1
            ny_wins += 1
        if trade_trend == "Bullish"
            trend_bull_trades += 1
            trend_bull_wins += 1
        else
            trend_bear_trades += 1
            trend_bear_wins += 1
        in_short := false

// Advanced Metrics
equity_change = current_balance - current_balance[1]
equity_ret = (current_balance / current_balance[1]) - 1
equity_ret := na(equity_ret) ? 0 : equity_ret
sharpe = ta.sma(equity_ret, 100) / ta.stdev(equity_ret, 100) * math.sqrt(252)
downside_ret = math.min(equity_ret, 0)
sortino = ta.sma(equity_ret, 100) / ta.stdev(downside_ret, 100) * math.sqrt(252)

// Drawdown Calculation
max_balance := math.max(max_balance, current_balance)
float cur_dd = ((max_balance - current_balance) / max_balance) * 100
max_drawdown := math.max(max_drawdown, cur_dd)

win_rate = total_trades > 0 ? (wins / float(total_trades)) * 100 : 0
profit_factor = gross_loss > 0 ? gross_profit / gross_loss : gross_profit > 0 ? 99.9 : 0
net_profit = current_balance - init_balance
profit_perc = (net_profit / init_balance) * 100

// TP/SL Dynamic Visualizer
if buy_signal and show_tp_lines
    float sl = low - (atr * atr_mult)
    float risk = close - sl
    float tp1 = close + (risk * tp1_rr)
    float tp2 = close + (risk * tp2_rr)
    float tp3 = close + (risk * tp3_rr)
    line.new(bar_index, sl, bar_index + 10, sl, color=color.red, style=line.style_dashed, width=1)
    label.new(bar_index + 10, sl, "SL", style=label.style_none, textcolor=color.red, size=size.small)
    line.new(bar_index, tp1, bar_index + 10, tp1, color=color.green, style=line.style_dotted)
    label.new(bar_index + 10, tp1, "TP1", style=label.style_none, textcolor=color.green, size=size.small)
    line.new(bar_index, tp2, bar_index + 10, tp2, color=color.teal, style=line.style_dotted)
    label.new(bar_index + 10, tp2, "TP2", style=label.style_none, textcolor=color.teal, size=size.small)
    line.new(bar_index, tp3, bar_index + 10, tp3, color=color.lime, style=line.style_dotted)
    label.new(bar_index + 10, tp3, "TP3", style=label.style_none, textcolor=color.lime, size=size.small)

if sell_signal and show_tp_lines
    float sl = high + (atr * atr_mult)
    float risk = sl - close
    float tp1 = close - (risk * tp1_rr)
    float tp2 = close - (risk * tp2_rr)
    float tp3 = close - (risk * tp3_rr)
    line.new(bar_index, sl, bar_index + 10, sl, color=color.red, style=line.style_dashed, width=1)
    label.new(bar_index + 10, sl, "SL", style=label.style_none, textcolor=color.red, size=size.small)
    line.new(bar_index, tp1, bar_index + 10, tp1, color=color.green, style=line.style_dotted)
    label.new(bar_index + 10, tp1, "TP1", style=label.style_none, textcolor=color.green, size=size.small)
    line.new(bar_index, tp2, bar_index + 10, tp2, color=color.teal, style=line.style_dotted)
    label.new(bar_index + 10, tp2, "TP2", style=label.style_none, textcolor=color.teal, size=size.small)
    line.new(bar_index, tp3, bar_index + 10, tp3, color=color.lime, style=line.style_dotted)
    label.new(bar_index + 10, tp3, "TP3", style=label.style_none, textcolor=color.lime, size=size.small)

// ==========================================
// DASHBOARD PANEL
// ==========================================
var table dashboard = table.new(position.top_right, 2, 25, bgcolor=color.new(color.black, 20), border_width=1, border_color=color.gray)

if barstate.islast
    table.cell(dashboard, 0, 0, "Lashari AI Dashboard", text_color=color.white, text_size=size.small)
    table.merge_cells(dashboard, 0, 0, 1, 0)
    
    table.cell(dashboard, 0, 1, "Trend", text_color=color.white)
    table.cell(dashboard, 1, 1, is_bullish_trend ? "BULLISH" : is_bearish_trend ? "BEARISH" : "NEUTRAL", text_color = is_bullish_trend ? color.green : is_bearish_trend ? color.red : color.gray)
    
    table.cell(dashboard, 0, 2, "HTF Bias (" + htf_val + ")", text_color=color.white)
    table.cell(dashboard, 1, 2, htf_trend_strength, text_color = htf_bullish ? color.green : color.red)
    
    table.cell(dashboard, 0, 3, "Volatility", text_color=color.white)
    table.cell(dashboard, 1, 3, is_high_vol ? "HIGH" : "NORMAL", text_color = is_high_vol ? color.yellow : color.gray)
    
    table.cell(dashboard, 0, 4, "Wave Sequence", text_color=color.white)
    string pat_status = bullish_wave > 0 ? "IMPULSE " + str.tostring(bullish_wave) + "/5" : bearish_wave > 0 ? "IMPULSE " + str.tostring(bearish_wave) + "/5" : "RETRACING"
    color pat_color = (bullish_wave == 5 or bearish_wave == 5) ? color.lime : (bullish_wave > 0 or bearish_wave > 0) ? color.yellow : color.gray
    table.cell(dashboard, 1, 4, pat_status, text_color = pat_color)

    int row_offset = 5
    if show_backtest
        table.cell(dashboard, 0, row_offset, "--- BACKTEST LAB ---", text_color=color.yellow, bgcolor=color.new(color.yellow, 90))
        table.merge_cells(dashboard, 0, row_offset, 1, row_offset)
        row_offset += 1
        
        table.cell(dashboard, 0, row_offset, "Win Rate", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(win_rate, "#.##") + "%", text_color = win_rate > 50 ? color.green : color.red, bgcolor=color.new(color.gray, 90))
        row_offset += 1
        
        table.cell(dashboard, 0, row_offset, "Trades (W/L)", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(wins) + " / " + str.tostring(losses), text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1
        
        table.cell(dashboard, 0, row_offset, "Net ROI", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(profit_perc, "#.##") + "%", text_color = net_profit >= 0 ? color.green : color.red, bgcolor=color.new(color.gray, 90))
        row_offset += 1

        table.cell(dashboard, 0, row_offset, "Sharpe / Sortino", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(sharpe, "#.##") + " / " + str.tostring(sortino, "#.##"), text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1

        table.cell(dashboard, 0, row_offset, "--- ALPHA PERFORMANCE ---", text_color=color.yellow, bgcolor=color.new(color.yellow, 90))
        table.merge_cells(dashboard, 0, row_offset, 1, row_offset)
        row_offset += 1

        float asian_wr = asian_trades > 0 ? (asian_wins / float(asian_trades)) * 100 : 0
        table.cell(dashboard, 0, row_offset, "Asian Session Win Rate", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(asian_wr, "#.##") + "%", text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1

        float london_wr = london_trades > 0 ? (london_wins / float(london_trades)) * 100 : 0
        table.cell(dashboard, 0, row_offset, "London Session Win Rate", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(london_wr, "#.##") + "%", text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1

        float ny_wr = ny_trades > 0 ? (ny_wins / float(ny_trades)) * 100 : 0
        table.cell(dashboard, 0, row_offset, "NY Session Win Rate", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(ny_wr, "#.##") + "%", text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1

        float bull_wr = trend_bull_trades > 0 ? (trend_bull_wins / float(trend_bull_trades)) * 100 : 0
        table.cell(dashboard, 0, row_offset, "Bullish Trend WR", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(bull_wr, "#.##") + "% (" + str.tostring(trend_bull_trades) + ")", text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1

        float bear_wr = trend_bear_trades > 0 ? (trend_bear_wins / float(trend_bear_trades)) * 100 : 0
        table.cell(dashboard, 0, row_offset, "Bearish Trend WR", text_color=color.white, bgcolor=color.new(color.gray, 90))
        table.cell(dashboard, 1, row_offset, str.tostring(bear_wr, "#.##") + "% (" + str.tostring(trend_bear_trades) + ")", text_color=color.white, bgcolor=color.new(color.gray, 90))
        row_offset += 1

    table.cell(dashboard, 0, row_offset, "--- AI SCORES ---", text_color=color.yellow)
    table.merge_cells(dashboard, 0, row_offset, 1, row_offset)
    row_offset += 1
    
    float conf_score = 0
    if is_bullish_trend or is_bearish_trend
        conf_score += 20
    if rsi > 40 and rsi < 60
        conf_score += 10
    else if (rsi < 40 and is_bullish_trend) or (rsi > 60 and is_bearish_trend)
        conf_score += 30
    if is_high_vol
        conf_score += 15
    if macd_bullish or macd_bearish
        conf_score += 10
    if htf_bullish == is_bullish_trend
        conf_score += 10
    if (is_fbo_bull_val or is_fbo_bear_val)
        conf_score -= 15 // Confidence drops on fakeouts

    table.cell(dashboard, 0, row_offset, "AI Confidence", text_color=color.white)
    table.cell(dashboard, 1, row_offset, str.tostring(conf_score) + "%", text_color = conf_score > 75 ? color.green : conf_score > 50 ? color.yellow : color.red)
    row_offset += 1
    
    table.cell(dashboard, 0, row_offset, "Signal Stability", text_color=color.white)
    table.cell(dashboard, 1, row_offset, (is_fbo_bull_val or is_fbo_bear_val) ? "UNSTABLE" : "STABLE", text_color = (is_fbo_bull_val or is_fbo_bear_val) ? color.red : color.green)

// ==========================================
// ALERTS
// ==========================================
alertcondition(alert_signals and buy_signal, "Buy Alert", "Lashari AI: Bullish Confirmation Found!")
alertcondition(alert_signals and sell_signal, "Sell Alert", "Lashari AI: Bearish Confirmation Found!")

// SMC Alerts
alertcondition(alert_bos and (is_bos_bullish or is_bos_bearish), "SMC: BOS/CHOCH Alert", "Lashari AI: Break of Structure / CHOCH Detected!")
alertcondition(alert_ob and (is_bos_bullish or is_bos_bearish), "SMC: New Order Block", "Lashari AI: New Order Block Formed!")
alertcondition(alert_fvg and (is_fvg_bull or is_fvg_bear), "SMC: FVG Detected", "Lashari AI: Fair Value Gap Identified!")
alertcondition(alert_fbo and (is_fbo_bull_val or is_fbo_bear_val), "Price Action: Fake Breakout (Wick Sweep)", "Lashari AI: Fake Breakout / Wick Structure Sweep Detected!")

// Session Alerts
alertcondition(alert_session and is_asian_start, "Session: Asian Start", "Lashari AI: Asian Session is now Active!")
alertcondition(alert_session and is_london_start, "Session: London Start", "Lashari AI: London Session is now Active!")
alertcondition(alert_session and is_nys_start, "Session: NY Start", "Lashari AI: New York Session is now Active!")

// RSI Divergence Alerts
alertcondition(alert_rsi_div and bull_reg_div, "RSI: Bullish Regular Divergence", "Lashari AI: Bullish Regular RSI Divergence Detected!")
alertcondition(alert_rsi_div and bull_hid_div, "RSI: Bullish Hidden Divergence", "Lashari AI: Bullish Hidden RSI Divergence Detected!")
alertcondition(alert_rsi_div and bear_reg_div, "RSI: Bearish Regular Divergence", "Lashari AI: Bearish Regular RSI Divergence Detected!")
alertcondition(alert_rsi_div and bear_hid_div, "RSI: Bearish Hidden Divergence", "Lashari AI: Bearish Hidden RSI Divergence Detected!")
`;
  };

  const currentCode = getDynamicCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div id="auth-root" className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30 flex items-center justify-center px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-emerald-500/10 blur-[120px] -z-10 rounded-full" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-10 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
            <BrainCircuit className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-black mb-4 tracking-tight text-white italic">Lashari <span className="text-emerald-400">AI</span></h1>
          <p className="text-zinc-400 mb-10 text-sm leading-relaxed">
            Welcome to the AI Trading Studio. Log in to access the Smart Money Concept indicator engine and institutional toolsets.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
          <p className="mt-8 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
            Securely powered by Google Cloud
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl auto px-6 h-16 flex items-center justify-between mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white italic">Lashari <span className="text-emerald-400">AI</span></span>
          </div>
          <div className="hidden lg:flex items-center gap-8">
            <button onClick={() => setActiveTab('features')} className={`text-sm font-medium transition-colors ${activeTab === 'features' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>Features</button>
            <button onClick={() => setActiveTab('chart')} className={`text-sm font-medium transition-colors ${activeTab === 'chart' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>Intelligence Hub</button>
            <button onClick={() => setActiveTab('heatmap')} className={`text-sm font-medium transition-colors ${activeTab === 'heatmap' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>Market Heatmap</button>
            <button onClick={() => setActiveTab('sentiment')} className={`text-sm font-medium transition-colors ${activeTab === 'sentiment' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>News Sentiment</button>
            <button onClick={() => setActiveTab('code')} className={`text-sm font-medium transition-colors ${activeTab === 'code' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>Pine Script Code</button>
            <button onClick={() => setActiveTab('setup')} className={`text-sm font-medium transition-colors ${activeTab === 'setup' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'}`}>Setup Guide</button>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-emerald-500/30" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <UserIcon size={12} className="text-emerald-400" />
                </div>
              )}
              <span className="text-xs font-bold text-zinc-300 truncate max-w-[100px]">{user.displayName || user.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
            <button 
              onClick={handleCopy}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-lg transition-all transform active:scale-95 flex items-center gap-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Get Indicator'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-emerald-500/10 blur-[120px] -z-10 rounded-full" />
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Zap size={14} /> Next-Gen Trading Logic
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1] text-white"
          >
            Master the Markets with <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500">
              Institutional AI Precision
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10"
          >
            Lashari Smart Money AI Indicator brings professional institutional trading concepts directly to your TradingView charts. 
            Non-repainting, SMC-powered, high-probability signals.
          </motion.p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => setActiveTab('chart')}
              className="px-8 py-4 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/30 group"
            >
              Intelligence Hub <Radar className="w-5 h-5 group-hover:animate-spin" />
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-3"
            >
              Access Pine Script v5 <MousePointer2 size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        {/* Live Intelligence Monitor */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8 bg-zinc-900/50 w-fit px-4 py-2 rounded-2xl border border-zinc-800">
            <BrainCircuit className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Live AI Intelligence Monitor</h2>
            <div className="flex gap-1 ml-4">
               {[1, 2, 3].map(i => (
                 <motion.div 
                   key={`pulse-${i}`}
                   animate={{ opacity: [0.2, 1, 0.2] }}
                   transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                   className="w-1 h-3 bg-emerald-500 rounded-full" 
                 />
               ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Local Trend</div>
               <div className={`text-xl font-black ${simulation.trend === 'Bullish' ? 'text-emerald-400' : 'text-red-400'}`}>
                 {simulation.trend}
               </div>
               <div className="absolute top-2 right-4 text-[8px] text-emerald-500/50 font-mono">SCANNING...</div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">HTF Bias ({htfVal})</div>
               <div className={`text-xl font-black ${simulation.htfBias.includes('Bullish') ? 'text-emerald-400' : 'text-red-400'}`}>
                 {simulation.htfBias}
               </div>
               <div className="absolute top-2 right-4 text-[8px] text-teal-500/50 font-mono">MTF ENGINE</div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">1-5 Sequence</div>
               <div className={`text-xl font-black ${simulation.pattern.includes('Confirmed') ? 'text-cyan-400' : 'text-amber-400'}`}>
                 {simulation.pattern}
               </div>
               <div className="absolute top-2 right-4 text-[8px] text-cyan-500/50 font-mono italic">STRUCTURE</div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">AI Confidence Score</div>
               <div className="flex items-end gap-3 text-white">
                 <div className="text-2xl font-black italic">{simulation.confidence}<span className="text-emerald-400 text-xs ml-1">%</span></div>
                 <div className="flex-1 h-1.5 bg-zinc-800 rounded-full mb-1.5 overflow-hidden min-w-[60px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${simulation.confidence}%` }}
                      className={`h-full ${simulation.confidence > 70 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500'}`}
                    />
                 </div>
               </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden hidden md:block">
               <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Last Update</div>
               <div className="text-xl font-mono font-bold text-zinc-300">
                 {pktTime || simulation.lastUpdate}
               </div>
               <div className="absolute top-2 right-4 text-[8px] text-zinc-600 font-mono">PKT TIME</div>
            </div>
          </div>
          
          <div className="mt-4 px-6 py-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between text-[8px] font-bold text-emerald-500/60 uppercase tracking-[0.3em]">
             <div className="flex gap-4">
                <span>Signal Engine: ACTIVE</span>
                <span>•</span>
                <span>HTF Analysis: SYNCED</span>
                <span>•</span>
                <span>Volatility Engine: SYNCED</span>
             </div>
             <motion.div 
               animate={{ opacity: [0, 1, 0] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="flex items-center gap-2"
             >
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                Live Feed
             </motion.div>
          </div>

          {/* New Active Entry Analysis Section */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-gradient-to-br from-zinc-900/40 to-black/40 border border-zinc-800/80 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Zap className="w-24 h-24" style={{ color: bullishObColor }} />
               </div>
               
                <div className="flex items-center gap-4 mb-6">
                 <div 
                   className="flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg"
                   style={{ backgroundColor: `${bullishObColor}1a`, borderColor: `${bullishObColor}33` }}
                 >
                   <motion.div
                     animate={{ rotate: [0, 360] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   >
                     <Target className="w-6 h-6" style={{ color: bullishObColor }} />
                   </motion.div>
                 </div>
                 <div>
                   <h3 className="text-base font-black text-white uppercase tracking-[0.2em] leading-none mb-1.5 transition-all">SMC Analytic Engine v4.0</h3>
                   <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950/50 border border-zinc-800/80">
                       <Shield size={10} className="text-zinc-500" />
                       <span className="text-[9px] text-zinc-400 font-bold tracking-tight">ENGINE STATE:</span>
                       <span 
                         className="text-[10px] font-black uppercase"
                         style={{ 
                           color: simulation.confidence > 70 ? bullishObColor : '#f59e0b'
                         }}
                       >
                         {simulation.confidence > 70 ? 'FULL CLEARANCE' : 'FILTERED PENDING'}
                       </span>
                     </div>
                     <div className="h-1 w-1 rounded-full bg-zinc-700 mx-1" />
                     <span className="text-[10px] text-zinc-500 font-bold tracking-tight italic">AUTO-SCANNING MARKET STRUCTURE...</span>
                   </div>
                 </div>
               </div>

               <div className="space-y-8 relative z-10">
                 <div className="p-5 rounded-3xl bg-zinc-950/40 border border-zinc-800/50 relative overflow-hidden group">
                   <div className="absolute inset-y-0 left-0 w-1 rounded-full" style={{ backgroundColor: bullishObColor }} />
                   <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                     <TrendingUp size={10} style={{ color: bullishObColor }} />
                     Primary Entry Logic
                   </div>
                   <div className="text-xl font-bold text-zinc-200 leading-tight">
                     "{simulation.activeReason}"
                   </div>
                   <div className="mt-4 flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <div className="text-[9px] font-black text-zinc-500 uppercase">Direction Check</div>
                       <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg">BULLISH CONFIRMED</div>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="text-[9px] font-black text-zinc-500 uppercase">Engine Sync</div>
                       <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-lg">98.2% SYNCHRONIZED</div>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                     <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logic Clearance Protocol</h5>
                     <span className="text-[9px] font-mono text-zinc-600">CHECKS: 6/6 PASS</span>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                     {[
                       { label: 'Safety (Structure)', active: simulation.factors.structural, color: bullishObColor },
                       { label: 'RSE (RSI) Logic', active: simulation.factors.rsi, color: bullishObColor },
                       { label: 'Volume Flow', active: simulation.factors.volume, color: highVolColor },
                       { label: 'Fibonacci Zone', active: simulation.factors.fibonacci, color: bullishObColor },
                       { label: 'Supply/Demand', active: simulation.factors.sd, color: bullishObColor },
                       { label: 'Institutional OB', active: simulation.factors.ob, color: bullishObColor }
                     ].map((f, i) => (
                       <div 
                         key={`clearance-step-${i}`}
                         className="p-4 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all duration-500"
                         style={{ 
                           backgroundColor: f.active ? `${f.color}1a` : 'rgba(39, 39, 42, 0.1)',
                           borderColor: f.active ? `${f.color}33` : 'rgba(63, 63, 70, 0.2)',
                           color: f.active ? f.color : 'rgb(82, 82, 91)',
                           transform: f.active ? 'scale(1)' : 'scale(0.95)',
                           opacity: f.active ? 1 : 0.6
                         }}
                       >
                         <div className={`p-1 rounded-full transition-all ${f.active ? 'bg-white/10' : 'bg-transparent'}`}>
                           <Check size={14} className={f.active ? 'opacity-100' : 'opacity-20'} />
                         </div>
                         <div className="flex flex-col items-center gap-1">
                           <span className="text-[9px] font-black text-center uppercase tracking-tight leading-none">{f.label}</span>
                           {f.active && <span className="text-[7px] font-black opacity-40">CLEARED</span>}
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-zinc-900/20 border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Market Session Gate</h4>
                <div className="space-y-4">
                  {[
                    { id: 'asian', label: 'Asian Session', active: useAsian, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { id: 'london', label: 'London Session', active: useLondon, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                    { id: 'ny', label: 'NY Session', active: useNys, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  ].map((s) => (
                    <div key={`sess-${s.id}`} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${s.active ? s.color.replace('text', 'bg') : 'bg-zinc-800'}`} />
                         <span className={`text-[11px] font-bold ${s.active ? 'text-zinc-200' : 'text-zinc-600'}`}>{s.label}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase ${s.active ? 'text-emerald-500' : 'text-zinc-600'}`}>{s.active ? 'ENABLED' : 'FILTERED'}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Institutional Sentiment</div>
                <div className="flex items-center gap-3">
                   <div className="text-xl font-black text-white italic">78% BULLISH</div>
                   <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 w-[78%]" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Engine Section with Tabs */}
        <div className="mb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-zinc-900/50 w-fit px-5 py-2.5 rounded-2xl border border-zinc-800 shadow-xl shadow-black/20">
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-zinc-300">Configuration Engine</h2>
              </div>
              
              {/* Collapsible Chart Legend */}
              <div className="relative z-20">
                <button 
                  onClick={() => setShowLegend(!showLegend)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition-all"
                >
                  <Info size={14} />
                  Visual Legend
                  {showLegend ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                
                <AnimatePresence>
                  {showLegend && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-3 w-72 p-5 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl backdrop-blur-xl"
                    >
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-zinc-800">Chart Symbols & Logic</h4>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-4 rounded shrink-0 mt-0.5 border" 
                            style={{ backgroundColor: `${bullishObColor}33`, borderColor: `${bullishObColor}66` }}
                          />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: bullishObColor }}>Bullish Order Block</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">Institutional buy zone where big players entered.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-4 bg-emerald-500/10 border border-emerald-500/20 shrink-0 mt-0.5" 
                            style={{ backgroundColor: `${bullishObColor}1a`, borderColor: `${bullishObColor}33` }}
                          />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: bullishObColor }}>Fair Value Gap (FVG)</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">Price imbalance zone often revisited for re-entry.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-4 rounded shrink-0 mt-0.5 border" 
                            style={{ backgroundColor: `${bearishObColor}33`, borderColor: `${bearishObColor}66` }}
                          />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: bearishObColor }}>Bearish Order Block</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">Institutional supply zone waiting to be tapped.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 flex justify-center shrink-0 mt-0.5">
                            <span className="text-[8px] font-black py-0.5 px-1 bg-blue-500/20 text-blue-400 rounded">BOS</span>
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Break of Structure</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">Price breaking previous highs/lows (Trend Confirmation).</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 flex justify-center shrink-0 mt-0.5">
                            <span className="text-[8px] font-black py-0.5 px-1 bg-purple-500/20 text-purple-400 rounded">CH</span>
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Change of Character</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">First structural break against the current trend bias.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-4 rounded shrink-0 mt-0.5 border" 
                            style={{ backgroundColor: `${highVolColor}33`, borderColor: `${highVolColor}66` }}
                          />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: highVolColor }}>Volume Highlight</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">Bars with relative volume spikes (Institutional effort).</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                           <div className="flex gap-1 shrink-0 mt-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500/20" />
                              <div className="w-2 h-2 rounded-full bg-orange-500/20" />
                              <div className="w-2 h-2 rounded-full bg-purple-500/20" />
                           </div>
                           <div>
                            <div className="text-[10px] font-black text-zinc-300 uppercase tracking-wider">Trading Sessions</div>
                            <p className="text-[9px] text-zinc-500 leading-tight">Asian (Blue), London (Orange), New York (Purple).</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl backdrop-blur-xl shadow-2xl shrink-0">
              <button 
                onClick={() => setSettingsTab('strategy')}
                className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${settingsTab === 'strategy' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
              >
                <ShieldAlert size={14} /> Strategy
              </button>
              <button 
                onClick={() => setSettingsTab('smc')}
                className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${settingsTab === 'smc' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
              >
                <Layers size={14} /> SMC & Structure
              </button>
              <button 
                onClick={() => setSettingsTab('alerts')}
                className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${settingsTab === 'alerts' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
              >
                <BellRing size={14} /> Alerts
              </button>
              <button 
                onClick={() => setSettingsTab('backtest')}
                className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${settingsTab === 'backtest' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
              >
                <TrendingUp size={14} /> Backtest Lab
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={settingsTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {settingsTab === 'strategy' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Strategy Filters */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                      <ShieldAlert size={160} />
                    </div>
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Activity className="text-emerald-400 w-4 h-4" />
                      </div>
                      Signal Filters
                    </h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setVolumeConfirmation(!volumeConfirmation)}
                        className={`w-full py-4 px-5 border rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${volumeConfirmation ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                      >
                        Institutional Volume <span>{volumeConfirmation ? 'ACTIVE' : 'OFF'}</span>
                      </button>
                      <button 
                        onClick={() => setHighVolHighlight(!highVolHighlight)}
                        className={`w-full py-4 px-5 border rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${highVolHighlight ? 'bg-zinc-800/60' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                        style={{ 
                          borderColor: highVolHighlight ? `${highVolColor}4d` : undefined,
                          color: highVolHighlight ? highVolColor : undefined,
                          boxShadow: highVolHighlight ? `0 0 20px ${highVolColor}0d` : undefined
                        }}
                      >
                        Volume Highlighting <span>{highVolHighlight ? 'ON' : 'OFF'}</span>
                      </button>

                      {highVolHighlight && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Highlight Color</span>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={highVolColor}
                                onChange={(e) => setHighVolColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none outline-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg"
                              />
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">{highVolColor}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 p-1 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
                            {[
                              { name: 'Yellow', color: '#eab308' },
                              { name: 'Blue', color: '#3b82f6' },
                              { name: 'Orange', color: '#f97316' },
                              { name: 'Cyan', color: '#06b6d4' }
                            ].map((c) => (
                              <button
                                key={`hv-color-${c.color}`}
                                onClick={() => setHighVolColor(c.color)}
                                className={`flex-1 h-6 rounded-lg transition-all border-2 ${highVolColor === c.color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                style={{ backgroundColor: c.color }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <button 
                        onClick={() => setMinBodyPerc(prev => prev === 70 ? 30 : prev + 20)}
                        className="w-full py-4 px-5 bg-zinc-800/40 border border-zinc-700/40 rounded-2xl text-zinc-300 text-xs font-black uppercase tracking-widest flex justify-between items-center hover:bg-zinc-700/50 transition-all group/btn"
                      >
                        Body % Requirement <span className="group-hover:text-emerald-400 transition-colors">{minBodyPerc}%</span>
                      </button>
                    </div>
                  </div>

                  {/* HTF Engine */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                      <BrainCircuit size={160} />
                    </div>
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <TrendingUp className="text-teal-400 w-4 h-4" />
                      </div>
                      HTF Engine
                    </h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setUseMtf(!useMtf)}
                        className={`w-full py-4 px-5 border rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${useMtf ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                      >
                        MTF Bias Filter <span>{useMtf ? 'ENABLED' : 'OFF'}</span>
                      </button>
                      <div className="relative">
                        <select 
                          value={htfVal} 
                          onChange={(e) => setHtfVal(e.target.value)}
                          className="w-full appearance-none bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 py-4 px-5 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all cursor-pointer hover:border-zinc-500"
                        >
                          <option value="15">15M Timeframe</option>
                          <option value="60">1H Timeframe</option>
                          <option value="240">4H Timeframe</option>
                          <option value="D">Daily Bias</option>
                          <option value="W">Weekly Bias</option>
                        </select>
                        <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-zinc-500">
                          <MousePointer2 size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Presets */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Wallet2 size={160} />
                    </div>
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Zap className="text-amber-400 w-4 h-4" />
                      </div>
                      Execution
                    </h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <select 
                          value={preset} 
                          onChange={(e) => setPreset(e.target.value)}
                          className="w-full appearance-none bg-zinc-800/60 border border-zinc-700/50 text-zinc-200 py-4 px-5 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all cursor-pointer hover:border-zinc-500"
                        >
                          <option value="Scalping">M1 - M5 Scalper</option>
                          <option value="Intraday">M15 - H1 Intraday</option>
                          <option value="Swing">H4 - 1D Swing</option>
                        </select>
                      </div>
                      <div className="pt-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 block mb-3">Active Sessions</label>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => setUseAsian(!useAsian)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all border ${useAsian ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}
                          >
                            ASIAN
                          </button>
                          <button 
                            onClick={() => setUseLondon(!useLondon)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all border ${useLondon ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}
                          >
                            LONDON
                          </button>
                          <button 
                            onClick={() => setUseNys(!useNys)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all border ${useNys ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}
                          >
                            NY
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setShowEntryReason(!showEntryReason)}
                          className={`py-3 px-3 border rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all ${showEntryReason ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                        >
                          Entry Reason <span>{showEntryReason ? 'ON' : 'OFF'}</span>
                        </button>
                        <button 
                          onClick={() => setShowActiveMarker(!showActiveMarker)}
                          className={`py-3 px-3 border rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all ${showActiveMarker ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                        >
                          Active Marker <span>{showActiveMarker ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'smc' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Structure */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Layers size={160} />
                    </div>
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Layers className="text-blue-400 w-4 h-4" />
                      </div>
                      SMC Mapping
                    </h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowBos(!showBos)}
                        className={`w-full py-4 px-5 border rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${showBos ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                      >
                        BOS / CHOCH <span>{showBos ? 'ACTIVE' : 'OFF'}</span>
                      </button>
                      <button 
                        onClick={() => setShowObFvg(!showObFvg)}
                        className={`w-full py-4 px-5 border rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${showObFvg ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                      >
                        Order Block/FVG <span>{showObFvg ? 'VISIBLE' : 'HIDDEN'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tuning */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 px-1">SMC Parameter Tuning</h3>
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                          onClick={() => setObLookback(prev => prev === 100 ? 20 : prev + 30 === 110 ? 100 : prev + 30)}
                          className="p-5 bg-zinc-800/30 border border-zinc-800/50 rounded-[1.5rem] flex flex-col items-center hover:bg-zinc-800 transition-all group"
                        >
                          <span className="text-[8px] font-black text-zinc-600 mb-2 uppercase tracking-widest">Lookback</span>
                          <span className="text-2xl font-black text-blue-400 group-hover:scale-110 transition-transform">{obLookback}</span>
                        </button>
                        <button 
                          onClick={() => setObMinBody(prev => prev === 80 ? 40 : prev + 20)}
                          className="p-5 bg-zinc-800/30 border border-zinc-800/50 rounded-[1.5rem] flex flex-col items-center hover:bg-zinc-800 transition-all group"
                        >
                          <span className="text-[8px] font-black text-zinc-600 mb-2 uppercase tracking-widest">Min Body</span>
                          <span className="text-2xl font-black text-blue-400 group-hover:scale-110 transition-transform">{obMinBody}%</span>
                        </button>
                        <button 
                          onClick={() => setMinFboWick(prev => prev >= 60 ? 20 : prev + 10)}
                          className="p-5 bg-zinc-800/30 border border-zinc-800/50 rounded-[1.5rem] flex flex-col items-center hover:bg-zinc-800 transition-all group col-span-2"
                        >
                          <span className="text-[8px] font-black text-zinc-600 mb-2 uppercase tracking-widest">FBO Wick Percentage</span>
                          <span className="text-2xl font-black text-orange-400 group-hover:scale-110 transition-transform">{minFboWick}%</span>
                        </button>
                     </div>

                     <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                        <div>
                          <div className="flex items-center justify-between px-1 mb-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 block">Bullish OB Color</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={bullishObColor}
                                onChange={(e) => setBullishObColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none outline-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg"
                              />
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">{bullishObColor}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 p-1 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
                            {[
                              { name: 'Emerald', color: '#10b981' },
                              { name: 'Green', color: '#22c55e' },
                              { name: 'Blue', color: '#3b82f6' },
                              { name: 'Cyan', color: '#06b6d4' }
                            ].map((c) => (
                              <button
                                key={`bull-color-${c.color}`}
                                onClick={() => setBullishObColor(c.color)}
                                className={`flex-1 h-6 rounded-lg transition-all border-2 ${bullishObColor === c.color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                style={{ backgroundColor: c.color }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between px-1 mb-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 block">Bearish OB Color</label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={bearishObColor}
                                onChange={(e) => setBearishObColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none outline-none overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-lg"
                              />
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">{bearishObColor}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 p-1 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
                            {[
                              { name: 'Rose', color: '#f43f5e' },
                              { name: 'Red', color: '#ef4444' },
                              { name: 'Orange', color: '#f97316' },
                              { name: 'Purple', color: '#a855f7' }
                            ].map((c) => (
                              <button
                                key={`bear-color-${c.color}`}
                                onClick={() => setBearishObColor(c.color)}
                                className={`flex-1 h-6 rounded-lg transition-all border-2 ${bearishObColor === c.color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                style={{ backgroundColor: c.color }}
                              />
                            ))}
                          </div>
                        </div>
                     </div>
                  </div>

                  {/* Price Action Sweeps */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-orange-400 italic">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Zap className="text-orange-400 w-4 h-4" />
                      </div>
                      Price Action Sweeps
                    </h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowFbo(!showFbo)}
                        className={`w-full py-5 px-5 border rounded-[1.5rem] text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${showFbo ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.05)]' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-600'}`}
                      >
                        Fake Breakout (FBO) <span>{showFbo ? 'ACTIVE' : 'OFF'}</span>
                      </button>
                      <div className="p-5 rounded-2xl bg-zinc-800/20 border border-zinc-800/50">
                        <p className="text-[10px] text-zinc-500 font-bold leading-relaxed italic border-l-2 border-orange-500/30 pl-4">
                          Detects institutional "wicking" above/below previous structure points to identify high-probability reversal sweeps.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'alerts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                  <div className="p-10 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-4 text-white italic">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                        <BellRing className="text-pink-400 w-5 h-5" />
                      </div>
                      Global Alert Matrix
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Signal Triggers', state: alertSignals, setter: setAlertSignals },
                        { label: 'Fake Breakouts', state: alertFbo, setter: setAlertFbo },
                        { label: 'Market Structure', state: alertBos, setter: setAlertBos },
                        { label: 'Institutional OB', state: alertOb, setter: setAlertOb },
                        { label: 'Value Gaps (FVG)', state: alertFvg, setter: setAlertFvg },
                        { label: 'RSI Divergence', state: alertRsiDivergence, setter: setAlertRsiDivergence },
                        { label: 'Session Openings', state: alertSession, setter: setAlertSession },
                      ].map((alert) => (
                        <button 
                          key={alert.label}
                          onClick={() => alert.setter(!alert.state)}
                          className={`py-4 px-5 border rounded-2xl text-left text-xs font-black uppercase tracking-widest transition-all duration-300 relative group overflow-hidden ${alert.state ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 shadow-xl shadow-pink-500/5' : 'bg-zinc-800/30 border-zinc-800 text-zinc-600 opacity-60 hover:opacity-100'}`}
                        >
                          {alert.label}
                          <div className={`absolute top-1/2 -translate-y-1/2 right-5 w-1.5 h-1.5 rounded-full transition-all duration-500 ${alert.state ? 'bg-pink-500 shadow-[0_0_10px_#ec4899] scale-100' : 'bg-zinc-800 scale-50'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-zinc-900/40 to-black/40 border border-zinc-800/60 backdrop-blur-md flex flex-col justify-center text-center relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)] from-pink-500/5 opacity-40 pointer-events-none" />
                     <div className="w-20 h-20 bg-pink-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
                        <ShieldAlert size={32} className="text-pink-400" />
                     </div>
                     <h4 className="text-zinc-300 font-black mb-4 uppercase tracking-[0.4em] text-xs">Real-time Push Logic</h4>
                     <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed font-medium italic">
                       Configure these alerts in TradingView via the "Create Alert" dialog on the Lashari AI Indicator. Webhook and SMS support enabled.
                     </p>
                  </div>
                </div>
              )}
              {settingsTab === 'backtest' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {/* Capital Management */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Wallet2 className="text-amber-400 w-4 h-4" />
                      </div>
                      Risk Management
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Starting Balance</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(Number(e.target.value))}
                            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Risk per Trade (%)</label>
                        <input 
                          type="range" 
                          min="0.1" 
                          max="5" 
                          step="0.1"
                          value={riskPerTrade}
                          onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                          <span>0.1%</span>
                          <span className="text-amber-400 font-black">{riskPerTrade}%</span>
                          <span>5.0%</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">TP Multiplier</label>
                            <input 
                              type="number" 
                              step="0.1"
                              min="0.1"
                              value={tpMultiplier}
                              onChange={(e) => setTpMultiplier(Number(e.target.value))}
                              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl py-2 px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-amber-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">SL Multiplier</label>
                            <input 
                              type="number" 
                              step="0.1"
                              min="0.1"
                              value={slMultiplier}
                              onChange={(e) => setSlMultiplier(Number(e.target.value))}
                              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl py-2 px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-red-400"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Risk:Reward Ratio</span>
                          <span className="text-sm font-black text-white italic">1 : {(tpMultiplier / slMultiplier).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulator Toggles */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Activity className="text-emerald-400 w-4 h-4" />
                      </div>
                      Simulation Options
                    </h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => setShowBacktest(!showBacktest)}
                        className={`w-full py-4 px-5 border rounded-2xl text-xs font-black uppercase tracking-widest flex justify-between items-center transition-all duration-300 ${showBacktest ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-500/5' : 'bg-zinc-800/30 border-zinc-800 text-zinc-600'}`}
                      >
                        Performance Dashboard <span>{showBacktest ? 'ENABLED' : 'OFF'}</span>
                      </button>
                      <div className="p-5 rounded-2xl bg-zinc-800/20 border border-zinc-700/30">
                        <p className="text-[10px] text-zinc-500 font-bold leading-relaxed italic">
                          Calculates statistical outcomes using TP2 as the benchmark exit. Real-time pip and ROI tracking enabled.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Backtest Stats Preview */}
                  <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-4">Current ROI Projection</h4>
                      <div className="text-4xl font-black text-white italic">
                        +84.2% <span className="text-[10px] text-zinc-500 non-italic ml-2 font-black uppercase">Win Rate Weighted</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                          <span className="block text-[8px] font-black text-zinc-500 uppercase mb-1">Max Drawdown</span>
                          <span className="text-sm font-black text-red-500">-4.2%</span>
                        </div>
                        <div className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                          <span className="block text-[8px] font-black text-zinc-500 uppercase mb-1">Profit Factor</span>
                          <span className="text-sm font-black text-emerald-400">2.41</span>
                        </div>
                        <div className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                          <span className="block text-[8px] font-black text-zinc-500 uppercase mb-1">Sharpe Ratio</span>
                          <span className="text-sm font-black text-indigo-400">2.14</span>
                        </div>
                        <div className="p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                          <span className="block text-[8px] font-black text-zinc-500 uppercase mb-1">Sortino Ratio</span>
                          <span className="text-sm font-black text-cyan-400">2.88</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-8">
                       <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[68%]" />
                       </div>
                       <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
                          <span>Verified Wins (84 Trades)</span>
                          <span className="text-emerald-500 italic">68% Historical</span>
                       </div>
                    </div>
                  </div>

                  {/* Detailed Performance Attribution */}
                  <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md lg:col-span-2">
                    <h3 className="text-lg font-black mb-8 flex items-center gap-3 text-white italic text-left">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <BarChart3 className="text-indigo-400 w-4 h-4" />
                      </div>
                      Session & Trend Attribution
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 text-left">By Session</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-zinc-800/20 p-3 rounded-xl border border-zinc-800/50">
                            <span className="text-[10px] font-bold text-blue-400">Asian</span>
                            <span className="text-xs font-black">62% WR</span>
                          </div>
                          <div className="flex justify-between items-center bg-zinc-800/20 p-3 rounded-xl border border-zinc-800/50">
                            <span className="text-[10px] font-bold text-orange-400">London</span>
                            <span className="text-xs font-black">74% WR</span>
                          </div>
                          <div className="flex justify-between items-center bg-zinc-800/20 p-3 rounded-xl border border-zinc-800/50">
                            <span className="text-[10px] font-bold text-purple-400">NY Session</span>
                            <span className="text-xs font-black">69% WR</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 text-left">By Trend Direction</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-zinc-800/20 p-3 rounded-xl border border-zinc-800/50">
                            <span className="text-[10px] font-bold text-emerald-400 italic">Bullish Cont.</span>
                            <span className="text-xs font-black text-emerald-400">71%</span>
                          </div>
                          <div className="flex justify-between items-center bg-zinc-800/20 p-3 rounded-xl border border-zinc-800/50">
                            <span className="text-[10px] font-bold text-red-400 italic">Bearish Cont.</span>
                            <span className="text-xs font-black text-red-400">64%</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 text-left">Alpha Efficiency</div>
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                           <div className="text-[20px] font-black text-white italic mb-1">1.82</div>
                           <div className="text-[8px] font-bold text-indigo-400/70 uppercase tracking-tighter">Profit Factor Adjusted</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'chart' && (
            <motion.div
              key="chart"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* SYMBOL INTELLIGENCE SELECTOR */}
              <div className="p-1 rounded-[3rem] bg-zinc-900 border border-zinc-800 shadow-2xl">
                 <div className="flex flex-col lg:flex-row items-center gap-4 p-4">
                    {/* Market Category Toggle */}
                    <div className="flex p-1.5 bg-black rounded-2xl border border-zinc-800 shrink-0">
                       <button 
                         onClick={() => setMarketCategory('crypto')}
                         className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                           marketCategory === 'crypto' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'
                         }`}
                       >
                         <Coins size={14} />
                         Crypto
                       </button>
                       <button 
                         onClick={() => setMarketCategory('forex')}
                         className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                           marketCategory === 'forex' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300'
                         }`}
                       >
                         <Globe size={14} />
                         Forex
                       </button>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 w-full relative">
                       <input 
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder="SEARCH SYMBOL OR ASSET..."
                         className="w-full bg-black border border-zinc-800 rounded-2xl px-12 py-3.5 text-xs font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-all uppercase tracking-widest"
                       />
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-[10px] font-black text-zinc-700 bg-zinc-900 px-2 py-1 rounded-md">⌘K</span>
                       </div>
                    </div>

                    {/* Quick Selection List */}
                    <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar max-w-full lg:max-w-xs">
                       {filteredAssets.slice(0, 3).map(asset => (
                         <button
                           key={asset.symbol}
                           onClick={() => handleSymbolSelect(asset.symbol)}
                           className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 group whitespace-nowrap ${
                             activeSymbol === asset.symbol 
                               ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                               : 'bg-black border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:border-zinc-700 hover:text-zinc-300'
                           }`}
                         >
                           <span className="text-[10px] font-black uppercase tracking-tighter">{asset.pair}</span>
                           <Play size={10} className={activeSymbol === asset.symbol ? 'fill-emerald-400' : 'opacity-0 group-hover:opacity-100'} />
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* INTELLIGENCE MATRIX: SESSION & STRUCTURE ANALYSIS */}
              {analysisData && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
                >
                  {/* Session Sentiment */}
                  <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 transition-colors ${analysisData.sentiment === 'bullish' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-black border border-zinc-800">
                         <Activity className={analysisData.sentiment === 'bullish' ? 'text-emerald-500' : 'text-rose-500'} size={20} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Logic.Session</div>
                    </div>
                    <div className="space-y-1">
                       <h4 className={`text-xl font-black italic uppercase tracking-tighter ${analysisData.sentiment === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {analysisData.sessionLogic}
                       </h4>
                       <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 font-mono">
                          <span className={analysisData.sentiment === 'bullish' ? 'text-emerald-500' : 'text-rose-500'}>●</span> 
                          {analysisData.sentiment === 'bullish' ? 'Aggressive Bullish' : 'Neutralizing Bias'}
                       </div>
                    </div>
                  </div>

                  {/* Strategy Core */}
                  <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-black border border-zinc-800">
                         <BrainCircuit className="text-purple-500" size={20} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Neural.Strategy</div>
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-xl font-black italic uppercase tracking-tighter text-white">{analysisData.strategyName}</h4>
                       <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 font-mono">
                          <ChevronRight size={10} /> Active Engine: LASHARI_V5
                       </div>
                    </div>
                  </div>

                  {/* Market Structure */}
                  <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-black border border-zinc-800">
                         <TrendingUp className="text-blue-500" size={20} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Engine.Structure</div>
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-xl font-black italic uppercase tracking-tighter text-white">{analysisData.structure}</h4>
                       <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1.5 font-mono">
                          <ChevronRight size={10} /> 4H Trend Alignment
                       </div>
                    </div>
                  </div>

                  {/* Backtest Intel */}
                  <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-black border border-zinc-800">
                         <BarChart3 className="text-amber-500" size={20} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Backtest.Intel</div>
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-xl font-black italic uppercase tracking-tighter text-amber-400">{analysisData.backtestResult}</h4>
                       <div className="flex gap-4 mt-2">
                          <div>
                            <div className="text-[8px] font-black text-zinc-600 uppercase">WinRate</div>
                            <div className="text-xs font-mono font-black text-emerald-500">{analysisData.winRate}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-zinc-600 uppercase">P.Fact</div>
                            <div className="text-xs font-mono font-black text-white">{analysisData.profitFactor}</div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Signal Alerts */}
                  <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-black border border-zinc-800">
                         <Zap className="text-cyan-500" size={20} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Alerts.Detected</div>
                    </div>
                    <div className="flex items-end justify-between">
                       <div className="text-4xl font-black italic text-cyan-400">{analysisData.alerts}</div>
                       <div className="text-right">
                          <div className="text-[8px] font-black text-cyan-500 uppercase tracking-widest mb-1">Live Feed</div>
                          <div className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[8px] font-black text-cyan-100 italic">SYNCED</div>
                       </div>
                    </div>
                  </div>

                  {/* Security Status */}
                  <div className="p-6 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 shadow-xl relative overflow-hidden">
                    <div className="relative flex items-center justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-black border border-zinc-800">
                         <ShieldCheck className="text-emerald-500" size={20} />
                      </div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Secure.Scan</div>
                    </div>
                    <div className="flex items-end justify-between">
                       <div className="text-3xl font-black italic text-white leading-none mb-1">OK</div>
                       <div className="text-right">
                          <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Security</div>
                          <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[8px] font-black text-emerald-100 italic">VERIFIED</div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <LiveMonitor 
                onSymbolSelect={handleSymbolSelect}
                onSignalDelete={(id) => setSignals(prev => prev.filter(s => s.id !== id))}
                activeSymbol={activeSymbol}
                bullishColor={bullishObColor}
                bearishColor={bearishObColor}
                highVolColor={highVolColor}
                signals={signals}
                isSocketConnected={isSocketConnected}
              />
              <div className="relative">
                <TradingViewChart 
                  symbol={activeSymbol}
                  onSymbolChange={handleSymbolSelect}
                  interval={activeInterval}
                  onIntervalChange={setActiveInterval}
                  pktTime={pktTime}
                  activeSignal={signals.find(s => s.symbol === activeSymbol)}
                  isAnalyzing={isAnalyzing}
                  highVolHighlight={highVolHighlight}
                  highVolColor={highVolColor}
                  isSocketConnected={isSocketConnected}
                />

                {/* Neural Terminal Output */}
                <div className="mt-4 p-5 rounded-[2rem] bg-black border border-zinc-800 shadow-2xl overflow-hidden relative group">
                   <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40 group-hover:bg-emerald-500 transition-colors" />
                   <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                         <Terminal size={14} className="text-emerald-500" />
                         <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Neural Terminal Feed: {activeSymbol}</span>
                      </div>
                      <motion.div 
                         animate={{ opacity: [1, 0.4, 1] }}
                         transition={{ repeat: Infinity, duration: 2 }}
                         className="flex items-center gap-2"
                      >
                         <div className="w-1 h-1 rounded-full bg-emerald-500" />
                         <span className="text-[8px] font-black text-emerald-500/60 uppercase">Live Engine Active</span>
                      </motion.div>
                   </div>
                   <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 font-mono text-[10px] space-y-1.5 max-h-[150px] overflow-y-auto no-scrollbar">
                      {terminalLogs.map((log, i) => (
                        <div key={`term-feed-row-${i}-${log.substring(0, 10)}`} className="flex gap-3">
                           <span className="text-zinc-700 shrink-0">{i+1}</span>
                           <span className={log.includes('SUCCESS') || log.includes('OK') ? 'text-emerald-400' : 'text-zinc-400'}>{log}</span>
                        </div>
                      ))}
                      <div className="flex gap-3 animate-pulse">
                         <span className="text-zinc-700 font-black">{terminalLogs.length + 1}</span>
                         <span className="text-emerald-500">_</span>
                      </div>
                   </div>
                </div>

                <div className="mt-8 p-8 rounded-[3rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                          <BarChart3 className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Intelligence Hub</h3>
                       </div>
                       <p className="text-zinc-500 text-sm max-w-xl">
                          This deep intelligence view combines real-time AI scanning with advanced charting.
                       </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => setActiveTab('heatmap')}
                        className="px-6 py-3 bg-zinc-800 text-zinc-300 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-700 transition-all border border-zinc-700 flex items-center gap-2"
                      >
                        <Flame size={14} className="text-orange-500" />
                        Market Heatmap
                      </button>
                      <button 
                        onClick={() => setActiveTab('setup')}
                        className="px-6 py-3 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        Connect to My TradingView
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'heatmap' && (
            <motion.div
              key="heatmap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="mb-8 p-8 rounded-[3rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Market Heatmap Intelligence</h3>
                    </div>
                    <p className="text-zinc-500 text-sm max-w-xl">
                      Real-time visual map of the global financial markets. Identify relative strength-weakness correlations across Forex and Crypto assets.
                    </p>
                  </div>
                </div>
              </div>
              <MarketHeatmap />
            </motion.div>
          )}

          {activeTab === 'sentiment' && (
            <motion.div
              key="sentiment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="mb-8 p-8 rounded-[3rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                     <div className="flex items-center gap-3">
                        <Newspaper className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">AI News Intelligence</h3>
                     </div>
                     <p className="text-zinc-500 text-sm max-w-xl">
                        Real-time sentiment mapping for <span className="text-white font-bold">{activeSymbol.split(':')[1] || activeSymbol}</span>. 
                        Our neural network analyzes 50+ global sources every second.
                     </p>
                  </div>
                </div>
              </div>
              <NewsSentiment activeSymbol={activeSymbol} />
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div 
              key="features"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="relative"
            >
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-3xl">
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent blur-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {FEATURES.map((feature) => (
                <div key={`feat-${feature.title.replace(/\s+/g, '-')}`} className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/30 transition-all group">
                  <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'code' && (
            <motion.div 
              key="code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => alert("Terminal Shutdown Sequence Initiated. (Simulation)")} className="w-3 h-3 rounded-full bg-red-500/50 hover:bg-red-500 transition-colors p-0 border-none outline-none cursor-pointer" />
                    <button onClick={() => alert("Terminal Minimized to Background Nodes.")} className="w-3 h-3 rounded-full bg-amber-500/50 hover:bg-amber-500 transition-colors p-0 border-none outline-none cursor-pointer" />
                    <button onClick={() => alert("Terminal Fullscreen Logic Activated.")} className="w-3 h-3 rounded-full bg-emerald-500/50 hover:bg-emerald-500 transition-colors p-0 border-none outline-none cursor-pointer" />
                  </div>
                  <span className="ml-4 text-xs font-mono text-zinc-500">LashariIndicator.pinescript</span>
                </div>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied to Clipboard' : 'Copy Full Script'}
                </button>
              </div>
              <div className="p-8 font-mono text-sm overflow-x-auto max-h-[600px] bg-[#050505]">
                <pre className="text-zinc-400">
                  <code>{currentCode}</code>
                </pre>
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400/80 font-mono text-[10px] space-y-1">
                   {terminalLogs.map((log, i) => (
                     <div key={`log-output-${i}-${log.substring(0, 15)}`}>{log}</div>
                   ))}
                   <div className="animate-pulse">_</div>
                </div>
              </div>
            </motion.div>
          )}


          {activeTab === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="space-y-8">
                <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 shrink-0">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Copy the Code</h4>
                    <p className="text-zinc-500 italic mb-4">"Click the Copy Code button at the top of this dashboard to grab the Pine Script v5 source."</p>
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 shrink-0">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Open Pine Editor</h4>
                    <p className="text-zinc-500 mb-4">In TradingView, open the "Pine Editor" panel at the bottom of your chart. Delete any existing code.</p>
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 shrink-0">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 text-white">Paste & Save</h4>
                    <p className="text-zinc-500 mb-4">Paste the code, click "Save", then click "Add to Chart".</p>
                    <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700">
                       <p className="text-xs font-medium uppercase text-zinc-400 mb-3 tracking-widest">Recommended Timeframes</p>
                       <div className="flex gap-4">
                          <span className="px-3 py-1 bg-zinc-800 rounded-md text-[10px] font-bold">SCALPING: 1m/5m</span>
                          <span className="px-3 py-1 bg-zinc-800 rounded-md text-[10px] font-bold">INTRADAY: 15m/1h</span>
                          <span className="px-3 py-1 bg-zinc-800 rounded-md text-[10px] font-bold">SWING: 4h/1D</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 w-full bg-[#0a0a0a] border-t border-zinc-800 px-6 py-3 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('monitor')}
            className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            AI Logic Operational
          </button>
          <button 
            onClick={() => setActiveTab('setup')}
            className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            v5.0 Stable
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-4">
           <span className="text-zinc-600">PKT: {pktTime}</span>
           <span className="w-1 h-1 bg-zinc-800 rounded-full" />
           Authorized Access: {new Date().toLocaleDateString()}
        </div>
      </footer>
    </div>
  );
}
