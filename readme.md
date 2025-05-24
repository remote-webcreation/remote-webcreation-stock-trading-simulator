# Terminal Stock Trading Simulator

A simple terminal-based stock trading simulator built with Node.js and JavaScript

## What does it do?

- **Show stock prices**: Enter a stock symbol to see the latest price.
- **Buy/Sell stocks (simulation)**: Simulate buying or selling stocks – no real money involved!
- **Portfolio management**: View your current stock holdings and their value.
- **History**: See a log of all your simulated trades.

## How to run

1. **Clone this repo:**
    ```bash
    git clone git@github.com:remote-webcreation/terminal-stock-trading-simulator.git
    cd terminal-stock-sim
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Get a free API key for stock data:**
    - Register at [Finnhub](https://finnhub.io/)
    - Set your API key in `src/api.js` (look for the comment in the file!)

4. **Start the app:**
    ```bash
    node src/main.js
    ```

## Project structure

```
src/
  main.js         # Entry point (menu & logic)
  api.js          # Fetches stock data
  portfolio.js    # Manages your portfolio
  history.js      # Keeps a history of your trades
```

## Notes

- This is a learning project. No real trading is possible!
- All data is stored locally, nothing is sent to any server.
- Built for beginners – easy to understand and extend.

---

Enjoy simulating trades!