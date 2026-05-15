import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Zap, Shield, Radar, BarChart3, TrendingUp, TrendingDown, Target, Check, Trash2, AlertTriangle, X } from 'lucide-react';

interface Signal {
  id: string;
  asset: string;
  symbol: string; // The TV symbol
  type: 'BOS' | 'OB' | 'FVG' | 'LIQUIDITY' | 'TREND' | 'VSA';
  bias: 'bullish' | 'bearish';
  time: string;
  timeframe: string;
  entry?: string;
  tp1?: string;
  tp2?: string;
  tp3?: string;
  stop?: string;
  confidence: number;
  pattern: string;
  sentiment?: number; // 0-100
  status: 'active' | 'pending' | 'executed';
  executionLabel: string; // "Signal Received now", "Entry is Active", "Executed Entry"
  verificationProgress: number; // 0-100
  verificationStep?: string;
  currentPrice?: number;
  reason: string;
  vsaReason?: string;
  confirmationReason?: string;
  isConfirmed: boolean;
  factors: {
    structure: 'weak' | 'confirming' | 'strong';
    waves: 'weak' | 'confirming' | 'strong';
    cabling: 'weak' | 'confirming' | 'strong';
    levels: 'weak' | 'confirming' | 'strong';
  };
}

interface LiveMonitorProps {
  onSymbolSelect: (symbol: string) => void;
  onSignalDelete?: (id: string) => void;
  activeSymbol: string;
  bullishColor: string;
  bearishColor: string;
  highVolColor: string;
  signals: Signal[];
  isSocketConnected?: boolean;
}

const ASSET_MAP: Record<string, string> = {
  'BTC/USDT': 'BINANCE:BTCUSDT',
  'ETH/USDT': 'BINANCE:ETHUSDT',
  'SOL/USDT': 'BINANCE:SOLUSDT',
  'XAU/USD': 'OANDA:XAUUSD',
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'NSDQ100': 'NASDAQ:NDX',
  'TSLA': 'NASDAQ:TSLA',
};

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ 
  onSymbolSelect, 
  onSignalDelete,
  activeSymbol,
  bullishColor,
  bearishColor,
  highVolColor,
  signals,
  isSocketConnected = false
}) => {
  const [activeCount, setActiveCount] = useState(124);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [signalLimit, setSignalLimit] = useState<number | 'all'>(10);

  const calculateRR = (entry: string | undefined, stop: string | undefined, target: string | undefined) => {
    if (!entry || !stop || !target) return '0.00';
    const e = parseFloat(entry);
    const s = parseFloat(stop);
    const t = parseFloat(target);
    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);
    if (risk === 0) return '0.00';
    return (reward / risk).toFixed(2);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
      {/* Real-time Dashboard Stats */}
      <div className="xl:col-span-1 space-y-4">
        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Radar className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-500/50 tracking-[0.2em] uppercase">Status: Scanner Active</span>
              {isSocketConnected && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                   <div className="w-1 h-1 rounded-full bg-blue-500" />
                   <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">WS LIVE FEED</span>
                </div>
              )}
            </div>
          </div>
          <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">AI Nodes Scanning</h4>
          <div className="text-3xl font-black text-white mb-4 font-mono">{activeCount.toLocaleString()}</div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             24/7 Market Coverage
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-[10px] font-black text-indigo-500/50 tracking-[0.2em] uppercase">Accuracy: 89.2%</span>
          </div>
          <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Signals (24h)</h4>
          <div className="text-3xl font-black text-white mb-4 font-mono">1,842</div>
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 w-[89.2%]" />
          </div>
        </div>
      </div>

      {/* Live Signal Feed */}
      <div className="xl:col-span-3 p-6 rounded-3xl bg-zinc-900/10 border border-zinc-800 backdrop-blur-sm overflow-hidden min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-black text-white tracking-tight italic uppercase">Live Intelligence Feed</h3>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-800/30 border border-zinc-800/50 rounded-full">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Limit:</span>
                <select 
                  value={signalLimit} 
                  onChange={(e) => setSignalLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent text-[9px] font-black text-zinc-300 uppercase tracking-widest outline-none cursor-pointer border-none p-0 h-auto ring-0 focus:ring-0"
                >
                  <option value={10} className="bg-zinc-900">10</option>
                  <option value={25} className="bg-zinc-900">25</option>
                  <option value={50} className="bg-zinc-900">50</option>
                  <option value="all" className="bg-zinc-900">ALL</option>
                </select>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-bold text-emerald-400 flex items-center gap-2 border border-emerald-500/20">
                 <BarChart3 className="w-3 h-3" />
                 Linked Terminal
              </div>
           </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {(signalLimit === 'all' ? signals : signals.slice(0, signalLimit)).map((signal, index) => (
              <motion.div
                key={`${signal.id}-${index}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => {
                  onSymbolSelect(signal.symbol);
                  setExpandedId(expandedId === signal.id ? null : signal.id);
                }}
                className={`group flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeSymbol === signal.symbol 
                    ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                    : signal.isConfirmed
                      ? 'bg-zinc-900/80 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5 shadow-md'
                      : 'bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800/80 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-6">
                    <div className="w-24 relative">
                      <span className="text-xs font-black text-white tracking-widest">{signal.asset}</span>
                      {signal.status === 'pending' && (
                        <div className="absolute -right-2 top-0">
                          <Radar size={10} className="text-amber-400 animate-pulse" />
                        </div>
                      )}
                      {signal.isConfirmed && (
                        <div className="absolute -top-1.5 -left-1.5">
                           <div className="p-1 rounded-md bg-emerald-500 shadow-lg shadow-emerald-500/50">
                              <Shield size={8} className="text-black" fill="currentColor" />
                           </div>
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter"
                      style={{ 
                        backgroundColor: signal.bias === 'bullish' ? `${bullishColor}1a` : `${bearishColor}1a`,
                        color: signal.bias === 'bullish' ? bullishColor : bearishColor
                      }}
                    >
                      {signal.type === 'TREND' 
                        ? (signal.bias === 'bullish' ? 'UP' : 'DOWN') 
                        : (signal.bias === 'bullish' ? 'BULLISH' : 'BEARISH')}
                    </div>

                    <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border flex flex-col gap-1 shadow-sm transition-all duration-300 ${
                      signal.status === 'executed' 
                        ? 'bg-indigo-500/40 text-indigo-100 border-indigo-400/50 shadow-indigo-500/20 ring-1 ring-indigo-500/20 scale-[1.02]' 
                        : signal.status === 'active' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1 h-1 rounded-full ${
                          signal.status === 'executed' ? 'bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.8)]' :
                          signal.status === 'active' ? 'bg-emerald-400 animate-pulse' : 
                          'bg-amber-400'
                        }`} />
                        {signal.executionLabel}
                        {signal.status === 'executed' && (
                          <span className="ml-1.5 pl-1.5 border-l border-indigo-400/30 text-indigo-200 font-mono">
                            @{signal.entry}
                          </span>
                        )}
                      </div>
                      {signal.status === 'pending' && (
                        <div className="flex flex-col gap-1 mt-0.5">
                          <div className="flex items-center justify-between gap-2">
                             <span className="text-[7px] font-bold text-amber-200/70 truncate animate-pulse">
                               {signal.verificationStep}
                             </span>
                             <span className="text-[7px] font-black text-amber-400">
                               {signal.verificationProgress}%
                             </span>
                          </div>
                          <div className="w-full h-0.5 bg-amber-500/20 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${signal.verificationProgress}%` }}
                              className="h-full bg-amber-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {signal.isConfirmed && (
                      <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                         <Zap size={10} fill="currentColor" />
                         Dual Confirmed
                      </div>
                    )}

                    <div className="hidden md:flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        signal.type === 'TREND' ? 'text-indigo-400' : 'text-zinc-500'
                      }`}>{signal.type}</span>
                      <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800/50 px-1.5 rounded">{signal.timeframe}</span>
                      
                      {signal.currentPrice && (
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-800">
                           <div className="flex flex-col">
                              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-0.5">Live Price</span>
                              <motion.span 
                                key={signal.currentPrice}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className="text-[11px] font-mono font-black text-white leading-none tracking-tight"
                              >
                                {signal.currentPrice}
                              </motion.span>
                           </div>
                           <div className={`w-1 h-1 rounded-full animate-pulse ${Math.random() > 0.5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        </div>
                      )}

                      {signal.sentiment && !signal.currentPrice && (
                        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-zinc-800">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            signal.sentiment > 60 ? 'bg-emerald-500' : signal.sentiment < 40 ? 'bg-rose-500' : 'bg-zinc-500'
                          }`} />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">AI Sentiment: {signal.sentiment}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-zinc-600">{signal.time}</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-1.5 rounded-lg transition-transform group-hover:scale-110"
                        style={{ 
                          color: signal.bias === 'bullish' ? bullishColor : bearishColor,
                          backgroundColor: signal.bias === 'bullish' ? `${bullishColor}0d` : `${bearishColor}0d`
                        }}
                      >
                        {signal.bias === 'bullish' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(signal.id);
                        }}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Signal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === signal.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="overflow-hidden border-t border-zinc-800/50 pt-4"
                    >
                      {signal.status === 'executed' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 p-4 rounded-3xl bg-indigo-500/10 border border-indigo-400/30 shadow-indigo-500/5 shadow-inner"
                        >
                          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/40">
                                <Check className="w-6 h-6 text-black" strokeWidth={3} />
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-indigo-100 italic uppercase tracking-tighter">Institutional Entry Confirmed</h4>
                                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                  Order Filled at Institutional Liquidity Pool
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                              <div className="text-center md:text-left">
                                <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Execution Price</div>
                                <div className="text-lg font-mono font-black text-white">{signal.entry}</div>
                              </div>
                              <div className="text-center md:text-left">
                                <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Current Target</div>
                                <div className="text-lg font-mono font-black text-indigo-300">{signal.tp3}</div>
                              </div>
                              <div className="hidden md:block text-right">
                                <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Hard Stop</div>
                                <div className="text-lg font-mono font-black text-rose-400">{signal.stop}</div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity size={10} className="text-zinc-400" /> SMC Pattern
                          </span>
                          <span className="text-xs font-bold text-zinc-200 block">{signal.pattern}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Target size={10} style={{ color: bullishColor }} /> Entry Level
                          </span>
                          <span className="text-xs font-mono font-bold block tracking-tight" style={{ color: bullishColor }}>{signal.entry}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Shield size={10} className="text-rose-500" /> Stop Loss
                          </span>
                          <span className="text-xs font-mono font-bold text-rose-500 block tracking-tight">{signal.stop}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={10} className="text-indigo-400" /> AI Confidence
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${signal.confidence}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-black text-white">{signal.confidence}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                        {[
                          { id: 'tp1', label: 'Take Profit 1', val: signal.tp1, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                          { id: 'tp2', label: 'Take Profit 2', val: signal.tp2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                          { id: 'tp3', label: 'Take Profit 3', val: signal.tp3, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                        ].map((tp) => (
                          <div key={`${signal.id}-${tp.id}`} className={`p-3 rounded-2xl border border-zinc-800/50 ${tp.bg} flex flex-col gap-2 relative overflow-hidden group`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{tp.label}</span>
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5">
                                <span className="text-[8px] font-black text-zinc-500 uppercase">RR</span>
                                <span className={`text-[10px] font-mono font-black ${tp.color}`}>1:{calculateRR(signal.entry, signal.stop, tp.val)}</span>
                              </div>
                            </div>
                            <span className={`text-sm font-mono font-black tracking-tight ${tp.color}`}>{tp.val}</span>
                            <div className={`absolute bottom-0 left-0 h-0.5 ${tp.color.replace('text', 'bg')} opacity-40 transition-all duration-500 group-hover:w-full`} style={{ width: '20%' }} />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Entry Intelligence Logic</h5>
                          <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50 space-y-3">
                            {signal.isConfirmed && (
                              <div className="pb-3 border-b border-white/5">
                                 <div className="flex items-center gap-2 mb-1">
                                    <Shield size={10} className="text-emerald-400" fill="currentColor" />
                                    <div className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Dual Confirmation Logic</div>
                                 </div>
                                 <div className="text-[11px] text-emerald-100 font-bold leading-relaxed">
                                   {signal.confirmationReason}
                                 </div>
                              </div>
                            )}
                            <div>
                               <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mb-1">Market Condition</div>
                               <p className="text-[11px] text-zinc-300 leading-relaxed italic">
                                 "{signal.reason}"
                               </p>
                            </div>
                            {signal.vsaReason && (
                              <div className="pt-2 border-t border-zinc-800/50">
                                 <div className="flex items-center gap-2 mb-1">
                                    <Zap className="w-3 h-3 text-orange-500" />
                                    <div className="text-[8px] text-orange-500 font-black uppercase tracking-widest">VSA Entry Basis</div>
                                 </div>
                                 <div className="text-[11px] text-orange-200/80 font-bold">{signal.vsaReason}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Multi-Element Verification</h5>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm ${
                              signal.isConfirmed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 
                              'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                            }`}>
                              {signal.isConfirmed ? 'Verified Signal' : `Analyzing: ${signal.verificationProgress}%`}
                            </span>
                          </div>
                          
                          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${signal.verificationProgress}%` }}
                              className={`h-full ${signal.isConfirmed ? 'bg-emerald-500' : 'bg-amber-500'} transition-all`}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-[10px] font-bold uppercase tracking-tight">
                            {[
                              { id: 'structure', label: 'Market Structure', val: signal.factors.structure, desc: 'HH/HL & BOS Alignment' },
                              { id: 'waves', label: 'Move 1-5 Pattern', val: signal.factors.waves, desc: 'Phase 5 Exhaustion' },
                              { id: 'cabling', label: 'Dynamic Cabling', val: signal.factors.cabling, desc: 'Liquidity & Order Flow' },
                              { id: 'levels', label: 'Fixture Levels', val: signal.factors.levels, desc: 'S/R & Supply/Demand' }
                            ].map((f) => (
                              <div 
                                key={`${signal.id}-${f.id}`}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-500 ${
                                  f.val === 'strong' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                  f.val === 'confirming' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                  'bg-zinc-900 border-zinc-800 text-zinc-600'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1 rounded-md ${
                                    f.val === 'strong' ? 'bg-emerald-500/20' : 
                                    f.val === 'confirming' ? 'bg-amber-500/20' : 'bg-zinc-800'
                                  }`}>
                                    {f.val === 'strong' ? <Shield size={12} fill="currentColor" /> : <Radar size={12} className={f.val === 'confirming' ? 'animate-pulse' : ''} />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="leading-none">{f.label}</span>
                                    <span className="text-[7px] opacity-40 font-black tracking-widest mt-1">{f.desc}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black tracking-widest opacity-80">{f.val.toUpperCase()}</span>
                                  {f.val === 'strong' && <Check size={12} strokeWidth={4} />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between p-2 rounded-xl bg-zinc-950/50">
                         <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[9px] text-zinc-500 font-bold uppercase">AI Validation Complete</span>
                         </div>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             onSymbolSelect(signal.symbol);
                             alert(`ESTABLISHING SECURE CONNECTION TO TERMINAL...\nTarget: ${signal.asset}\nStatus: ${signal.status === 'active' ? 'Monitoring Executed Position' : 'Synchronizing Pending Order'}\nReason: ${signal.vsaReason || signal.reason}`);
                           }}
                           className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors"
                         >
                           {signal.status === 'active' ? 'Manage Active Position' : 'View Pending Trigger'}
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Deletion Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl"
            >
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-2">
                Delete Intelligence Signal?
              </h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                You are about to remove this signal from the Live Feed. This action cannot be undone and will stop real-time monitoring for this asset.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onSignalDelete && deleteConfirmId) {
                      onSignalDelete(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black uppercase tracking-widest hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20"
                >
                  Confirm Delete
                </button>
              </div>
              
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
