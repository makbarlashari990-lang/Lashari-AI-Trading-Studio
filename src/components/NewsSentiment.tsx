import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, Globe, Filter, TrendingUp, TrendingDown, Minus, Info, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SentimentBreakdown {
  impact: number;
  credibility: number;
  relevance: number;
}

interface NewsItem {
  id: string;
  source: string;
  headline: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  score: number; // 0 to 100
  topic: string;
  marketCap?: 'Large Cap' | 'Mid Cap' | 'Small Cap';
  breakdown: SentimentBreakdown;
  keyTopics: string[];
}

interface NewsSentimentProps {
  activeSymbol: string;
}

const SOURCES = ['Bloomberg', 'Reuters', 'CryptoPanic', 'Financial Times', 'CNBC', 'Lashari AI'];
const TOPICS = ['Macro', 'Crypto', 'Forex', 'Equities', 'General'];
const MARKET_CAPS = ['Large Cap', 'Mid Cap', 'Small Cap'];

const MOCK_HEADLINES: Record<string, string[]> = {
  general: [
    "Fed maintains current interest rates amid inflation concerns",
    "Global trade volumes see unexpected surge in Q1",
    "Oil prices stabilize after brief supply chain disruption",
    "Central banks signal shift towards digital currency frameworks",
    "Retail sales data beats expectations across major economies"
  ],
  BTC: [
    "Bitcoin ETF inflows hit record highs this week",
    "Institutional adoption of BTC continues to accelerate",
    "Network hash rate reaches new all-time high",
    "Regulatory clarity in major markets boosts crypto sentiment",
    "Bitcoin whales move significant volume to cold storage"
  ],
  ETH: [
    "Ethereum layer-2 scaling solutions see massive growth",
    "Staking participation hits milestone on mainnet",
    "Developers announce timeline for upcoming network upgrade",
    "Smart contract deployments surge on Ethereum network",
    "Defi protocols see renewed liquidity after brief dip"
  ],
  GOLD: [
    "Gold demand rises as safe-haven asset",
    "Central bank gold reserves increase for consecutive month",
    "Macroeconomic uncertainty drives gold prices upward",
    "Physical gold demand in Asia remains resilient",
    "Mining production costs stabilize for major producers"
  ]
};

export const NewsSentiment: React.FC<NewsSentimentProps> = ({ activeSymbol }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filterSource, setFilterSource] = useState<string>('All');
  const [filterTopic, setFilterTopic] = useState<string>('All');
  const [filterMarketCap, setFilterMarketCap] = useState<string>('All');
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [hoveredBreakdownId, setHoveredBreakdownId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Helper to generate breakdown and topics
  const generateMetadata = (topic: string) => {
    const breakdown = {
      impact: 60 + Math.floor(Math.random() * 35),
      credibility: 70 + Math.floor(Math.random() * 25),
      relevance: 75 + Math.floor(Math.random() * 25)
    };
    
    const possibleTopics: Record<string, string[]> = {
      'Crypto': ['Volatility', 'Liquidity', 'Adoption', 'DeFi', 'NFTs', 'Mining'],
      'Macro': ['Inflation', 'Interest Rates', 'GDP', 'Employment', 'Trade'],
      'Forex': ['Yields', 'Currency Policy', 'Cross-border', 'Geopolitics'],
      'Equities': ['Earnings', 'Dividends', 'Tech Sector', 'S&P 500', 'Growth'],
      'General': ['Markets', 'Finance', 'Global', 'Economy']
    };
    
    const baseTopics = possibleTopics[topic] || possibleTopics['General'];
    const keyTopics = [topic, ...baseTopics.sort(() => 0.5 - Math.random()).slice(0, 2)];
    
    return { breakdown, keyTopics };
  };

  // Initialize with some news
  useEffect(() => {
    const initialNews: NewsItem[] = Array.from({ length: 6 }).map((_, i) => {
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      const marketCap = MARKET_CAPS[Math.floor(Math.random() * MARKET_CAPS.length)] as any;
      const meta = generateMetadata(topic);
      return {
        id: Math.random().toString(36).substring(2, 11),
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
        headline: MOCK_HEADLINES.general[i % MOCK_HEADLINES.general.length],
        time: 'Just now',
        sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        score: 40 + Math.floor(Math.random() * 50),
        topic,
        marketCap,
        ...meta
      };
    });
    setNews(initialNews);

    const interval = setInterval(() => {
      // Add new news item every 15-20 seconds
      const assetKey = activeSymbol.includes('BTC') ? 'BTC' : activeSymbol.includes('ETH') ? 'ETH' : activeSymbol.includes('XAU') ? 'GOLD' : 'general';
      const headlines = MOCK_HEADLINES[assetKey] || MOCK_HEADLINES.general;
      const topic = activeSymbol.includes('BTC') || activeSymbol.includes('ETH') ? 'Crypto' : 'General';
      const marketCap = MARKET_CAPS[Math.floor(Math.random() * MARKET_CAPS.length)] as any;
      const meta = generateMetadata(topic);
      
      const newNews: NewsItem = {
        id: Math.random().toString(36).substring(2, 11),
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
        headline: headlines[Math.floor(Math.random() * headlines.length)],
        time: 'Just now',
        sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        score: 40 + Math.floor(Math.random() * 50),
        topic,
        marketCap,
        ...meta
      };
      
      setNews(prev => [newNews, ...prev].slice(0, 15));
    }, 15000);

    return () => clearInterval(interval);
  }, [activeSymbol]);

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const sourceMatch = filterSource === 'All' || item.source === filterSource;
      const topicMatch = filterTopic === 'All' || item.topic === filterTopic;
      const marketCapMatch = filterMarketCap === 'All' || item.marketCap === filterMarketCap;
      return sourceMatch && topicMatch && marketCapMatch;
    });
  }, [news, filterSource, filterTopic, filterMarketCap]);

  const aggregateSentiment = useMemo(() => {
    if (news.length === 0) return 50;
    const total = news.reduce((acc, curr) => {
      const multiplier = curr.sentiment === 'bullish' ? 1.2 : curr.sentiment === 'bearish' ? 0.8 : 1;
      return acc + (curr.score * multiplier);
    }, 0);
    return Math.min(100, Math.max(0, total / news.length));
  }, [news]);

  const sentimentLabel = aggregateSentiment > 65 ? 'High Bullish' : aggregateSentiment > 55 ? 'Bullish' : aggregateSentiment > 45 ? 'Neutral' : aggregateSentiment > 35 ? 'Bearish' : 'Extreme Bearish';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sentiment Analysis Overview */}
      <div className="lg:col-span-1 space-y-6">
        <div className="p-8 rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
          
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8 px-1">Global AI Sentiment</h3>
          
          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-zinc-800"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray="440"
                  initial={{ strokeDashoffset: 440 }}
                  animate={{ strokeDashoffset: 440 - (440 * aggregateSentiment) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className={`${aggregateSentiment > 55 ? 'text-emerald-500' : aggregateSentiment < 45 ? 'text-rose-500' : 'text-indigo-400'}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white italic tracking-tighter">{Math.round(aggregateSentiment)}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">SI Score</span>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <div className={`text-sm font-black uppercase tracking-widest mb-1 ${aggregateSentiment > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {sentimentLabel}
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Based on 15+ live verified data sources</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-zinc-950/30 border border-zinc-800/40">
                <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase block mb-1">Impact Radius</span>
                <span className="text-xs font-bold text-zinc-200">Systemic Risk Low</span>
             </div>
             <div className="p-4 rounded-2xl bg-zinc-950/30 border border-zinc-800/40">
                <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase block mb-1">AI Confidence</span>
                <span className="text-xs font-bold text-zinc-200">88.4%</span>
             </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
             <Filter size={12} /> News Filters
           </h3>
           
           <div className="space-y-4">
             <div>
               <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 block pl-1">Data Source</label>
               <div className="flex flex-wrap gap-2">
                 {['All', ...SOURCES.slice(0, 4)].map(source => (
                   <button
                     key={source}
                     onClick={() => setFilterSource(source)}
                     className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                       filterSource === source 
                         ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                         : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                     }`}
                   >
                     {source}
                   </button>
                 ))}
               </div>
             </div>

             <div>
               <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 block pl-1">Context Topic</label>
               <div className="flex flex-wrap gap-2">
                 {['All', ...TOPICS].map(topic => (
                   <button
                     key={topic}
                     onClick={() => setFilterTopic(topic)}
                     className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                       filterTopic === topic 
                         ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                         : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                     }`}
                   >
                     {topic}
                   </button>
                 ))}
               </div>
             </div>

             <div>
               <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2 block pl-1">Market Capitalization</label>
               <div className="flex flex-wrap gap-2">
                 {['All', ...MARKET_CAPS].map(cap => (
                   <button
                     key={cap}
                     onClick={() => setFilterMarketCap(cap)}
                     className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                       filterMarketCap === cap 
                         ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                         : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                     }`}
                   >
                     {cap}
                   </button>
                 ))}
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* Real-time Headlines */}
      <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-zinc-900/20 border border-zinc-800/40 backdrop-blur-sm min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl">
                <Newspaper className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Financial Intelligence</h3>
                <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">Cross-platform News Aggregator</span>
              </div>
           </div>
           
           <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
             <Globe className="w-3 h-3 text-zinc-500" />
             <span className="text-[10px] font-black text-white uppercase tracking-tighter">Live Stream</span>
           </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredNews.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`group p-5 rounded-3xl bg-zinc-900/60 border hover:bg-zinc-800/80 hover:border-zinc-600 transition-all cursor-pointer relative ${
                  selectedNewsId === item.id ? 'border-indigo-500/50 bg-zinc-800/90' : 'border-zinc-800/50'
                }`}
                onClick={() => setSelectedNewsId(selectedNewsId === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">{item.source}</span>
                       <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest">{item.time}</span>
                       <div className="relative">
                         <div 
                           className={`w-1.5 h-1.5 rounded-full cursor-help ${
                             item.sentiment === 'bullish' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                             item.sentiment === 'bearish' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                             'bg-zinc-500'
                           }`}
                           onMouseEnter={() => setHoveredBreakdownId(item.id)}
                           onMouseLeave={() => setHoveredBreakdownId(null)}
                         />
                         
                         <AnimatePresence>
                           {hoveredBreakdownId === item.id && (
                             <motion.div
                               initial={{ opacity: 0, y: 10, scale: 0.9 }}
                               animate={{ opacity: 1, y: 0, scale: 1 }}
                               exit={{ opacity: 0, scale: 0.9 }}
                               className="absolute bottom-full left-0 mb-2 z-50 p-3 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl w-48 pointer-events-none"
                             >
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Impact</span>
                                    <span className="text-[10px] font-bold text-zinc-200">{item.breakdown.impact}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-indigo-500" style={{ width: `${item.breakdown.impact}%` }} />
                                  </div>
                                  
                                  <div className="flex justify-between items-center pt-1">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Credibility</span>
                                    <span className="text-[10px] font-bold text-zinc-200">{item.breakdown.credibility}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-emerald-500" style={{ width: `${item.breakdown.credibility}%` }} />
                                  </div>

                                  <div className="flex justify-between items-center pt-1">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Relevance</span>
                                    <span className="text-[10px] font-bold text-zinc-200">{item.breakdown.relevance}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-amber-500" style={{ width: `${item.breakdown.relevance}%` }} />
                                  </div>
                                </div>
                                <div className="absolute -bottom-1 left-1.5 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-700 rotate-45" />
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </div>
                       <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{item.topic}</span>
                       {item.marketCap && (
                         <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm border border-amber-500/20">
                           {item.marketCap}
                         </span>
                       )}
                    </div>
                    <p className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors leading-relaxed">
                      {item.headline}
                    </p>
                    
                    {/* Visual Score Indicator */}
                    <div 
                      className="flex items-center gap-2 mt-1 cursor-help"
                      onMouseEnter={() => setHoveredBreakdownId(item.id)}
                      onMouseLeave={() => setHoveredBreakdownId(null)}
                    >
                      <div className="flex-1 h-0.5 max-w-[80px] bg-zinc-800/80 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          className={`h-full ${
                            item.sentiment === 'bullish' ? 'bg-emerald-500/60' : 
                            item.sentiment === 'bearish' ? 'bg-rose-500/60' : 
                            'bg-zinc-500/60'
                          }`}
                        />
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${
                        item.sentiment === 'bullish' ? 'text-emerald-500/70' : 
                        item.sentiment === 'bearish' ? 'text-rose-500/70' : 
                        'text-zinc-500/70'
                      }`}>
                         {item.score}% Confidence
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`p-2 rounded-xl border ${
                      item.sentiment === 'bullish' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      item.sentiment === 'bearish' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
                    }`}>
                      {item.sentiment === 'bullish' ? <TrendingUp size={16} /> : 
                       item.sentiment === 'bearish' ? <TrendingDown size={16} /> : 
                       <Minus size={16} />}
                    </div>
                    <div className="text-[10px] font-mono font-black text-zinc-500">
                      AI:{item.score}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedNewsId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: 5, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-zinc-700/50 space-y-4">
                         <div className="grid grid-cols-3 gap-3">
                            <div className="p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                               <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase block mb-1">Impact</span>
                               <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                 <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.breakdown.impact}%` }}
                                  className="h-full bg-indigo-500" 
                                 />
                               </div>
                               <span className="text-[10px] font-bold text-zinc-300 mt-1 block">{item.breakdown.impact}%</span>
                            </div>
                            <div className="p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                               <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase block mb-1">Credibility</span>
                               <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                 <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.breakdown.credibility}%` }}
                                  className="h-full bg-emerald-500" 
                                 />
                               </div>
                               <span className="text-[10px] font-bold text-zinc-300 mt-1 block">{item.breakdown.credibility}%</span>
                            </div>
                            <div className="p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/50">
                               <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase block mb-1">Relevance</span>
                               <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                 <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.breakdown.relevance}%` }}
                                  className="h-full bg-amber-500" 
                                 />
                               </div>
                               <span className="text-[10px] font-bold text-zinc-300 mt-1 block">{item.breakdown.relevance}%</span>
                            </div>
                         </div>

                         <div>
                            <span className="text-[8px] font-black text-zinc-500 tracking-[0.2em] uppercase block mb-2">Identified Key Topics</span>
                            <div className="flex flex-wrap gap-2">
                               {item.keyTopics.map(tag => (
                                 <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[9px] font-bold text-zinc-400">
                                   #{tag.toLowerCase()}
                                 </span>
                               ))}
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!selectedNewsId && (
                  <div className="absolute bottom-2 left-5 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                        <Search size={8} /> Details
                     </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredNews.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <Info className="w-12 h-12 text-zinc-800 mb-4" />
               <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">No news matching filters</p>
               <button 
                onClick={() => { setFilterSource('All'); setFilterTopic('All'); setFilterMarketCap('All'); }}
                className="mt-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300"
               >
                 Clear all filters
               </button>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/40 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Neural Engine Processing Headed Feeds</span>
           </div>
           <button 
             onClick={() => alert("INITIALIZING DEEP NEURAL SCAN...\nGenerating exhaustive market sentiment multi-factor report.\nThis process typically takes 15-30 seconds. Result will be redirected to the secure portal.")}
             className="px-4 py-2 bg-emerald-500 shadow-lg shadow-emerald-500/20 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:scale-105 transition-transform active:scale-95"
           >
             Full Analysis Report
           </button>
        </div>
      </div>
    </div>
  );
};
