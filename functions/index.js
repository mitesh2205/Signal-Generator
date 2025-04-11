const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true }); // Enable CORS

// Define a mapping from frontend timeRange to Yahoo API range
const timeRangeToPeriod = (timeRange) => {
  switch (timeRange) {
    case "1m":
      return "1mo";
    case "3m":
      return "3mo";
    case "6m":
      return "6mo";
    case "1y":
      return "1y";
    case "2y":
      return "2y";
    case "5y":
      return "5y";
    default:
      return "1y"; // Default to 1 year
  }
};

exports.fetchStockData = functions.https.onRequest((request, response) => {
  // Use cors middleware to handle CORS headers automatically
  cors(request, response, async () => {
    const symbol = request.query.symbol;
    const timeRange = request.query.timeRange;

    if (!symbol) {
      response.status(400).send("Missing 'symbol' query parameter.");
      return;
    }

    const period = timeRangeToPeriod(timeRange); // Use the mapping function
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`;

    try {
      const yahooResponse = await axios.get(targetUrl, {
        // Optional: Add headers if Yahoo starts requiring them (e.g., User-Agent)
        // headers: {
        //   'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
        // }
      });

      // Check for errors within the Yahoo Finance response structure
      if (
        yahooResponse.data &&
        yahooResponse.data.chart &&
        yahooResponse.data.chart.error
      ) {
        console.error(
          "Yahoo Finance API Error:",
          yahooResponse.data.chart.error,
        );
        response.status(500).json({
          message: `Yahoo Finance API Error: ${
            yahooResponse.data.chart.error.description || "Unknown API error"
          }`,
          details: yahooResponse.data.chart.error,
        });
        return;
      }

      // Check if the expected data structure is present
      const result = yahooResponse.data?.chart?.result?.[0];
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
        console.error(
          "Invalid data format received from Yahoo Finance:",
          yahooResponse.data,
        );
        response
          .status(500)
          .send(
            "No data available for this symbol or invalid format received from API.",
          );
        return;
      }

      // Successfully fetched data, send it back to the client
      response.status(200).json(yahooResponse.data);
    } catch (error) {
      console.error("Error fetching stock data from Yahoo:", error.message);
      // Handle Axios errors (network issues, non-2xx responses)
      if (axios.isAxiosError(error)) {
        const statusCode = error.response ? error.response.status : 500;
        const errorMessage =
          error.response && error.response.data
            ? JSON.stringify(error.response.data)
            : error.message;
        response
          .status(statusCode)
          .send(`Error calling Yahoo Finance API: ${errorMessage}`);
      } else {
        // Handle other unexpected errors
        response
          .status(500)
          .send(`An unexpected error occurred: ${error.message}`);
      }
    }
  });
});
