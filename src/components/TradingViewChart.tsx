import React, { useState } from 'react';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';
import { Code2, Copy, Check, Info, ExternalLink, X, Zap, PenLine, MousePointer2, Trash2, Palette, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Signal } from '../types';

interface TrendLine {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  color: string;
}

interface TradingViewChartProps {
  symbol: string;
  onSymbolChange: (s: string) => void;
  interval: string;
  onIntervalChange: (i: string) => void;
  pktTime?: string;
  activeSignal?: Signal;
  isAnalyzing?: boolean;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  symbol, 
  onSymbolChange, 
  interval, 
  onIntervalChange,
  pktTime,
  activeSignal,
  isAnalyzing
}) => {
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [indicatorScript, setIndicatorScript] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const steps = [
    "Initializing Neural Core...",
    "Analyzing Market Structure...",
    "Scanning Liquidity Zones...",
    "Validating Strategy Alerts...",
    "Compiling Neural Backtests...",
    "Syncing Realtime Data..."
  ];

  React.useEffect(() => {
    if (isAnalyzing) {
      setAnalysisStep(0);
      const interval = setInterval(() => {
        setAnalysisStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 350);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const quickSymbols = [
    { name: 'BTC', value: 'BINANCE:BTCUSDT' },
    { name: 'ETH', value: 'BINANCE:ETHUSDT' },
    { name: 'SOL', value: 'BINANCE:SOLUSDT' },
    { name: 'XAU/USD', value: 'OANDA:XAUUSD' },
    { name: 'EUR/USD', value: 'FX:EURUSD' },
    { name: 'GBP/USD', value: 'FX:GBPUSD' },
    { name: 'USD/JPY', value: 'FX:USDJPY' },
    { name: 'Tesla', value: 'NASDAQ:TSLA' },
    { name: 'Nvidia', value: 'NASDAQ:NVDA' },
    { name: 'Apple', value: 'NASDAQ:AAPL' },
    { name: 'Nasdaq', value: 'NASDAQ:NDX' },
  ];

  const intervals = [
    { name: '1m', value: '1' },
    { name: '5m', value: '5' },
    { name: '15m', value: '15' },
    { name: '1h', value: '60' },
    { name: '4h', value: '240' },
    { name: '1D', value: 'D' },
    { name: '1W', value: 'W' },
  ];

  // Pre-fetch script when modal opens to ensure synchronous copy action
  React.useEffect(() => {
    if (showIndicatorModal && !indicatorScript) {
      fetch('/LashariIndicator.pinescript')
        .then(res => res.text())
        .then(text => setIndicatorScript(text))
        .catch(err => console.error('Failed to pre-fetch script:', err));
    }
  }, [showIndicatorModal, indicatorScript]);

  const [isIndicatorActive, setIsIndicatorActive] = useState(true); // Default to true as requested
  
  // Drawing Tools State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [lines, setLines] = useState<TrendLine[]>([]);
  const [currentLine, setCurrentLine] = useState<Partial<TrendLine> | null>(null);
  const [drawColor, setDrawColor] = useState('#10b981'); // Default emerald
  
  const colors = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'White', value: '#ffffff' },
  ];

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentLine({
      id: Math.random().toString(36).substring(2, 11),
      start: { x, y },
      end: { x, y },
      color: drawColor
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode || !currentLine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentLine(prev => ({
      ...prev,
      end: { x, y }
    }));
  };

  const handleMouseUp = () => {
    if (!isDrawingMode || !currentLine) return;
    if (currentLine.start && currentLine.end) {
      // Only add if it's not just a click (minimum length)
      const dist = Math.sqrt(
        Math.pow(currentLine.end.x - currentLine.start.x, 2) + 
        Math.pow(currentLine.end.y - currentLine.start.y, 2)
      );
      if (dist > 5) {
        setLines(prev => [...prev, currentLine as TrendLine]);
      }
    }
    setCurrentLine(null);
  };

  const clearLines = () => {
    setLines([]);
  };

  const [liveMetrics, setLiveMetrics] = useState({
    trend: 'Bullish',
    confidence: 84,
    wave: 'Impulse 3/5',
    status: 'Market Structure Shift'
  });

  // Simulated AI Logic for the "Linked" Indicator
  React.useEffect(() => {
    if (!isIndicatorActive) return;

    const intervalId = window.setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        confidence: Math.min(98, Math.max(70, prev.confidence + (Math.random() > 0.5 ? 1 : -1))),
        status: Math.random() > 0.95 ? 'BOS Detected' : Math.random() > 0.95 ? 'Liquidity Sweep' : prev.status
      }));
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isIndicatorActive, symbol]);

  const handleCopyIndicator = async () => {
    const textToCopy = indicatorScript;
    if (!textToCopy) return;

    try {
      // Primary method: Modern Clipboard API
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Modern clipboard API failed, trying fallback:', err);
      
      // Fallback method: Hidden Textarea + execCommand
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        
        // Ensure it's not visible but still part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('execCommand copy was unsuccessful');
        }
      } catch (fallbackErr) {
        console.error('Final fallback copy failed:', fallbackErr);
        // If all else fails, alert the user or show an error state
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Quick Symbol Switcher */}
          <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit">
            {quickSymbols.map((item) => (
              <button
                key={item.value}
                id={`symbol-${item.name}`}
                onClick={() => onSymbolChange(item.value)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  symbol === item.value 
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Timeframe Switcher */}
          <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit">
            {intervals.map((item) => (
              <button
                key={item.value}
                id={`interval-${item.name}`}
                onClick={() => onIntervalChange(item.value)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  interval === item.value 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
           {/* Drawing Controls */}
           <div className="flex items-center gap-2 p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl mr-2">
             <button
               onClick={() => setIsDrawingMode(!isDrawingMode)}
               className={`p-2 rounded-xl transition-all ${
                 isDrawingMode 
                   ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                   : 'text-zinc-500 hover:text-zinc-300'
               }`}
               title={isDrawingMode ? "Disable Drawing" : "Enable Drawing"}
             >
               {isDrawingMode ? <PenLine size={14} /> : <MousePointer2 size={14} />}
             </button>
             
             {isDrawingMode && (
               <>
                 <div className="h-4 w-px bg-zinc-800 mx-1" />
                 <div className="flex gap-1">
                   {colors.map(c => (
                     <button
                       key={c.value}
                       onClick={() => setDrawColor(c.value)}
                       className={`w-4 h-4 rounded-full border border-white/10 transition-transform ${
                         drawColor === c.value ? 'scale-125 border-white ring-2 ring-white/20' : 'hover:scale-110'
                       }`}
                       style={{ backgroundColor: c.value }}
                     />
                   ))}
                 </div>
                 <div className="h-4 w-px bg-zinc-800 mx-1" />
                 <button
                   onClick={clearLines}
                   className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                   title="Clear All Lines"
                 >
                   <Trash2 size={14} />
                 </button>
               </>
             )}
           </div>

           {isIndicatorActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                 <Zap size={10} className="text-indigo-500 animate-pulse" />
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Lashari AI Link Active</span>
              </div>
           )}

           <button 
             id="open-pine-editor-btn"
             onClick={() => setShowIndicatorModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all group"
           >
              <PenLine size={12} className="group-hover:rotate-12 transition-transform" />
              Pine Editor
           </button>

           <button 
             id="open-indicator-btn"
             onClick={() => setShowIndicatorModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition-all group"
           >
              <Zap size={12} className="group-hover:animate-pulse" />
              Lashari AI Indicator
           </button>

           <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Active Terminal</span>
              {pktTime && (
                <span className="ml-2 pl-2 border-l border-zinc-800 text-[10px] font-mono text-emerald-500/80">{pktTime} PKT</span>
              )}
           </div>
        </div>
      </div>

        <div className="flex flex-col gap-4">
          <div className="relative group">
            {/* Linked Status Badge on Chart */}
            {isIndicatorActive && (
          <div className="absolute top-4 right-16 z-10 pointer-events-none">
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-indigo-500/30 rounded-full"
            >
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Lashari AI Link Sync: {liveMetrics.confidence}%</span>
            </motion.div>
          </div>
        )}

        <div className="w-full h-[650px] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#0a0a0a] relative">
          {/* Signal Intelligence Overlay */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
              >
                <div className="text-center space-y-6">
                  <div className="relative">
                     <div className="w-24 h-24 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin mx-auto" />
                     <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="text-emerald-500 animate-pulse" size={32} />
                     </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Initiating Neural Scan</h4>
                    <div className="flex items-center justify-center gap-3 text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.2em] relative min-h-[20px]">
                       <motion.div
                         key={steps[analysisStep]}
                         initial={{ opacity: 0, y: 5 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -5 }}
                         className="flex items-center gap-2"
                       >
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          {steps[analysisStep]}
                       </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSignal && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute top-4 left-4 z-40 w-72 pointer-events-auto"
              >
                <div className="p-5 rounded-[2rem] bg-black/60 backdrop-blur-xl border border-zinc-700/50 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Shield size={14} className={activeSignal.bias === 'bullish' ? 'text-emerald-400' : 'text-rose-400'} />
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Intelligent Signal</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      activeSignal.status === 'executed' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                      activeSignal.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' : 
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                    }`}>
                      {activeSignal.executionLabel}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Technical Reason</div>
                    <p className="text-[11px] text-zinc-200 leading-relaxed font-medium italic">
                      "{activeSignal.reason}"
                    </p>
                  </div>

                  {activeSignal.isConfirmed && (
                    <div className="pt-3 border-t border-emerald-500/20 space-y-1.5">
                       <div className="flex items-center gap-2">
                          <Check size={10} className="text-emerald-400" fill="currentColor" />
                          <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Dual Confirmed</div>
                       </div>
                       <p className="text-[10px] text-emerald-200/80 font-bold leading-tight">
                          {activeSignal.confirmationReason}
                       </p>
                    </div>
                  )}

                  {activeSignal.vsaReason && (
                    <div className="pt-3 border-t border-zinc-800/50 space-y-1">
                       <div className="flex items-center gap-2">
                          <Zap size={10} className="text-orange-500" />
                          <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest">VSA Basis</div>
                       </div>
                       <p className="text-[11px] text-orange-200/80 font-bold">
                          {activeSignal.vsaReason}
                       </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-800/50 grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                       <div className="text-[7px] font-black text-zinc-600 uppercase mb-0.5 tracking-tighter">Confidence</div>
                       <div className="text-xs font-black text-emerald-400">{activeSignal.confidence}%</div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                       <div className="text-[7px] font-black text-zinc-600 uppercase mb-0.5 tracking-tighter">Bias</div>
                       <div className={`text-xs font-black uppercase ${activeSignal.bias === 'bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {activeSignal.bias}
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drawing Overlay */}
          <svg 
            className={`absolute inset-0 z-20 w-full h-full ${isDrawingMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {lines.map(line => (
              <line
                key={line.id}
                x1={line.start.x}
                y1={line.start.y}
                x2={line.end.x}
                y2={line.end.y}
                stroke={line.color}
                strokeWidth="2"
                strokeDasharray={line.color === '#ffffff' ? '4 4' : '0'}
                className="drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]"
              />
            ))}
            {currentLine && currentLine.start && currentLine.end && (
              <line
                x1={currentLine.start.x}
                y1={currentLine.start.y}
                x2={currentLine.end.x}
                y2={currentLine.end.y}
                stroke={currentLine.color}
                strokeWidth="2"
                strokeDasharray="4 2"
                className="opacity-50"
              />
            )}
          </svg>

          <AdvancedRealTimeChart
          key={`${symbol}-${interval}`} 
          theme="dark"
          autosize
          symbol={symbol}
          interval={interval as any}
          timezone="Etc/UTC"
          style="1"
          locale="en"
          toolbar_bg="#0a0a0a"
          enable_publishing={false}
          hide_side_toolbar={false}
          allow_symbol_change={true}
          save_image={true}
          studies={[
            "EMA@tv-basicstudies",
            "RSI@tv-basicstudies",
            "MACD@tv-basicstudies"
          ]}
          watchlist={[
            "BINANCE:BTCUSDT",
            "BINANCE:ETHUSDT",
            "OANDA:XAUUSD",
            "FX:EURUSD",
            "FX:GBPUSD",
            "NASDAQ:AAPL",
            "NASDAQ:TSLA",
            "NASDAQ:NVDA"
          ]}
          details={true}
          hotlist={true}
          calendar={true}
          container_id="tradingview_advanced_chart"
          />
        </div>
      </div>

      {/* Lashari Command Center (Indicator Dashboard) */}
      <AnimatePresence>
        {isIndicatorActive && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-zinc-900/50 border border-zinc-800 rounded-[32px]"
          >
            <div className="space-y-1">
               <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Lashari AI Trend</span>
               <div className="flex items-center gap-2 bg-zinc-950 p-3 rounded-2xl border border-zinc-800/50">
                  <div className={`w-2 h-2 rounded-full ${liveMetrics.trend === 'Bullish' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-[10px] font-black uppercase text-zinc-200">{liveMetrics.trend} Confirmation</span>
               </div>
            </div>

            <div className="space-y-1">
               <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Confidence Score</span>
               <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-indigo-400">{liveMetrics.confidence}%</span>
                    <span className="text-[10px] font-black text-zinc-500">ACCURACY</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500" 
                      animate={{ width: `${liveMetrics.confidence}%` }}
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-1">
               <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">SMC Detection</span>
               <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800/50">
                  <span className="text-[10px] font-black uppercase text-emerald-400 animate-pulse">{liveMetrics.status}</span>
               </div>
            </div>

            <div className="space-y-1">
               <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-1">Wave Theory</span>
               <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-2xl border border-zinc-800/50">
                  <span className="text-[10px] font-black uppercase text-zinc-400">{liveMetrics.wave}</span>
                  <Code2 size={10} className="text-zinc-600" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicator Modal */}
      <AnimatePresence>
        {showIndicatorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIndicatorModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <Zap size={20} className="text-indigo-500" />
                       <h2 className="text-xl font-black text-white uppercase tracking-tight">Lashari Smart Money AI</h2>
                    </div>
                    <p className="text-zinc-500 text-sm">Professional SMC & AI Sentiment Pine Script Indicator for TradingView.</p>
                  </div>
                  <button 
                    onClick={() => setShowIndicatorModal(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div className="p-4 rounded-3xl bg-zinc-950/50 border border-zinc-800/50 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                           <Info size={14} />
                           How to Install
                        </div>
                        <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
                           <li>Copy the script using the button below.</li>
                           <li>Open your <span className="text-zinc-200">TradingView Chart</span>.</li>
                           <li>Open the <span className="text-zinc-200">Pine Editor</span> at the bottom.</li>
                           <li>Paste the code, Save, and click <span className="text-zinc-200">"Add to Chart"</span>.</li>
                        </ol>
                     </div>

                     <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Preview Code</span>
                          <button 
                            onClick={handleCopyIndicator}
                            className="text-[10px] font-black text-indigo-500 uppercase hover:text-indigo-400 transition-colors"
                          >
                            {copied ? 'Copied!' : 'Copy All'}
                          </button>
                        </div>
                        <div className="h-48 rounded-2xl bg-zinc-950 border border-zinc-800 p-4 font-mono text-[9px] text-zinc-500 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                           <pre>{indicatorScript || 'Loading script...'}</pre>
                        </div>
                     </div>

                         <div className="flex gap-3">
                           <button
                              onClick={handleCopyIndicator}
                              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                                copied 
                                  ? 'bg-emerald-500 text-black' 
                                  : 'bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/10'
                              }`}
                            >
                              {copied ? (
                                <>
                                  <Check size={16} />
                                  Pen Added!
                                </>
                              ) : (
                                <>
                                  <PenLine size={16} />
                                  Add Pen (Save Scrip)
                                </>
                              )}
                            </button>

                            <button
                              id="save-run-btn"
                              className="px-6 py-4 rounded-2xl bg-indigo-500 text-white font-black uppercase tracking-widest hover:bg-indigo-400 transition-all border border-indigo-400 shadow-xl shadow-indigo-500/20"
                              onClick={() => {
                                // Simulate saving to terminal
                                setCopied(true);
                                setIsIndicatorActive(true);
                                setTimeout(() => {
                                  setCopied(false);
                                  setShowIndicatorModal(false);
                                }, 1500);
                              }}
                            >
                              Save & Run To Terminal
                            </button>
                         </div>
                  </div>

                  <div className="space-y-4">
                     <div className="p-4 rounded-3xl bg-zinc-950/50 border border-zinc-800/50 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                           <Zap size={14} />
                           Core Features
                        </div>
                        <ul className="text-[10px] text-zinc-500 space-y-1.5 font-bold uppercase tracking-wide">
                           <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Smart Money Concepts (BOS/CHOCH)</li>
                           <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Liquidity Sweep Analysis</li>
                           <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Order Block Mitigation</li>
                           <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> AI Confidence Breakdown</li>
                           <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-emerald-500" /> Multi-Timeframe Confirmation</li>
                        </ul>
                     </div>

                     <a 
                      href="https://www.tradingview.com/chart/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-zinc-700 text-white font-black uppercase tracking-widest hover:bg-zinc-800 transition-all text-xs"
                    >
                      Open TradingView <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  <span>Version 1.4.0 (Stable)</span>
                  <span>© Lashari Trading AI</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};
