// uiManager.js
import { stockAPI } from "./dataFetcher.js";
import * as technicalIndicators from "./indicator.js"; // Assuming indicator.js exports named functions
import { chartVisualizer } from "./chartVisualizer.js"; // Needed for updateSignal in refreshWatchlist

// Note: This module assumes Bootstrap (for toasts) is loaded globally.
// It also interacts heavily with DOM elements.

export const watchlistManager = {
  watchlist: [],
  init: function () {
    const savedWatchlist = localStorage.getItem("stockWatchlist");
    if (savedWatchlist) {
      this.watchlist = JSON.parse(savedWatchlist);
      this.renderWatchlist();
    }
    // Event listeners for watchlist items are added in renderWatchlist
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
      this.renderWatchlist(); // Re-render to show updated signal
    }
  },
  renderWatchlist: function () {
    const watchlistElement = document.getElementById("watchlistItems");
    if (!watchlistElement) {
      console.error("Watchlist container element 'watchlistItems' not found.");
      return;
    }

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
      li.style.cursor = "pointer"; // Add pointer cursor

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
          ).toLocaleTimeString()}</small>` // Changed to time for more frequent updates
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

      // Add click listener to the list item itself (excluding the remove button)
      li.addEventListener("click", function (e) {
        if (!e.target.closest(".remove-watchlist-btn")) {
          const symbol = this.dataset.symbol;
          document.getElementById("stockSymbol").value = symbol;
          // Trigger the main analyze function (assuming it's globally accessible or passed in)
          // This requires the main app controller to expose or pass the analyze function.
          // For now, we'll assume a global function or an event dispatch.
          const analyzeEvent = new CustomEvent("analyzeSymbol", {
            detail: { symbol: symbol },
          });
          document.dispatchEvent(analyzeEvent);
        }
      });

      // Add click listener specifically to the remove button
      const removeBtn = li.querySelector(".remove-watchlist-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent li click event from firing
          const symbol = e.currentTarget.dataset.symbol;
          this.removeFromWatchlist(symbol); // Use 'this' which refers to watchlistManager
        });
      }
    });
  },
  // refreshWatchlist needs access to the main app's state (like lastSignal)
  // and functions (like showToast). Pass appState or necessary functions.
  refreshWatchlist: async function (appState) {
    if (this.watchlist.length === 0) return;
    const refreshBtn = document.getElementById("refreshWatchlistBtn");
    if (!refreshBtn) return;

    refreshBtn.disabled = true;
    refreshBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Refreshing...';

    // Use Promise.all to refresh concurrently
    const refreshPromises = this.watchlist.map(async (item) => {
      try {
        const prices = await stockAPI.fetchStockData(item.symbol, "1m"); // Use short range for quick update
        if (prices && prices.length > 0) {
          const weights = getIndicatorWeights(); // Get current weights
          const signals = technicalIndicators.generateSignals(prices, weights);
          // Pass appState to updateCurrentSignal if needed for toast notifications
          const signal = chartVisualizer.updateCurrentSignal(signals, appState);
          this.updateSignal(item.symbol, signal); // Update signal in watchlist data and UI
        } else {
          console.warn(
            `No price data returned for ${item.symbol} during refresh.`,
          );
          this.updateSignal(item.symbol, "Error"); // Indicate error in UI
        }
      } catch (error) {
        console.error(`Error refreshing ${item.symbol}:`, error);
        this.updateSignal(item.symbol, "Error"); // Indicate error in UI
      }
    });

    await Promise.all(refreshPromises);

    refreshBtn.disabled = false;
    refreshBtn.innerHTML =
      '<i class="bi bi-arrow-clockwise"></i> Refresh Watchlist';
  },
};

export function getIndicatorWeights() {
  return {
    ma: parseInt(document.getElementById("maWeight").value) || 0,
    rsi: parseInt(document.getElementById("rsiWeight").value) || 0,
    macd: parseInt(document.getElementById("macdWeight").value) || 0,
    bb: parseInt(document.getElementById("bbWeight").value) || 0,
    stoch: parseInt(document.getElementById("stochWeight").value) || 0,
    adx: parseInt(document.getElementById("adxWeight").value) || 0,
  };
}

export function updateWeightDisplays() {
  document.getElementById("maWeightValue").textContent =
    document.getElementById("maWeight").value + "%";
  document.getElementById("rsiWeightValue").textContent =
    document.getElementById("rsiWeight").value + "%";
  document.getElementById("macdWeightValue").textContent =
    document.getElementById("macdWeight").value + "%";
  document.getElementById("bbWeightValue").textContent =
    document.getElementById("bbWeight").value + "%";
  document.getElementById("stochWeightValue").textContent =
    document.getElementById("stochWeight").value + "%";
  document.getElementById("adxWeightValue").textContent =
    document.getElementById("adxWeight").value + "%";
  const totalWeight = getIndicatorWeights();
  const sum = Object.values(totalWeight).reduce((a, b) => a + b, 0);
  const totalWeightElement = document.getElementById("totalWeight");
  const weightWarningElement = document.getElementById("weightWarning");

  totalWeightElement.textContent = sum;
  totalWeightElement.style.color = sum === 100 ? "inherit" : "red";
  weightWarningElement.style.display = sum !== 100 ? "block" : "none";
}

// Helper function to get indicator parameters from UI
export function getIndicatorParameters() {
  return {
    sma50Period: parseInt(document.getElementById("sma50Period").value) || 50,
    sma200Period:
      parseInt(document.getElementById("sma200Period").value) || 200,
    rsiPeriod: parseInt(document.getElementById("rsiPeriod").value) || 14,
    macdFastPeriod:
      parseInt(document.getElementById("macdFastPeriod").value) || 12,
    macdSlowPeriod:
      parseInt(document.getElementById("macdSlowPeriod").value) || 26,
    macdSignalPeriod:
      parseInt(document.getElementById("macdSignalPeriod").value) || 9,
    bbPeriod: parseInt(document.getElementById("bbPeriod").value) || 20,
    bbStdDev: parseFloat(document.getElementById("bbStdDev").value) || 2,
    stochKPeriod: parseInt(document.getElementById("stochKPeriod").value) || 14,
    stochDPeriod: parseInt(document.getElementById("stochDPeriod").value) || 3,
    adxPeriod: parseInt(document.getElementById("adxPeriod").value) || 14,
  };
}

// Helper function to show toast notifications
export function showToast(message, type = "info") {
  // Added type for styling
  const toastEl = document.getElementById("signalToast");
  const toastBody = toastEl.querySelector(".toast-body");
  if (!toastEl || !toastBody) {
    console.error("Toast element or body not found");
    return;
  }

  toastBody.textContent = message;

  // Optional: Add classes based on type for styling
  toastEl.classList.remove("bg-success", "bg-danger", "bg-warning", "bg-info"); // Clear previous types
  switch (type) {
    case "success":
      toastEl.classList.add("bg-success", "text-white");
      break;
    case "error":
      toastEl.classList.add("bg-danger", "text-white");
      break;
    case "warning":
      toastEl.classList.add("bg-warning", "text-dark");
      break;
    default: // info or unspecified
      toastEl.classList.add("bg-info", "text-dark");
  }

  // Ensure bootstrap is available or handle error
  if (
    typeof bootstrap === "undefined" ||
    typeof bootstrap.Toast === "undefined"
  ) {
    console.error(
      "Bootstrap Toast component not found. Make sure Bootstrap JS is loaded.",
    );
    // Fallback: Show a simple alert
    alert(message);
    return;
  }

  try {
    const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 5000 }); // Longer delay
    toast.show();
  } catch (error) {
    console.error("Error showing toast:", error);
    alert(message); // Fallback alert
  }
}

// Helper function to compute Average True Range (ATR)
export function computeATR(prices, period = 14) {
  if (!prices || prices.length < period + 1) return null; // Added null check for prices
  const atrValues = [];
  for (let i = 1; i < prices.length; i++) {
    const current = prices[i];
    const previous = prices[i - 1];
    // Ensure data points are valid numbers
    if (
      typeof current.high !== "number" ||
      typeof current.low !== "number" ||
      typeof previous.close !== "number"
    ) {
      console.warn(`Invalid data point at index ${i} for ATR calculation.`);
      continue; // Skip this iteration if data is invalid
    }
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    );
    atrValues.push(tr);
  }

  if (atrValues.length < period) return null; // Not enough TR values calculated

  // Calculate ATR using Wilder's smoothing method (more common for ATR)
  let atr =
    atrValues.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period; // Initial SMA
  for (let i = period; i < atrValues.length; i++) {
    atr = (atr * (period - 1) + atrValues[i]) / period;
  }

  return atr;
}
