// Robinhood API Integration using session-based authentication
const robinhoodAPI = {
  session: null,
  //console when Login button is clicked
  async authenticate(username, password, challengeType = "sms") {
    try {
      this.session = new Request();
      console.log("Login button clicked");
      // Check if username and password are provided
      console.log("Username:", username);
      // Step 1: Get login page to obtain device_id
      const loginPage = await this.session.get("https://robinhood.com/login");
      const deviceId = this.session.cookies.get("device_id");

      // Step 2: Attempt login and trigger 2FA challenge
      const response = await this.session.post(
        "https://api.robinhood.com/oauth2/token/",
        {
          username,
          password,
          grant_type: "password",
          client_id: "YOUR_CLIENT_ID",
          device_id: deviceId,
          challenge_type: challengeType,
        },
      );

      const data = await response.json();
      if (response.status === 400 && data.challenge) {
        console.log(
          "2FA Challenge triggered. Enter the code sent to your",
          challengeType,
        );
        return data.challenge.id;
      } else if (data.access_token) {
        localStorage.setItem("robinhood_token", data.access_token);
        return data.access_token;
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Error authenticating with Robinhood:", error);
      throw error;
    }
  },

  async verifyChallenge(challengeId, code) {
    try {
      const response = await this.session.post(
        `https://api.robinhood.com/challenge/${challengeId}/respond/`,
        {
          response: code,
        },
      );

      if (response.status === 200) {
        console.log("Challenge verified. Logging in...");
        return this.authenticate(); // Retry login after verification
      } else {
        throw new Error("Challenge verification failed");
      }
    } catch (error) {
      console.error("Error verifying challenge:", error);
      throw error;
    }
  },

  async fetchStockData(symbol) {
    try {
      const token = localStorage.getItem("robinhood_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `https://api.robinhood.com/quotes/${symbol}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (!data.last_trade_price) throw new Error("No data available");

      return {
        symbol: symbol,
        price: parseFloat(data.last_trade_price),
        high: parseFloat(data.high_price),
        low: parseFloat(data.low_price),
        open: parseFloat(data.open_price),
        close: parseFloat(data.adjusted_previous_close),
        volume: parseInt(data.volume),
      };
    } catch (error) {
      console.error("Error fetching stock data:", error);
      throw error;
    }
  },
};

const rhStockAPI = {
  session: null,

  async authenticate(username, password, challengeType = "sms") {
    try {
      // Create a custom session object with get and post methods using fetch.
      this.session = {
        get: async (url) => {
          return await fetch(url);
        },
        post: async (url, body) => {
          return await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        },
        cookies: {
          // Dummy implementation for device_id retrieval
          get: (name) => "dummy-device-id",
        },
      };

      // Step 1: Get login page to simulate obtaining a device_id.
      const loginPage = await this.session.get("https://robinhood.com/login");
      const deviceId = this.session.cookies.get("device_id");

      // Step 2: Attempt login and trigger 2FA challenge if required.
      const response = await this.session.post(
        "https://api.robinhood.com/oauth2/token/",
        {
          username,
          password,
          grant_type: "password",
          client_id: "YOUR_CLIENT_ID", // Replace with your actual client id
          device_id: deviceId,
          challenge_type: challengeType,
        },
      );

      const data = await response.json();

      if (response.status === 400 && data.challenge) {
        console.log(
          "2FA Challenge triggered. Enter the code sent to your",
          challengeType,
        );
        return data.challenge.id;
      } else if (data.access_token) {
        localStorage.setItem("robinhood_token", data.access_token);
        return data.access_token;
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Error authenticating with Robinhood:", error);
      throw error;
    }
  },

  async verifyChallenge(challengeId, code) {
    try {
      const response = await this.session.post(
        `https://api.robinhood.com/challenge/${challengeId}/respond/`,
        { response: code },
      );
      if (response.status === 200) {
        console.log("Challenge verified. Logging in...");
        return this.authenticate(); // Retry login after verification
      } else {
        throw new Error("Challenge verification failed");
      }
    } catch (error) {
      console.error("Error verifying challenge:", error);
      throw error;
    }
  },

  async fetchStockData(symbol) {
    try {
      const token = localStorage.getItem("robinhood_token");
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `https://api.robinhood.com/quotes/${symbol}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();
      if (!data.last_trade_price) throw new Error("No data available");

      return {
        symbol: symbol,
        price: parseFloat(data.last_trade_price),
        high: parseFloat(data.high_price),
        low: parseFloat(data.low_price),
        open: parseFloat(data.open_price),
        close: parseFloat(data.adjusted_previous_close),
        volume: parseInt(data.volume),
      };
    } catch (error) {
      console.error("Error fetching stock data:", error);
      throw error;
    }
  },

  async fetchYahooStockData(symbol, timeRange) {
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
      console.error("Error fetching Yahoo stock data:", error);
      throw error;
    }
  },
};
