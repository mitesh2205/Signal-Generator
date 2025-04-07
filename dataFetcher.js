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
      // Using a different CORS proxy to bypass potential browser restrictions
      // const proxyUrl_old = "https://cors-anywhere.herokuapp.com/"; // Old proxy, often blocked
      const proxyUrl = "https://thingproxy.freeboard.io/fetch/"; // Alternative proxy
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`;
      const response = await fetch(proxyUrl + targetUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try to parse error, default to empty object
        throw new Error(
          `Yahoo Finance API Error: ${response.status} ${
            response.statusText
          } - ${errorData?.chart?.error?.description || "Unknown error"}`,
        );
      }

      const data = await response.json();

      if (data.chart.error) {
        throw new Error(data.chart.error.description);
      }
      const result = data.chart.result[0];
      if (!result || !result.timestamp || !result.indicators.quote[0]) {
        throw new Error("No data available for this symbol or invalid format");
      }
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const prices = [];
      for (let i = 0; i < timestamps.length; i++) {
        // Ensure all required data points are present and not null
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
      return prices;
    } catch (error) {
      console.error("Error fetching stock data:", error);
      // Re-throw the error so the caller can handle it (e.g., display in UI)
      throw error;
    }
  },
};
