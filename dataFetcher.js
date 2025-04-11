// dataFetcher.js

export const stockAPI = {
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
      const cloudFunctionUrl = `https://us-central1-signal-generator-57934.cloudfunctions.net/fetchStockData?symbol=${encodeURIComponent(
        symbol,
      )}&timeRange=${encodeURIComponent(timeRange)}`;

      const response = await fetch(cloudFunctionUrl);

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => `HTTP error ${response.status}`);
        throw new Error(
          `Error calling Cloud Function: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();

      if (data?.chart?.error) {
        throw new Error(
          `Yahoo Finance API Error (from function): ${data.chart.error.description}`,
        );
      }

      const result = data.chart.result[0];
      if (!result || !result.timestamp || !result.indicators.quote[0]) {
        throw new Error("No data available for this symbol or invalid format");
      }

      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const prices = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (
          timestamps[i] !== null &&
          quote.open[i] !== null &&
          quote.high[i] !== null &&
          quote.low[i] !== null &&
          quote.close[i] !== null &&
          quote.volume[i] !== null
        ) {
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
      if (prices.length === 0) {
        throw new Error("No valid price data points found after filtering.");
      }

      // Extract metadata
      const meta = result.meta || {};
      return {
        prices: prices,
        fullName: meta.longName || `${symbol} (Name not available)`, // Fallback if longName is missing
        currentPrice:
          meta.regularMarketPrice || prices[prices.length - 1].close, // Fallback to last close if regularMarketPrice is unavailable
      };
    } catch (error) {
      console.error("Error fetching stock data:", error);
      throw error;
    }
  },
};
