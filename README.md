# StockScope — Stock Market Explorer

StockScope is a responsive, single-page web application built with Ruby and Sinatra that allows users to search for stocks and explore historical stock prices through an interactive chart.

## Features

- **Stock Search:** Search for stocks by company name or ticker symbol using autocomplete suggestions.
- **Interactive Charts:** Visualize historical stock prices with Chart.js.
- **Flexible Date Ranges:** Switch between 1 day, 5 days, 1 week, 1 month, and 1 year.
- **Real Market Data:** Retrieve stock symbols and historical price data using the Twelve Data API.
- **Responsive Design:** A mobile-friendly interface that adapts to different screen sizes.
- **Backend API:** Ruby and Sinatra endpoints for stock search and chart data.

## Tech Stack

- Ruby
- Sinatra
- Rack
- JavaScript
- Chart.js
- Twelve Data API
- HTML5 and CSS3

## Getting Started

### Prerequisites

- Ruby
- Bundler
- A Twelve Data API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/marykhodaparast/ruby-stock-chart.git
   cd ruby-stock-chart
   ```

2. Install the dependencies:

   ```bash
   bundle install
   ```

3. Set your Twelve Data API key as an environment variable:

   ```bash
   export TWELVE_DATA_API_KEY='your_api_key_here'
   ```

   Replace `your_api_key_here` with your own API key. Do not commit API keys to the repository.

4. Start the application:

   ```bash
   bundle exec rackup -p 4567
   ```

5. Open the application in your browser:

   http://localhost:4567

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=Apple` | Search for stocks by name or symbol |
| GET | `/api/chart?symbol=AAPL&range=1d` | Retrieve historical price data |

Supported chart ranges: `1d`, `5d`, `1wk`, `1mo`, and `1y`.

## Data Provider

Stock search and historical price data are provided by the [Twelve Data API](https://twelvedata.com/). Data availability and request limits depend on the API plan.

## Disclaimer

This application is intended for educational and demonstration purposes only. Market data may be delayed and should not be considered financial advice.