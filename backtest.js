import { stockAPI } from "./dataFetcher.js";
import * as technicalIndicators from "./indicator.js";

class Backtester {
  constructor(indicators, weights, initialCapital = 10000) {
    this.indicators = indicators;
    this.weights = weights;
    this.initialCapital = initialCapital;
    this.results = {
      trades: [],
      metrics: {},
      equity: [],
    };
  }

  async runBacktest(symbol, startDate, endDate, timeframe = "1d") {
    // Fetch historical data
    const historicalData = await stockAPI.fetchStockData(
      symbol,
      startDate,
      endDate,
      timeframe,
    );

    let capital = this.initialCapital;
    let position = 0; // 0 = no position, 1 = long position
    let entryPrice = 0;
    let trades = [];
    let equity = [{ date: historicalData[0].date, value: capital }];

    // Process each candle
    for (let i = 50; i < historicalData.length; i++) {
      // Start at 50 to allow indicators to initialize
      const currentData = historicalData.slice(0, i + 1);
      const signalResult = this.generateBacktestSignal(currentData);
      const currentPrice = currentData[i].close;

      // Simple strategy: Enter long on buy signal, exit on sell signal
      if (signalResult.signal === "buy" && position === 0) {
        position = 1;
        entryPrice = currentPrice;
        const shares = Math.floor(capital / currentPrice);
        capital -= shares * currentPrice;

        trades.push({
          type: "buy",
          date: currentData[i].date,
          price: currentPrice,
          shares: shares,
          value: shares * currentPrice,
        });
      } else if (signalResult.signal === "sell" && position === 1) {
        position = 0;
        const lastBuy = trades.filter((t) => t.type === "buy").pop();
        const shares = lastBuy.shares;
        capital += shares * currentPrice;

        trades.push({
          type: "sell",
          date: currentData[i].date,
          price: currentPrice,
          shares: shares,
          value: shares * currentPrice,
          profit: shares * (currentPrice - entryPrice),
        });
      }

      // Track equity curve
      const positionValue =
        position === 1
          ? trades.filter((t) => t.type === "buy").pop().shares * currentPrice
          : 0;
      equity.push({
        date: currentData[i].date,
        value: capital + positionValue,
      });
    }

    // Calculate performance metrics
    this.results.trades = trades;
    this.results.equity = equity;
    this.results.metrics = this.calculateMetrics(trades, equity);

    return this.results;
  }

  generateBacktestSignal(data) {
    // Use technicalIndicators module for calculations
    const closePrices = data.map((d) => d.close);
    const highPrices = data.map((d) => d.high);
    const lowPrices = data.map((d) => d.low);

    let totalSignal = 0;
    const signals = {};

    if (this.weights.ma) {
      const sma50 = technicalIndicators.calculateSMA(closePrices, 50);
      const sma200 = technicalIndicators.calculateSMA(closePrices, 200);
      signals.ma = sma50[sma50.length - 1] > sma200[sma200.length - 1] ? 1 : -1;
      totalSignal += signals.ma * this.weights.ma;
    }

    if (this.weights.rsi) {
      const rsi = technicalIndicators.calculateRSI(closePrices);
      signals.rsi =
        rsi[rsi.length - 1] < 30 ? 1 : rsi[rsi.length - 1] > 70 ? -1 : 0;
      totalSignal += signals.rsi * this.weights.rsi;
    }

    // Add other indicators similarly...

    const normalizedSignal = totalSignal / 100; // Weights should sum to 100

    return {
      signal:
        normalizedSignal > 0.5
          ? "buy"
          : normalizedSignal < -0.5
          ? "sell"
          : "neutral",
      value: normalizedSignal,
      individualSignals: signals,
    };
  }

  calculateMetrics(trades, equity) {
    const winningTrades = trades.filter(
      (t) => t.type === "sell" && t.profit > 0,
    );
    const losingTrades = trades.filter(
      (t) => t.type === "sell" && t.profit <= 0,
    );

    const totalProfit = trades
      .filter((t) => t.type === "sell")
      .reduce((sum, trade) => sum + trade.profit, 0);

    const initialValue = this.initialCapital;
    const finalValue = equity[equity.length - 1].value;

    return {
      totalTrades: trades.filter((t) => t.type === "sell").length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        winningTrades.length / (winningTrades.length + losingTrades.length) ||
        0,
      totalReturn: ((finalValue - initialValue) / initialValue) * 100,
      totalProfit: totalProfit,
      maxDrawdown: this.calculateMaxDrawdown(equity),
      sharpeRatio: this.calculateSharpeRatio(equity),
    };
  }

  calculateMaxDrawdown(equity) {
    let maxDrawdown = 0;
    let peak = equity[0].value;

    for (const point of equity) {
      if (point.value > peak) {
        peak = point.value;
      }

      const drawdown = (peak - point.value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown * 100;
  }

  calculateSharpeRatio(equity) {
    const returns = [];
    for (let i = 1; i < equity.length; i++) {
      returns.push(
        (equity[i].value - equity[i - 1].value) / equity[i - 1].value,
      );
    }

    const averageReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDeviation = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) /
        returns.length,
    );

    const riskFreeDaily = 0.02 / 252;

    return ((averageReturn - riskFreeDaily) / stdDeviation) * Math.sqrt(252);
  }
}

export default Backtester;
