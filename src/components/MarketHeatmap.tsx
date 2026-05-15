import React from 'react';
import { ForexHeatMap, CryptoCurrencyMarket } from "react-ts-tradingview-widgets";
import { motion } from 'motion/react';
import { Flame, Coins, Globe } from 'lucide-react';

export const MarketHeatmap: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Forex Heatmap */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/50 px-4 py-2 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Forex Strength Map</h2>
            </div>
          </div>
          <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-zinc-800 bg-[#0a0a0a]">
            {/* Using Iframe for the actual HEATMAP look if the widget component is just a grid */}
            <iframe
              src="https://www.tradingview.com/embed-widget/forex-heat-map/?locale=en#%7B%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22currencies%22%3A%5B%22EUR%22%2C%22USD%22%2C%22JPY%22%2C%22GBP%22%2C%22CHF%22%2C%22AUD%22%2C%22CAD%22%2C%22NZD%22%5D%2C%22isTransparent%22%3Afalse%2C%22colorTheme%22%3A%22dark%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22forex-heat-map%22%7D"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Forex Heatmap"
            ></iframe>
          </div>
        </div>

        {/* Crypto Heatmap */}
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/50 px-4 py-2 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3">
              <Coins className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Crypto Market Heatmap</h2>
            </div>
          </div>
          <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-zinc-800 bg-[#0a0a0a]">
             <iframe
               src="https://www.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=en#%7B%22dataSource%22%3A%22crypto%22%2C%22blockSize%22%3A%22market_cap_calc%22%2C%22blockColor%22%3A%22change%22%2C%22grouping%22%3A%22no_group%22%2C%22symbolUrl%22%3A%22%22%2C%22colorTheme%22%3A%22dark%22%2C%22hasTopBar%22%3Afalse%2C%22isTransparent%22%3Afalse%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22crypto-coins-heatmap%22%7D"
               style={{ width: '100%', height: '100%', border: 'none' }}
               title="Crypto Heatmap"
             ></iframe>
          </div>
        </div>
      </div>

      {/* Full Width Crypto Dominance Heatmap */}
      <div className="p-8 rounded-[3rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Crypto Coins Dominance Map</h3>
            </div>
            <p className="text-zinc-500 text-xs">Real-time market cap visualization and price action for the top crypto ecosystem.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Coin Stream</span>
          </div>
        </div>

        <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-zinc-800 bg-[#060606] relative group shadow-2xl">
           <iframe
             src="https://www.tradingview.com/embed-widget/crypto-coins-heatmap/?locale=en#%7B%22dataSource%22%3A%22crypto%22%2C%22blockSize%22%3A%22market_cap_calc%22%2C%22blockColor%22%3A%22change%22%2C%22grouping%22%3A%22no_group%22%2C%22symbolUrl%22%3A%22%22%2C%22colorTheme%22%3A%22dark%22%2C%22hasTopBar%22%3Atrue%2C%22isTransparent%22%3Afalse%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22crypto-coins-heatmap-v2%22%7D"
             style={{ width: '100%', height: '100%', border: 'none' }}
             title="Full Crypto Coins Heatmap"
           ></iframe>
        </div>
      </div>

      {/* Market Ticker Tape */}

      <div className="p-1 bg-zinc-900 border-y border-zinc-800">
         <iframe 
           src="https://www.tradingview.com/embed-widget/ticker-tape/?locale=en#%7B%22symbols%22%3A%5B%7B%22proName%22%3A%22FOREXCOM%3ASPX500%22%2C%22title%22%3A%22S%26P%20500%22%7D%2C%7B%22proName%22%3A%22FOREXCOM%3ANSXUSD%22%2C%22title%22%3A%22US%20Tech%20100%22%7D%2C%7B%22proName%22%3A%22FX_IDC%3AEURUSD%22%2C%22title%22%3A%22EUR%2FUSD%22%7D%2C%7B%22proName%22%3A%22BITSTAMP%3ABTCUSD%22%2C%22title%22%3A%22Bitcoin%22%7D%2C%7B%22proName%22%3A%22BITSTAMP%3AETHUSD%22%2C%22title%22%3A%22Ethereum%22%7D%5D%2C%22showSymbolLogo%22%3Atrue%2C%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Afalse%2C%22displayMode%22%3A%22adaptive%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22ticker-tape%22%7D"
           style={{ width: '100%', height: '46px', border: 'none' }}
           title="Market Ticker"
         ></iframe>
      </div>

      <div className="p-8 rounded-[3rem] bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Technical Analysis Summary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <div className="h-[400px] rounded-2xl overflow-hidden border border-zinc-800 bg-[#0a0a0a]">
             <iframe 
               src="https://www.tradingview.com/embed-widget/technical-analysis/?locale=en#%7B%22interval%22%3A%221m%22%2C%22width%22%3A%22100%25%22%2C%22isTransparent%22%3Afalse%2C%22height%22%3A%22100%25%22%2C%22symbol%22%3A%22BINANCE%3ABTCUSDT%22%2C%22showIntervalTabs%22%3Atrue%2C%22displayMode%22%3A%22single%22%2C%22colorTheme%22%3A%22dark%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22technical-analysis%22%7D"
               style={{ width: '100%', height: '100%', border: 'none' }}
               title="BTC Technical Analysis"
             ></iframe>
           </div>
           <div className="h-[400px] rounded-2xl overflow-hidden border border-zinc-800 bg-[#0a0a0a]">
             <iframe 
               src="https://www.tradingview.com/embed-widget/technical-analysis/?locale=en#%7B%22interval%22%3A%221m%22%2C%22width%22%3A%22100%25%22%2C%22isTransparent%22%3Afalse%2C%22height%22%3A%22100%25%22%2C%22symbol%22%3A%22FX%3AEURUSD%22%2C%22showIntervalTabs%22%3Atrue%2C%22displayMode%22%3A%22single%22%2C%22colorTheme%22%3A%22dark%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22technical-analysis%22%7D"
               style={{ width: '100%', height: '100%', border: 'none' }}
               title="EURUSD Technical Analysis"
             ></iframe>
           </div>
           <div className="h-[400px] rounded-2xl overflow-hidden border border-zinc-800 bg-[#0a0a0a]">
             <iframe 
               src="https://www.tradingview.com/embed-widget/technical-analysis/?locale=en#%7B%22interval%22%3A%221m%22%2C%22width%22%3A%22100%25%22%2C%22isTransparent%22%3Afalse%2C%22height%22%3A%22100%25%22%2C%22symbol%22%3A%22OANDA%3AXAUUSD%22%2C%22showIntervalTabs%22%3Atrue%2C%22displayMode%22%3A%22single%22%2C%22colorTheme%22%3A%22dark%22%2C%22utm_source%22%3A%22ais-dev%22%2C%22utm_medium%22%3A%22widget%22%2C%22utm_campaign%22%3A%22technical-analysis%22%7D"
               style={{ width: '100%', height: '100%', border: 'none' }}
               title="Gold Technical Analysis"
             ></iframe>
           </div>
        </div>
      </div>
    </div>
  );
};
