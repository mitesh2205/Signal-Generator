// Import necessary modules
import * as technicalIndicators from "./indicator.js";
import { stockAPI } from "./dataFetcher.js";
import { chartVisualizer } from "./chartVisualizer.js";
import {
  watchlistManager,
  getIndicatorWeights,
  updateWeightDisplays,
  getIndicatorParameters,
  showToast,
  computeATR,
} from "./uiManager.js";
// Assuming robinhood.js exports robinhoodAPI, adjust if necessary
// import { robinhoodAPI } from './robinhood.js'; // Uncomment if robinhood.js is confirmed and exports this

// --- Technical Indicators Implementation (Moved to indicator.js) ---
/*
const technicalIndicators = {
  // Calculate Simple Moving Average
  calculateSMA: function (data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
    return result;
  },

  // Calculate Exponential Moving Average
  calculateEMA: function (data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema =
      data.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      if (i === period - 1) {
        result.push(ema);
        continue;
      }
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    return result;
  },

  // Calculate Relative Strength Index
  calculateRSI: function (data, period = 14) {
    const result = [];
    const gains = [];
    const losses = [];
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        gains.push(0);
        losses.push(0);
        result.push(null);
        continue;
      }
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
      if (i < period) {
        result.push(null);
        continue;
      }
      const avgGain =
        gains
          .slice(i - period + 1, i + 1)
          .reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss =
        losses
          .slice(i - period + 1, i + 1)
          .reduce((sum, loss) => sum + loss, 0) / period;
      if (avgLoss === 0) {
        result.push(100);
        continue;
      }
      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      result.push(rsi);
    }
    return result;
  },

  // Calculate MACD
  calculateMACD: function (
    data,
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ) {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    const macdLine = [];
    for (let i = 0; i < data.length; i++) {
      if (i < slowPeriod - 1) {
        macdLine.push(null);
        continue;
      }
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    const signalLine = this.calculateEMA(
      macdLine.filter((val) => val !== null),
      signalPeriod,
    );
    const paddedSignalLine = Array(slowPeriod + signalPeriod - 2)
      .fill(null)
      .concat(signalLine);
    const histogram = [];
    for (let i = 0; i < data.length; i++) {
      if (i < slowPeriod + signalPeriod - 2) {
        histogram.push(null);
        continue;
      }
      histogram.push(macdLine[i] - paddedSignalLine[i]);
    }
    return {
      macdLine,
      signalLine: paddedSignalLine,
      histogram,
    };
  },

  // Calculate Bollinger Bands
  calculateBollingerBands: function (data, period = 20, stdDev = 2) {
    const result = {
      middle: [],
      upper: [],
      lower: [],
    };
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.middle.push(null);
        result.upper.push(null);
        result.lower.push(null);
        continue;
      }
      const slice = data.slice(i - period + 1, i + 1);
      const sma = slice.reduce((sum, price) => sum + price, 0) / period;
      const squaredDiffs = slice.map((price) => Math.pow(price - sma, 2));
      const variance =
        squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
      const standardDeviation = Math.sqrt(variance);
      result.middle.push(sma);
      result.upper.push(sma + standardDeviation * stdDev);
      result.lower.push(sma - standardDeviation * stdDev);
    }
    return result;
  },

  // Calculate Stochastic Oscillator
  calculateStochastic: function (
    highData,
    lowData,
    closeData,
    kPeriod = 14,
    dPeriod = 3,
  ) {
    const kValues = [];
    const dValues = [];
    for (let i = 0; i < closeData.length; i++) {
      if (i < kPeriod - 1) {
        kValues.push(null);
        continue;
      }
      const highSlice = highData.slice(i - kPeriod + 1, i + 1);
      const lowSlice = lowData.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...highSlice);
      const lowestLow = Math.min(...lowSlice);
      if (highestHigh === lowestLow) {
        kValues.push(50);
        continue;
      }
      const k = ((closeData[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }
    for (let i = 0; i < kValues.length; i++) {
      if (i < kPeriod - 1 + dPeriod - 1) {
        dValues.push(null);
        continue;
      }
      const kSlice = kValues
        .slice(i - dPeriod + 1, i + 1)
        .filter((val) => val !== null);
      if (kSlice.length === 0) {
        dValues.push(null);
        continue;
      }
      const d = kSlice.reduce((sum, k) => sum + k, 0) / kSlice.length;
      dValues.push(d);
    }
    return {
      k: kValues,
      d: dValues,
    };
  },

  // Calculate Average Directional Index (ADX)
  calculateADX: function (highData, lowData, closeData, period = 14) {
    const trValues = [];
    const dmPlusValues = [];
    const dmMinusValues = [];
    for (let i = 0; i < highData.length; i++) {
      if (i === 0) {
        trValues.push(highData[i] - lowData[i]);
        dmPlusValues.push(0);
        dmMinusValues.push(0);
        continue;
      }
      const tr1 = highData[i] - lowData[i];
      const tr2 = Math.abs(highData[i] - closeData[i - 1]);
      const tr3 = Math.abs(lowData[i] - closeData[i - 1]);
      const tr = Math.max(tr1, tr2, tr3);
      trValues.push(tr);
      const upMove = highData[i] - highData[i - 1];
      const downMove = lowData[i - 1] - lowData[i];
      if (upMove > downMove && upMove > 0) {
        dmPlusValues.push(upMove);
      } else {
        dmPlusValues.push(0);
      }
      if (downMove > upMove && downMove > 0) {
        dmMinusValues.push(downMove);
      } else {
        dmMinusValues.push(0);
      }
    }
    const atrValues = [];
    const diPlusValues = [];
    const diMinusValues = [];
    const adxValues = [];
    let atr = null;
    let smoothedDmPlus = null;
    let smoothedDmMinus = null;
    if (trValues.length >= period) {
      atr = trValues.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
      smoothedDmPlus =
        dmPlusValues.slice(0, period).reduce((sum, dm) => sum + dm, 0) / period;
      smoothedDmMinus =
        dmMinusValues.slice(0, period).reduce((sum, dm) => sum + dm, 0) /
        period;
    }
    for (let i = 0; i < highData.length; i++) {
      if (i < period - 1) {
        atrValues.push(null);
        diPlusValues.push(null);
        diMinusValues.push(null);
        adxValues.push(null);
        continue;
      }
      if (i === period - 1) {
        atrValues.push(atr);
        const diPlus = (smoothedDmPlus / atr) * 100;
        const diMinus = (smoothedDmMinus / atr) * 100;
        diPlusValues.push(diPlus);
        diMinusValues.push(diMinus);
        adxValues.push(null);
        continue;
      }
      atr = ((period - 1) * atrValues[i - 1] + trValues[i]) / period;
      smoothedDmPlus =
        ((period - 1) * smoothedDmPlus + dmPlusValues[i]) / period;
      smoothedDmMinus =
        ((period - 1) * smoothedDmMinus + dmMinusValues[i]) / period;
      atrValues.push(atr);
      const diPlus = (smoothedDmPlus / atr) * 100;
      const diMinus = (smoothedDmMinus / atr) * 100;
      diPlusValues.push(diPlus);
      diMinusValues.push(diMinus);
      const diDiff = Math.abs(diPlus - diMinus);
      const diSum = diPlus + diMinus;
      const dx = diSum === 0 ? 0 : (diDiff / diSum) * 100;
      if (i < period * 2 - 2) {
        adxValues.push(null);
        continue;
      }
      if (i === period * 2 - 2) {
        const dxSum = dx;
        const adx = dxSum / period;
        adxValues.push(adx);
        continue;
      }
      const adx = ((period - 1) * adxValues[i - 1] + dx) / period;
      adxValues.push(adx);
    }
    return {
      adx: adxValues,
      diPlus: diPlusValues,
      diMinus: diMinusValues,
    };
  },

  // Generate signals based on indicators with customizable weights
  generateSignals: function (
    prices,
    weights = {
      ma: 25,
      rsi: 25,
      macd: 25,
      bb: 25,
      stoch: 0,
      adx: 0,
    },
  ) {
    const params = getIndicatorParameters();
    const highPrices = prices.map((price) => price.high);
    const lowPrices = prices.map((price) => price.low);
    const closePrices = prices.map((price) => price.close);
    const totalWeight = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    const normalizedWeights = {};
    for (const key in weights) {
      normalizedWeights[key] = weights[key] / totalWeight;
    }
    const sma50 = this.calculateSMA(closePrices, params.sma50Period);
    const sma200 = this.calculateSMA(closePrices, params.sma200Period);
    const rsi = this.calculateRSI(closePrices, params.rsiPeriod);
    const macd = this.calculateMACD(
      closePrices,
      params.macdFastPeriod,
      params.macdSlowPeriod,
      params.macdSignalPeriod,
    );
    const bollingerBands = this.calculateBollingerBands(
      closePrices,
      params.bbPeriod,
      params.bbStdDev,
    );
    const stochastic = this.calculateStochastic(
      highPrices,
      lowPrices,
      closePrices,
      params.stochKPeriod,
      params.stochDPeriod,
    );
    const adx = this.calculateADX(
      highPrices,
      lowPrices,
      closePrices,
      params.adxPeriod,
    );
    const maSignals = Array(prices.length).fill(0);
    const rsiSignals = Array(prices.length).fill(0);
    const macdSignals = Array(prices.length).fill(0);
    const bbSignals = Array(prices.length).fill(0);
    const stochSignals = Array(prices.length).fill(0);
    const adxSignals = Array(prices.length).fill(0);
    const combinedSignals = Array(prices.length).fill(0);
    const buySignals = Array(prices.length).fill(0);
    const sellSignals = Array(prices.length).fill(0);
    for (let i = 1; i < prices.length; i++) {
      if (sma50[i - 1] < sma200[i - 1] && sma50[i] > sma200[i]) {
        maSignals[i] = 1;
      } else if (sma50[i - 1] > sma200[i - 1] && sma50[i] < sma200[i]) {
        maSignals[i] = -1;
      }
    }
    for (let i = 1; i < prices.length; i++) {
      if (rsi[i - 1] < 30 && rsi[i] > 30) {
        rsiSignals[i] = 1;
      } else if (rsi[i - 1] < 70 && rsi[i] > 70) {
        rsiSignals[i] = -1;
      }
    }
    for (let i = 1; i < prices.length; i++) {
      if (
        macd.macdLine[i - 1] < macd.signalLine[i - 1] &&
        macd.macdLine[i] > macd.signalLine[i]
      ) {
        macdSignals[i] = 1;
      } else if (
        macd.macdLine[i - 1] > macd.signalLine[i - 1] &&
        macd.macdLine[i] < macd.signalLine[i]
      ) {
        macdSignals[i] = -1;
      }
    }
    for (let i = 1; i < prices.length; i++) {
      if (
        closePrices[i - 1] < bollingerBands.lower[i - 1] &&
        closePrices[i] > bollingerBands.lower[i]
      ) {
        bbSignals[i] = 1;
      } else if (
        closePrices[i - 1] > bollingerBands.upper[i - 1] &&
        closePrices[i] < bollingerBands.upper[i]
      ) {
        bbSignals[i] = -1;
      }
    }
    for (let i = 1; i < prices.length; i++) {
      if (stochastic.k[i] !== null && stochastic.d[i] !== null) {
        if (
          stochastic.k[i - 1] < 20 &&
          stochastic.k[i] > 20 &&
          stochastic.k[i] > stochastic.d[i]
        ) {
          stochSignals[i] = 1;
        } else if (
          stochastic.k[i - 1] > 80 &&
          stochastic.k[i] < 80 &&
          stochastic.k[i] < stochastic.d[i]
        ) {
          stochSignals[i] = -1;
        }
      }
    }
    for (let i = 1; i < prices.length; i++) {
      if (
        adx.adx[i] !== null &&
        adx.diPlus[i] !== null &&
        adx.diMinus[i] !== null
      ) {
        if (
          adx.adx[i] > 25 &&
          adx.diPlus[i - 1] < adx.diMinus[i - 1] &&
          adx.diPlus[i] > adx.diMinus[i]
        ) {
          adxSignals[i] = 1;
        } else if (
          adx.adx[i] > 25 &&
          adx.diPlus[i - 1] > adx.diMinus[i - 1] &&
          adx.diPlus[i] < adx.diMinus[i]
        ) {
          adxSignals[i] = -1;
        }
      }
    }
    for (let i = 0; i < prices.length; i++) {
      combinedSignals[i] =
        maSignals[i] * normalizedWeights.ma +
        rsiSignals[i] * normalizedWeights.rsi +
        macdSignals[i] * normalizedWeights.macd +
        bbSignals[i] * normalizedWeights.bb +
        stochSignals[i] * normalizedWeights.stoch +
        adxSignals[i] * normalizedWeights.adx;
      buySignals[i] = combinedSignals[i] >= 0.25 ? 1 : 0;
      sellSignals[i] = combinedSignals[i] <= -0.25 ? 1 : 0;
    }
    return {
      sma50,
      sma200,
      rsi,
      macd,
      bollingerBands,
      stochastic,
      adx,
      maSignals,
      rsiSignals,
      macdSignals,
      bbSignals,
      stochSignals,
      adxSignals,
      combinedSignals,
      buySignals,
      sellSignals,
    };
};
*/

// --- Stock Data API (Moved to dataFetcher.js) ---
/*
const stockAPI = {
  fetchStockData: async function (symbol, timeRange) {
    try {
      let period;
      switch (timeRange) {
        case "1m":
          period = "1mo";
          break;
        case "3m":
          period = "3mo";
          break;
        case "6m":
          period = "6mo";
          break;
        case "1y":
          period = "1y";
          break;
        case "2y":
          period = "2y";
          break;
        case "5y":
          period = "5y";
          break;
        default:
          period = "1y";
      }
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`,
      );
      const data = await response.json();
      if (data.chart.error) {
        throw new Error(data.chart.error.description);
      }
      const result = data.chart.result[0];
      if (!result || !result.timestamp || !result.indicators.quote[0]) {
        throw new Error("No data available for this symbol");
      }
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const prices = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] !== null && quote.close[i] !== null) {
          prices.push({
            date: new Date(timestamps[i] * 1000),
            open: quote.open[i],
            high: quote.high[i],
            low: quote.low[i],
            close: quote.close[i],
            volume: quote.volume[i],
          });
        }
      }
      return prices;
    } catch (error) {
      console.error("Error fetching stock data:", error);
      throw error;
    }
};
*/

// --- Chart Visualization (Moved to chartVisualizer.js) ---
/*
const chartVisualizer = {
  priceChart: null,
  rsiChart: null,
  macdChart: null,
  stochChart: null,
  adxChart: null,
  currentPrices: null,
  currentSignals: null,

  // Create price chart with buy/sell signals and zoom interaction
  createPriceChart: function (prices, signals) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    this.currentPrices = prices;
    this.currentSignals = signals;
    const labels = prices.map((price) => price.date.toLocaleDateString());
    const closePrices = prices.map((price) => price.close);
    const buySignalPoints = [];
    const sellSignalPoints = [];
    for (let i = 0; i < prices.length; i++) {
      if (signals.buySignals[i] === 1) {
        buySignalPoints.push({
          x: labels[i],
          y: closePrices[i],
        });
      } else {
        buySignalPoints.push(null);
      }
      if (signals.sellSignals[i] === 1) {
        sellSignalPoints.push({
          x: labels[i],
          y: closePrices[i],
        });
      } else {
        sellSignalPoints.push(null);
      }
    }
    if (this.priceChart) {
      this.priceChart.destroy();
    }
    this.priceChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Close Price",
            data: closePrices,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
          {
            label: "SMA 50",
            data: signals.sma50,
            borderColor: "rgba(255, 159, 64, 1)",
            borderWidth: 1,
            pointRadius: 0,
          },
          {
            label: "SMA 200",
            data: signals.sma200,
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            pointRadius: 0,
          },
          {
            label: "Buy Signals",
            data: buySignalPoints,
            backgroundColor: "rgba(40, 167, 69, 1)",
            borderColor: "rgba(40, 167, 69, 1)",
            pointStyle: "triangle",
            rotation: 180,
            pointRadius: 10,
            showLine: false,
          },
          {
            label: "Sell Signals",
            data: sellSignalPoints,
            backgroundColor: "rgba(220, 53, 69, 1)",
            borderColor: "rgba(220, 53, 69, 1)",
            pointStyle: "triangle",
            pointRadius: 10,
            showLine: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Stock Price with Buy/Sell Signals",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(context.parsed.y);
                }
                return label;
              },
            },
          },
          zoom: {
            pan: {
              enabled: true,
              mode: "x",
            },
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true,
              },
              mode: "x",
            },
          },
        },
      },
    });
    document.getElementById("exportChartBtn").disabled = false;
    document.getElementById("exportDataBtn").disabled = false;
  },

  // Create RSI chart
  createRSIChart: function (prices, signals) {
    const ctx = document.getElementById("rsiChart").getContext("2d");
    const labels = prices.map((price) => price.date.toLocaleDateString());
    if (this.rsiChart) {
      this.rsiChart.destroy();
    }
    this.rsiChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "RSI",
            data: signals.rsi,
            borderColor: "rgba(153, 102, 255, 1)",
            backgroundColor: "rgba(153, 102, 255, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: function (context) {
                if (context.tick.value === 30 || context.tick.value === 70) {
                  return "rgba(255, 0, 0, 0.5)";
                }
                return "rgba(0, 0, 0, 0.1)";
              },
              lineWidth: function (context) {
                if (context.tick.value === 30 || context.tick.value === 70) {
                  return 2;
                }
                return 1;
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Relative Strength Index (RSI)",
          },
        },
      },
    });
  },

  // Create MACD chart
  createMACDChart: function (prices, signals) {
    const ctx = document.getElementById("macdChart").getContext("2d");
    const labels = prices.map((price) => price.date.toLocaleDateString());
    if (this.macdChart) {
      this.macdChart.destroy();
    }
    this.macdChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "MACD Histogram",
            data: signals.macd.histogram,
            backgroundColor: function (context) {
              const value = context.dataset.data[context.dataIndex];
              return value >= 0
                ? "rgba(40, 167, 69, 0.5)"
                : "rgba(220, 53, 69, 0.5)";
            },
            order: 3,
          },
          {
            label: "MACD Line",
            data: signals.macd.macdLine,
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
            type: "line",
            pointRadius: 0,
            order: 1,
          },
          {
            label: "Signal Line",
            data: signals.macd.signalLine,
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 2,
            type: "line",
            pointRadius: 0,
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Moving Average Convergence Divergence (MACD)",
          },
        },
      },
    });
  },

  // Create Stochastic Oscillator chart
  createStochasticChart: function (prices, signals) {
    const ctx = document.getElementById("stochChart").getContext("2d");
    const labels = prices.map((price) => price.date.toLocaleDateString());
    if (this.stochChart) {
      this.stochChart.destroy();
    }
    this.stochChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "%K",
            data: signals.stochastic.k,
            borderColor: "rgba(54, 162, 235, 1)",
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
          {
            label: "%D",
            data: signals.stochastic.d,
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: function (context) {
                if (context.tick.value === 20 || context.tick.value === 80) {
                  return "rgba(255, 0, 0, 0.5)";
                }
                return "rgba(0, 0, 0, 0.1)";
              },
              lineWidth: function (context) {
                if (context.tick.value === 20 || context.tick.value === 80) {
                  return 2;
                }
                return 1;
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Stochastic Oscillator",
          },
        },
      },
    });
  },

  // Create ADX chart
  createADXChart: function (prices, signals) {
    const ctx = document.getElementById("adxChart").getContext("2d");
    const labels = prices.map((price) => price.date.toLocaleDateString());
    if (this.adxChart) {
      this.adxChart.destroy();
    }
    this.adxChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "ADX",
            data: signals.adx.adx,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
          {
            label: "+DI",
            data: signals.adx.diPlus,
            borderColor: "rgba(40, 167, 69, 1)",
            backgroundColor: "rgba(40, 167, 69, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
          {
            label: "-DI",
            data: signals.adx.diMinus,
            borderColor: "rgba(220, 53, 69, 1)",
            backgroundColor: "rgba(220, 53, 69, 0.2)",
            tension: 0.1,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: function (context) {
                if (context.tick.value === 25) {
                  return "rgba(255, 0, 0, 0.5)";
                }
                return "rgba(0, 0, 0, 0.1)";
              },
              lineWidth: function (context) {
                if (context.tick.value === 25) {
                  return 2;
                }
                return 1;
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Average Directional Index (ADX)",
          },
        },
      },
    });
  },

  // Update signal details table
  updateSignalDetails: function (prices, signals, weights) {
    const signalDetailsElement = document.getElementById("signalDetails");
    signalDetailsElement.innerHTML = "";
    const lastIndex = prices.length - 1;
    const lastPrice = prices[lastIndex].close;
    const lastSMA50 = signals.sma50[lastIndex];
    const lastSMA200 = signals.sma200[lastIndex];
    const lastRSI = signals.rsi[lastIndex];
    const lastMACD = signals.macd.macdLine[lastIndex];
    const lastSignal = signals.macd.signalLine[lastIndex];
    const lastHistogram = signals.macd.histogram[lastIndex];
    const lastBBMiddle = signals.bollingerBands.middle[lastIndex];
    const lastBBUpper = signals.bollingerBands.upper[lastIndex];
    const lastBBLower = signals.bollingerBands.lower[lastIndex];
    const lastStochK = signals.stochastic.k[lastIndex];
    const lastStochD = signals.stochastic.d[lastIndex];
    const lastADX = signals.adx.adx[lastIndex];
    const lastDIPlus = signals.adx.diPlus[lastIndex];
    const lastDIMinus = signals.adx.diMinus[lastIndex];
    const maSignal =
      lastSMA50 > lastSMA200
        ? "Bullish (Golden Cross)"
        : "Bearish (Death Cross)";
    let rsiSignal = "Neutral";
    if (lastRSI > 70) rsiSignal = "Overbought (Bearish)";
    if (lastRSI < 30) rsiSignal = "Oversold (Bullish)";
    const macdSignal = lastMACD > lastSignal ? "Bullish" : "Bearish";
    let bbSignal = "Neutral";
    if (lastPrice > lastBBUpper) bbSignal = "Overbought (Bearish)";
    if (lastPrice < lastBBLower) bbSignal = "Oversold (Bullish)";
    let stochSignal = "Neutral";
    if (lastStochK > 80 && lastStochK < lastStochD)
      stochSignal = "Overbought (Bearish)";
    if (lastStochK < 20 && lastStochK > lastStochD)
      stochSignal = "Oversold (Bullish)";
    let adxSignal = "Weak Trend";
    if (lastADX > 25) {
      if (lastDIPlus > lastDIMinus) adxSignal = "Strong Uptrend (Bullish)";
      else adxSignal = "Strong Downtrend (Bearish)";
    }
    const rows = [
      {
        indicator: "Moving Average Crossover",
        value: `SMA50: ${lastSMA50.toFixed(2)}, SMA200: ${lastSMA200.toFixed(
          2,
        )}`,
        signal: maSignal,
        weight: weights.ma + "%",
      },
      {
        indicator: "RSI",
        value: lastRSI.toFixed(2),
        signal: rsiSignal,
        weight: weights.rsi + "%",
      },
      {
        indicator: "MACD",
        value: `MACD: ${lastMACD.toFixed(2)}, Signal: ${lastSignal.toFixed(
          2,
        )}, Histogram: ${lastHistogram.toFixed(2)}`,
        signal: macdSignal,
        weight: weights.macd + "%",
      },
      {
        indicator: "Bollinger Bands",
        value: `Middle: ${lastBBMiddle.toFixed(
          2,
        )}, Upper: ${lastBBUpper.toFixed(2)}, Lower: ${lastBBLower.toFixed(2)}`,
        signal: bbSignal,
        weight: weights.bb + "%",
      },
      {
        indicator: "Stochastic Oscillator",
        value: `%K: ${lastStochK.toFixed(2)}, %D: ${lastStochD.toFixed(2)}`,
        signal: stochSignal,
        weight: weights.stoch + "%",
      },
      {
        indicator: "ADX",
        value: `ADX: ${lastADX.toFixed(2)}, +DI: ${lastDIPlus.toFixed(
          2,
        )}, -DI: ${lastDIMinus.toFixed(2)}`,
        signal: adxSignal,
        weight: weights.adx + "%",
      },
    ];
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${row.indicator}</td>
                <td>${row.value}</td>
                <td>${row.signal}</td>
                <td>${row.weight}</td>
            `;
      signalDetailsElement.appendChild(tr);
    });
  },

  // Update current signal display
  updateCurrentSignal: function (signals) {
    const lastIndex = signals.buySignals.length - 1;
    const signalElement = document.getElementById("currentSignal");
    const signalAlert = document.getElementById("signalAlert");
    let signal = "HOLD";
    let alertClass = "alert-secondary";
    if (signals.buySignals[lastIndex] === 1) {
      signal = "BUY";
      alertClass = "alert-success";
    } else if (signals.sellSignals[lastIndex] === 1) {
      signal = "SELL";
      alertClass = "alert-danger";
    }
    signalElement.textContent = signal;
    signalAlert.className = `alert text-center mb-4 ${alertClass}`;
    return signal;
  },

  // Export chart as PNG
  exportChartAsPNG: function () {
    if (!this.priceChart) return;
    const canvas = document.getElementById("priceChart");
    const link = document.createElement("a");
    link.download = `${document
      .getElementById("stockTitle")
      .textContent.replace(" Stock Analysis", "")}_chart.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  },

  // Export data as CSV
  exportDataAsCSV: function () {
    if (!this.currentPrices || !this.currentSignals) return;
    const prices = this.currentPrices;
    const signals = this.currentSignals;
    let csvContent =
      "Date,Open,High,Low,Close,Volume,SMA50,SMA200,RSI,MACD,Signal,Histogram,BB_Middle,BB_Upper,BB_Lower,Stoch_K,Stoch_D,ADX,DI_Plus,DI_Minus,Buy_Signal,Sell_Signal\n";
    for (let i = 0; i < prices.length; i++) {
      const row = [
        prices[i].date.toISOString().split("T")[0],
        prices[i].open,
        prices[i].high,
        prices[i].low,
        prices[i].close,
        prices[i].volume,
        signals.sma50[i],
        signals.sma200[i],
        signals.rsi[i],
        signals.macd.macdLine[i],
        signals.macd.signalLine[i],
        signals.macd.histogram[i],
        signals.bollingerBands.middle[i],
        signals.bollingerBands.upper[i],
        signals.bollingerBands.lower[i],
        signals.stochastic.k[i],
        signals.stochastic.d[i],
        signals.adx.adx[i],
        signals.adx.diPlus[i],
        signals.adx.diMinus[i],
        signals.buySignals[i],
        signals.sellSignals[i],
      ];
      csvContent += row.join(",") + "\n";
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${document
      .getElementById("stockTitle")
      .textContent.replace(" Stock Analysis", "")}_data.csv`;
    link.click();
};
*/

// --- Watchlist Manager (Moved to uiManager.js) ---
/*
const watchlistManager = {
  watchlist: [],
  init: function () {
    const savedWatchlist = localStorage.getItem("stockWatchlist");
    if (savedWatchlist) {
      this.watchlist = JSON.parse(savedWatchlist);
      this.renderWatchlist();
    }
  },
  addToWatchlist: function (symbol, signal = null) {
    symbol = symbol.toUpperCase();
    if (!this.watchlist.some((item) => item.symbol === symbol)) {
      this.watchlist.push({
        symbol: symbol,
        signal: signal,
        lastUpdated: new Date().toISOString(),
      });
      localStorage.setItem("stockWatchlist", JSON.stringify(this.watchlist));
      this.renderWatchlist();
      return true;
    }
    return false;
  },
  removeFromWatchlist: function (symbol) {
    this.watchlist = this.watchlist.filter((item) => item.symbol !== symbol);
    localStorage.setItem("stockWatchlist", JSON.stringify(this.watchlist));
    this.renderWatchlist();
  },
  updateSignal: function (symbol, signal) {
    const item = this.watchlist.find((item) => item.symbol === symbol);
    if (item) {
      item.signal = signal;
      item.lastUpdated = new Date().toISOString();
      localStorage.setItem("stockWatchlist", JSON.stringify(this.watchlist));
      this.renderWatchlist();
    }
  },
  renderWatchlist: function () {
    const watchlistElement = document.getElementById("watchlistItems");
    if (this.watchlist.length === 0) {
      watchlistElement.innerHTML = `
                <li class="list-group-item text-center text-muted">
                    Add stocks to your watchlist
                </li>
            `;
      return;
    }
    watchlistElement.innerHTML = "";
    this.watchlist.forEach((item) => {
      const li = document.createElement("li");
      li.className =
        "list-group-item watchlist-item d-flex justify-content-between align-items-center";
      li.dataset.symbol = item.symbol;
      let signalBadge = "";
      if (item.signal) {
        let badgeClass = "bg-secondary";
        if (item.signal === "BUY") badgeClass = "bg-success";
        if (item.signal === "SELL") badgeClass = "bg-danger";
        signalBadge = `<span class="badge ${badgeClass} watchlist-signal">${item.signal}</span>`;
      } else {
        signalBadge = `<span class="badge bg-secondary watchlist-signal">-</span>`;
      }
      const lastUpdated = item.lastUpdated
        ? `<small class="text-muted d-block">Updated: ${new Date(
            item.lastUpdated,
          ).toLocaleDateString()}</small>`
        : "";
      li.innerHTML = `
                <div>
                    <strong>${item.symbol}</strong>
                    ${lastUpdated}
                </div>
                <div class="d-flex align-items-center">
                    ${signalBadge}
                    <button class="btn btn-sm btn-outline-danger ms-2 remove-watchlist-btn" data-symbol="${item.symbol}">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            `;
      watchlistElement.appendChild(li);
    });
    document.querySelectorAll(".watchlist-item").forEach((item) => {
      item.addEventListener("click", function (e) {
        if (!e.target.closest(".remove-watchlist-btn")) {
          const symbol = this.dataset.symbol;
          document.getElementById("stockSymbol").value = symbol;
          document.getElementById("analyzeBtn").click();
        }
      });
    });
    document.querySelectorAll(".remove-watchlist-btn").forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const symbol = this.dataset.symbol;
        watchlistManager.removeFromWatchlist(symbol);
      });
    });
  },
  refreshWatchlist: async function () {
    if (this.watchlist.length === 0) return;
    const refreshBtn = document.getElementById("refreshWatchlistBtn");
    refreshBtn.disabled = true;
    refreshBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    for (const item of this.watchlist) {
      try {
        const prices = await stockAPI.fetchStockData(item.symbol, "1m");
        if (prices && prices.length > 0) {
          const signals = technicalIndicators.generateSignals(
            prices,
            getIndicatorWeights(),
          );
          const signal = chartVisualizer.updateCurrentSignal(signals);
          this.updateSignal(item.symbol, signal);
        }
      } catch (error) {
        console.error(`Error refreshing ${item.symbol}:`, error);
      }
    }
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
};
*/

// --- Helper Functions (Moved to uiManager.js) ---
/*
function getIndicatorWeights() { ... }
function updateWeightDisplays() { ... }
function getIndicatorParameters() { ... }
*/

// Main App Controller
const app = {
  currentSymbol: null,
  // Shared state object to pass to modules that need it (like chartVisualizer for toasts)
  appState: {
    lastSignal: null,
    showToast: showToast, // Pass the imported showToast function
  },

  init: function () {
    // Initialize managers
    watchlistManager.init(); // Sets up watchlist UI and loads data

    // Setup Event Listeners
    this.setupEventListeners();

    // Initial UI updates
    updateWeightDisplays(); // Update weight display on load
  },

  setupEventListeners: function () {
    const analyzeBtn = document.getElementById("analyzeBtn");
    const addToWatchlistBtn = document.getElementById("addToWatchlistBtn");
    const refreshWatchlistBtn = document.getElementById("refreshWatchlistBtn");
    const exportChartBtn = document.getElementById("exportChartBtn");
    const exportDataBtn = document.getElementById("exportDataBtn");
    const applyWeightsBtn = document.getElementById("applyWeightsBtn");
    const rhLoginBtn = document.getElementById("rhLoginBtn");

    if (analyzeBtn)
      analyzeBtn.addEventListener("click", () => this.analyzeStock()); // Use arrow function or bind
    if (addToWatchlistBtn)
      addToWatchlistBtn.addEventListener(
        "click",
        this.addToWatchlist.bind(this),
      );
    // Pass appState to refreshWatchlist when the button is clicked
    if (refreshWatchlistBtn)
      refreshWatchlistBtn.addEventListener("click", () =>
        watchlistManager.refreshWatchlist(this.appState),
      );
    if (exportChartBtn)
      exportChartBtn.addEventListener(
        "click",
        chartVisualizer.exportChartAsPNG.bind(chartVisualizer),
      );
    if (exportDataBtn)
      exportDataBtn.addEventListener(
        "click",
        chartVisualizer.exportDataAsCSV.bind(chartVisualizer),
      );
    if (applyWeightsBtn)
      applyWeightsBtn.addEventListener(
        "click",
        this.recalculateSignals.bind(this),
      );

    document.querySelectorAll(".weight-slider").forEach((slider) => {
      slider.addEventListener("input", updateWeightDisplays); // Use imported function
    });

    // Custom event listener for watchlist item clicks (dispatched from uiManager)
    document.addEventListener("analyzeSymbol", (event) => {
      if (event.detail && event.detail.symbol) {
        this.analyzeStock(event.detail.symbol); // Call analyzeStock with the symbol
      }
    });

    // Robinhood login event (assuming robinhoodAPI is available)
    // Uncomment the import at the top if robinhood.js is confirmed
    // if (rhLoginBtn && typeof robinhoodAPI !== 'undefined') {
    //     rhLoginBtn.addEventListener("click", this.loginRobinhood.bind(this));
    // } else if (rhLoginBtn) {
    //     rhLoginBtn.disabled = true; // Disable if API not loaded/available
    //     console.warn("Robinhood API not found or loaded. Login disabled.");
    // }
    // Temporary: Keep button active but log warning if API missing
    if (rhLoginBtn) {
      rhLoginBtn.addEventListener("click", this.loginRobinhood.bind(this));
    }
  },
  loginRobinhood: async function () {
    // Check if robinhoodAPI is available (assuming it's imported or globally defined)
    // Uncomment import at top if robinhood.js is confirmed
    /*
    if (typeof robinhoodAPI === 'undefined' || !robinhoodAPI.authenticate) {
        console.error("Robinhood API not available or authenticate function missing.");
        showToast("Robinhood integration is not available.", "error");
        const rhStatus = document.getElementById("rhStatus");
        if (rhStatus) rhStatus.textContent = "Robinhood API unavailable.";
        return;
    }
    */
    // Placeholder logic until robinhood.js is confirmed/implemented
    const username = document.getElementById("rhUsername").value;
    const password = document.getElementById("rhPassword").value;
    const rhStatus = document.getElementById("rhStatus");

    if (!username || !password) {
      showToast("Please enter Robinhood username and password.", "warning");
      return;
    }

    console.log("Attempting Robinhood login (placeholder)...");
    if (rhStatus) rhStatus.textContent = "Logging in (placeholder)...";
    showToast(
      "Robinhood login functionality not fully implemented yet.",
      "info",
    );

    // Placeholder for actual API call
    /*
    try {
      const tokenOrChallenge = await robinhoodAPI.authenticate(username, password);

      if (typeof tokenOrChallenge === "string" && tokenOrChallenge.length > 0) {
        if(rhStatus) rhStatus.textContent = "Logged in successfully!";
        showToast("Robinhood login successful!", "success");
      } else {
        // Handle MFA/Challenge case
        if(rhStatus) rhStatus.textContent = "Two-factor authentication required.";
        showToast("Robinhood: 2FA required.", "warning");
        // Future: Implement MFA input handling here
      }
    } catch (error) {
      const errorMessage = error.message || "Unknown login error";
      if(rhStatus) rhStatus.textContent = `Login failed: ${errorMessage}`;
      console.error("Robinhood login error:", error);
      showToast(`Robinhood Login Failed: ${errorMessage}`, "error");
    }
    */
  },

  // analyzeStock can optionally take a symbol (e.g., from watchlist click)
  analyzeStock: async function (symbolOverride = null) {
    const symbol =
      symbolOverride ||
      document.getElementById("stockSymbol").value.toUpperCase();
    const timeRange = document.getElementById("timeRange").value;
    const errorMessageElement = document.getElementById("errorMessage");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const resultSection = document.getElementById("resultSection");
    const stockTitle = document.getElementById("stockTitle");
    const riskManagementSection = document.getElementById("riskManagement");
    const stopLossElement = document.getElementById("stopLoss");
    const takeProfitElement = document.getElementById("takeProfit");

    // --- UI Updates Start ---
    if (errorMessageElement) {
      errorMessageElement.style.display = "none";
      errorMessageElement.textContent = "";
    }
    if (!symbol) {
      if (errorMessageElement) {
        errorMessageElement.textContent = "Please enter a stock symbol.";
        errorMessageElement.style.display = "block";
      }
      return;
    }
    this.currentSymbol = symbol; // Store the currently analyzed symbol
    if (loadingSpinner) loadingSpinner.style.display = "inline-block";
    if (resultSection) resultSection.style.display = "none"; // Hide results while loading
    if (stockTitle) stockTitle.textContent = `Loading ${symbol}...`; // Update title while loading
    // --- UI Updates End ---

    try {
      // 1. Fetch Data
      const prices = await stockAPI.fetchStockData(symbol, timeRange); // Use imported module

      // 2. Get Parameters & Weights from UI
      const indicatorParams = getIndicatorParameters(); // Use imported function
      const weights = getIndicatorWeights(); // Use imported function

      // 3. Validate Data Length
      const longestPeriod = Math.max(
        indicatorParams.sma200Period,
        indicatorParams.macdSlowPeriod + indicatorParams.macdSignalPeriod - 2,
        indicatorParams.bbPeriod,
        indicatorParams.stochKPeriod + indicatorParams.stochDPeriod - 1,
        indicatorParams.adxPeriod * 2 - 1, // ADX needs roughly 2*period - 1
      );
      if (!prices || prices.length < longestPeriod) {
        throw new Error(
          `Insufficient data (${
            prices ? prices.length : 0
          } points) for analysis with current settings (longest period: ${longestPeriod}). Try a longer time range.`,
        );
      }

      // 4. Generate Signals
      // Pass indicatorParams to generateSignals if it accepts them
      const signals = technicalIndicators.generateSignals(
        // Use imported module
        prices,
        weights,
        indicatorParams,
      );

      // 5. Update UI Title
      if (stockTitle) stockTitle.textContent = `${symbol} Stock Analysis`;

      // 6. Create/Update Charts
      chartVisualizer.createPriceChart(prices, signals); // Use imported module
      chartVisualizer.createRSIChart(prices, signals);
      chartVisualizer.createMACDChart(prices, signals);
      chartVisualizer.createStochasticChart(prices, signals);
      chartVisualizer.createADXChart(prices, signals);

      // 7. Update Signal Details Table
      chartVisualizer.updateSignalDetails(prices, signals, weights);

      // 8. Update Current Signal Display & State (pass appState for toast)
      const currentSignal = chartVisualizer.updateCurrentSignal(
        signals,
        this.appState, // Pass shared state
      );

      // 9. Update Watchlist (if symbol exists)
      watchlistManager.updateSignal(symbol, currentSignal); // Use imported module

      // 10. Calculate and Display Risk Management
      const atr = computeATR(prices, indicatorParams.adxPeriod); // Use imported function
      const currentPrice = prices[prices.length - 1].close;
      const riskRewardRatio = 2; // Example - consider making configurable

      let stopLoss = null,
        takeProfit = null;
      if (currentSignal === "BUY" && atr !== null && atr > 0) {
        stopLoss = currentPrice - atr;
        takeProfit = currentPrice + atr * riskRewardRatio;
      } else if (currentSignal === "SELL" && atr !== null && atr > 0) {
        stopLoss = currentPrice + atr;
        takeProfit = currentPrice - atr * riskRewardRatio;
      }

      if (riskManagementSection) {
        if (stopLoss !== null && takeProfit !== null) {
          if (stopLossElement)
            stopLossElement.textContent = stopLoss.toFixed(2);
          if (takeProfitElement)
            takeProfitElement.textContent = takeProfit.toFixed(2);
          riskManagementSection.style.display = "block";
        } else {
          riskManagementSection.style.display = "none";
        }
      }

      // 11. Show Results Section
      if (resultSection) resultSection.style.display = "block";
    } catch (error) {
      console.error("Analysis Error:", error);
      if (errorMessageElement) {
        errorMessageElement.textContent = `Error: ${error.message}`;
        errorMessageElement.style.display = "block";
      }
      showToast(`Analysis Failed: ${error.message}`, "error"); // Use imported function
      if (stockTitle) stockTitle.textContent = `${symbol} Analysis Failed`; // Update title on error
    } finally {
      if (loadingSpinner) loadingSpinner.style.display = "none"; // Hide spinner
    }
  },

  addToWatchlist: function () {
    const symbolInput = document.getElementById("stockSymbol");
    const symbol = symbolInput ? symbolInput.value.toUpperCase() : null;
    if (!symbol) {
      showToast("Please enter a stock symbol first.", "warning"); // Use imported function
      return;
    }
    // Get signal from the central app state
    const signal = this.appState.lastSignal;
    const displaySignal = signal && signal !== "HOLD" ? signal : null; // Store BUY/SELL, not HOLD

    const added = watchlistManager.addToWatchlist(symbol, displaySignal); // Use imported module
    if (added) {
      showToast(`${symbol} added to watchlist.`, "success"); // Use imported function
    } else {
      showToast(`${symbol} is already in your watchlist.`, "info"); // Use imported function
    }
  },

  // refreshWatchlist, exportChart, exportData are now handled directly by event listeners calling the respective modules.

  recalculateSignals: function () {
    if (!this.currentSymbol) {
      showToast(
        "Please analyze a stock first before recalculating.",
        "warning",
      ); // Use imported function
      return;
    }
    const weights = getIndicatorWeights(); // Use imported function
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      showToast(
        "Total weight must equal 100%. Please adjust your weights.",
        "warning",
      ); // Use imported function
      return;
    }
    // Re-run analysis with the current symbol
    this.analyzeStock(this.currentSymbol);
  },
};

// --- Removed helper function showToast (Moved to uiManager.js) ---
/*
function showToast(message) { ... }
*/

// --- Removed updateCurrentSignal modification (Logic moved to chartVisualizer.js) ---
/*
chartVisualizer.updateCurrentSignal = function (signals) { ... };
*/

// --- Removed helper function computeATR (Moved to uiManager.js) ---
/*
function computeATR(prices, period = 14) { ... }
*/

// Initialize the app after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
