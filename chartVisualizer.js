// chartVisualizer.js

// Note: This module assumes Chart.js is loaded globally.
// It also interacts directly with DOM elements.

export const chartVisualizer = {
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

  // Update current signal display - needs reference to app.lastSignal and showToast
  // This dependency will be resolved when integrating in app.js
  updateCurrentSignal: function (signals, appState) {
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

    // Check if signal changed from previous analysis and trigger toast if it's BUY or SELL
    // Requires appState.lastSignal and appState.showToast function
    if (
      appState &&
      appState.lastSignal !== signal &&
      (signal === "BUY" || signal === "SELL")
    ) {
      if (typeof appState.showToast === "function") {
        appState.showToast(`Signal changed: ${signal}`);
      } else {
        console.warn(
          "showToast function not available in appState for chartVisualizer",
        );
      }
    }
    if (appState) {
      appState.lastSignal = signal; // Update the central state
    }

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
      ].map((val) => (val === null || val === undefined ? "" : val)); // Handle null/undefined for CSV
      csvContent += row.join(",") + "\n";
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${document
      .getElementById("stockTitle")
      .textContent.replace(" Stock Analysis", "")}_data.csv`;
    link.click();
  },
};
