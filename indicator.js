// indicators.js

export function calculateSMA(data, period) {
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
}

export function calculateEMA(data, period) {
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
}

export function calculateRSI(data, period = 14) {
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
      gains.slice(i - period + 1, i + 1).reduce((sum, gain) => sum + gain, 0) /
      period;
    const avgLoss =
      losses.slice(i - period + 1, i + 1).reduce((sum, loss) => sum + loss, 0) /
      period;
    if (avgLoss === 0) {
      result.push(100);
      continue;
    }
    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push(rsi);
  }
  return result;
}

export function calculateMACD(
  data,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (i < slowPeriod - 1) {
      macdLine.push(null);
      continue;
    }
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }
  // Filter out null values to calculate the signal line
  const filteredMACD = macdLine.filter((val) => val !== null);
  const signalLineCalculated = calculateEMA(filteredMACD, signalPeriod);
  const paddedSignalLine = Array(slowPeriod + signalPeriod - 2)
    .fill(null)
    .concat(signalLineCalculated);
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
}

export function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const middle = [];
  const upper = [];
  const lower = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      middle.push(null);
      upper.push(null);
      lower.push(null);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const sma = slice.reduce((sum, price) => sum + price, 0) / period;
    const squaredDiffs = slice.map((price) => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdev = Math.sqrt(variance);
    middle.push(sma);
    upper.push(sma + stdev * stdDev);
    lower.push(sma - stdev * stdDev);
  }
  return { middle, upper, lower };
}

export function calculateStochastic(
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
    const validK = kValues
      .slice(i - dPeriod + 1, i + 1)
      .filter((v) => v !== null);
    if (validK.length === 0) {
      dValues.push(null);
      continue;
    }
    const d = validK.reduce((sum, v) => sum + v, 0) / validK.length;
    dValues.push(d);
  }
  return { k: kValues, d: dValues };
}

export function calculateADX(highData, lowData, closeData, period = 14) {
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
    dmPlusValues.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmMinusValues.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const atrValues = [];
  const diPlusValues = [];
  const diMinusValues = [];
  const adxValues = [];
  let atr = null;
  let smoothedDmPlus = null;
  let smoothedDmMinus = null;

  if (trValues.length >= period) {
    atr = trValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    smoothedDmPlus =
      dmPlusValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    smoothedDmMinus =
      dmMinusValues.slice(0, period).reduce((sum, val) => sum + val, 0) /
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
      adxValues.push(null); // First ADX value will be computed later
      continue;
    }
    atr = ((period - 1) * atrValues[i - 1] + trValues[i]) / period;
    smoothedDmPlus = ((period - 1) * smoothedDmPlus + dmPlusValues[i]) / period;
    smoothedDmMinus =
      ((period - 1) * smoothedDmMinus + dmMinusValues[i]) / period;
    atrValues.push(atr);
    const diPlus = (smoothedDmPlus / atr) * 100;
    const diMinus = (smoothedDmMinus / atr) * 100;
    diPlusValues.push(diPlus);
    diMinusValues.push(diMinus);
    const dx =
      diPlus + diMinus === 0
        ? 0
        : (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
    if (i < period * 2 - 2) {
      adxValues.push(null);
      continue;
    }
    if (i === period * 2 - 2) {
      adxValues.push(dx);
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
}

export function generateSignals(
  prices,
  weights = { ma: 25, rsi: 25, macd: 25, bb: 25, stoch: 0, adx: 0 },
) {
  const highPrices = prices.map((price) => price.high);
  const lowPrices = prices.map((price) => price.low);
  const closePrices = prices.map((price) => price.close);

  // Normalize weights so that they sum to 1.
  const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const normalizedWeights = {};
  for (const key in weights) {
    normalizedWeights[key] = weights[key] / totalWeight;
  }

  // Calculate the individual indicators.
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  const bollingerBands = calculateBollingerBands(closePrices);
  const stochastic = calculateStochastic(highPrices, lowPrices, closePrices);
  const adx = calculateADX(highPrices, lowPrices, closePrices);

  // Initialize signal arrays.
  const maSignals = Array(prices.length).fill(0);
  const rsiSignals = Array(prices.length).fill(0);
  const macdSignals = Array(prices.length).fill(0);
  const bbSignals = Array(prices.length).fill(0);
  const stochSignals = Array(prices.length).fill(0);
  const adxSignals = Array(prices.length).fill(0);
  const combinedSignals = Array(prices.length).fill(0);
  const buySignals = Array(prices.length).fill(0);
  const sellSignals = Array(prices.length).fill(0);

  // Generate Moving Average Crossover signals.
  for (let i = 1; i < prices.length; i++) {
    if (sma50[i - 1] < sma200[i - 1] && sma50[i] > sma200[i]) {
      maSignals[i] = 1;
    } else if (sma50[i - 1] > sma200[i - 1] && sma50[i] < sma200[i]) {
      maSignals[i] = -1;
    }
  }

  // Generate RSI signals.
  for (let i = 1; i < prices.length; i++) {
    if (rsi[i - 1] < 30 && rsi[i] > 30) {
      rsiSignals[i] = 1;
    } else if (rsi[i - 1] < 70 && rsi[i] > 70) {
      rsiSignals[i] = -1;
    }
  }

  // Generate MACD signals.
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

  // Generate Bollinger Bands signals.
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

  // Generate Stochastic signals.
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

  // Generate ADX signals.
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

  // Combine signals with the given weights.
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
}
