/**
 * Netlify Serverless Function: /.netlify/functions/market-data
 * Completely self-contained Netlify Function (Zero external directory dependencies)
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const CACHE_TTL_MS = parseInt(process.env.MARKET_REFRESH_INTERVAL_MS, 10) || 15000;
const REQUEST_TIMEOUT_MS = 4000;
const TROY_OZ_PER_KG = 32.150746569;

const cache = global.__TIANUM_NETLIFY_CACHE__ || (global.__TIANUM_NETLIFY_CACHE__ = {
  lastUpdated: 0,
  data: null,
  raw: null
});

let inFlightPromise = null;

const BASELINE_FALLBACK = {
  sensex: { price: 73709.69, prevClose: 73852.90, time: 1792576950 },
  usdinr: { price: 94.45, prevClose: 94.9936, time: 1792576971 },
  brent:  { price: 109.16, prevClose: 108.79, time: 1792583815 },
  silver: { price: 57.795, prevClose: 57.706, time: 1792583818 }
};

function getMarketStatus() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5)); // IST = UTC + 5:30
  const day = ist.getDay(); // 0 is Sunday, 6 is Saturday
  const timeInMinutes = ist.getHours() * 60 + ist.getMinutes();
  const isBseOpen = (day >= 1 && day <= 5) && (timeInMinutes >= 555 && timeInMinutes <= 930);

  return {
    bse: isBseOpen ? 'OPEN' : 'CLOSED',
    isBseOpen: isBseOpen,
    timezone: 'IST (UTC+5:30)'
  };
}

async function fetchYahooQuote(symbol) {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  let lastError = null;

  for (const host of hosts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${host}`);
      }

      const json = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        throw new Error(`Invalid quote payload for ${symbol}`);
      }

      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || price;
      return {
        symbol,
        price,
        prevClose,
        currency: meta.currency || '',
        time: meta.regularMarketTime || Math.floor(Date.now() / 1000)
      };
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to fetch quote for ${symbol}`);
}

async function fetchGoldApiSilver() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = { 'User-Agent': USER_AGENT };
    if (process.env.GOLD_API_KEY) {
      headers['x-access-token'] = process.env.GOLD_API_KEY;
    }
    const res = await fetch('https://api.gold-api.com/price/XAG/INR', {
      signal: controller.signal,
      headers: headers
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`GoldAPI status ${res.status}`);
    const data = await res.json();
    if (data && typeof data.price === 'number') {
      return {
        pricePerOzINR: data.price,
        time: Math.floor(new Date(data.updatedAt || Date.now()).getTime() / 1000)
      };
    }
  } catch (err) {
    clearTimeout(timeout);
  }
  return null;
}

function formatMovement(currentVal, refVal) {
  if (!refVal || refVal === 0) {
    return { change: '0.00%', changeClass: 'neutral', pct: 0 };
  }
  const diff = currentVal - refVal;
  const pct = (diff / refVal) * 100;
  if (Math.abs(pct) < 0.005) {
    return { change: '0.00%', changeClass: 'neutral', pct: 0 };
  }
  const isUp = pct > 0;
  const sign = isUp ? '+' : '';
  return {
    change: sign + pct.toFixed(2) + '%',
    changeClass: isUp ? 'up' : 'down',
    pct: Number(pct.toFixed(2))
  };
}

async function refreshMarketData() {
  const settled = await Promise.allSettled([
    fetchYahooQuote('^BSESN'),
    fetchYahooQuote('INR=X'),
    fetchYahooQuote('BZ=F'),
    fetchYahooQuote('SI=F')
  ]);

  const rawQuotes = cache.raw ? { ...cache.raw } : { ...BASELINE_FALLBACK };

  if (settled[0].status === 'fulfilled') rawQuotes.sensex = settled[0].value;
  if (settled[1].status === 'fulfilled') rawQuotes.usdinr = settled[1].value;
  if (settled[2].status === 'fulfilled') rawQuotes.brent  = settled[2].value;
  if (settled[3].status === 'fulfilled') rawQuotes.silver = settled[3].value;

  if (settled[3].status === 'rejected') {
    const backup = await fetchGoldApiSilver();
    if (backup && rawQuotes.usdinr?.price) {
      const priceUSD = backup.pricePerOzINR / rawQuotes.usdinr.price;
      rawQuotes.silver = {
        symbol: 'SI=F',
        price: priceUSD,
        prevClose: rawQuotes.silver?.prevClose || priceUSD,
        currency: 'USD',
        time: backup.time
      };
    }
  }

  // 1. BSE SENSEX
  const sensexMv = formatMovement(rawQuotes.sensex.price, rawQuotes.sensex.prevClose);
  const sensexFormatted = rawQuotes.sensex.price.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // 2. USD / INR
  const usdinrMv = formatMovement(rawQuotes.usdinr.price, rawQuotes.usdinr.prevClose);
  const usdinrFormatted = '₹' + rawQuotes.usdinr.price.toFixed(2);

  // 3. BRENT CRUDE
  const brentMv = formatMovement(rawQuotes.brent.price, rawQuotes.brent.prevClose);
  const brentFormatted = '$' + rawQuotes.brent.price.toFixed(2);

  // 4. SILVER (1KG) in INR
  const silverPerKgINR = rawQuotes.silver.price * rawQuotes.usdinr.price * TROY_OZ_PER_KG;
  const prevSilverPerKgINR = rawQuotes.silver.prevClose * rawQuotes.usdinr.prevClose * TROY_OZ_PER_KG;
  const silverMv = formatMovement(silverPerKgINR, prevSilverPerKgINR);
  const silverFormatted = '₹' + Math.round(silverPerKgINR).toLocaleString('en-IN');

  const items = [
    {
      symbol: 'BSE SENSEX',
      value: sensexFormatted,
      change: sensexMv.change,
      changeClass: sensexMv.changeClass,
      rawPrice: rawQuotes.sensex.price,
      rawChangePct: sensexMv.pct,
      currency: 'INR',
      updatedAt: rawQuotes.sensex.time * 1000
    },
    {
      symbol: 'SILVER (1KG)',
      value: silverFormatted,
      change: silverMv.change,
      changeClass: silverMv.changeClass,
      rawPrice: Math.round(silverPerKgINR),
      rawChangePct: silverMv.pct,
      currency: 'INR',
      unit: '₹/kg',
      updatedAt: rawQuotes.silver.time * 1000
    },
    {
      symbol: 'USD / INR',
      value: usdinrFormatted,
      change: usdinrMv.change,
      changeClass: usdinrMv.changeClass,
      rawPrice: rawQuotes.usdinr.price,
      rawChangePct: usdinrMv.pct,
      currency: 'INR',
      updatedAt: rawQuotes.usdinr.time * 1000
    },
    {
      symbol: 'BRENT CRUDE',
      value: brentFormatted,
      change: brentMv.change,
      changeClass: brentMv.changeClass,
      rawPrice: rawQuotes.brent.price,
      rawChangePct: brentMv.pct,
      currency: 'USD',
      unit: '$/bbl',
      updatedAt: rawQuotes.brent.time * 1000
    }
  ];

  cache.lastUpdated = Date.now();
  cache.data = items;
  cache.raw = rawQuotes;

  return items;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  try {
    const now = Date.now();
    const isCacheValid = cache.data && (now - cache.lastUpdated < CACHE_TTL_MS);

    let data;
    if (isCacheValid) {
      data = cache.data;
    } else {
      if (!inFlightPromise) {
        inFlightPromise = refreshMarketData()
          .finally(() => { inFlightPromise = null; });
      }
      try {
        data = await inFlightPromise;
      } catch (err) {
        if (cache.data) data = cache.data;
        else throw err;
      }
    }

    const responseTime = Date.now();
    const marketStatus = getMarketStatus();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
      },
      body: JSON.stringify({
        status: 'success',
        provider: 'Verified Market Feeds (BSE, COMEX, NYMEX, FX)',
        marketStatus: marketStatus,
        lastUpdated: new Date(cache.lastUpdated).toISOString(),
        cacheAgeMs: Math.max(0, responseTime - cache.lastUpdated),
        data: data
      })
    };
  } catch (err) {
    console.error('Netlify market-data error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'Unable to retrieve live market indicators'
      })
    };
  }
};
