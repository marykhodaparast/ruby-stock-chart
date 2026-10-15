const searchInput = document.getElementById("stock-search");
const suggestions = document.getElementById("suggestions");
const spinner = document.getElementById("search-spinner");
const statusEl = document.getElementById("chart-status");
const stockName = document.getElementById("stock-name");
const stockSymbol = document.getElementById("stock-symbol");
const latestPrice = document.getElementById("latest-price");
const rangeButtons = document.querySelectorAll(".range-button");

let selectedStock = null;
let currentRange = "1d";
let chart = null;
let searchTimer = null;
let searchController = null;
let chartController = null;

const rangeLabels = {
  "1d": "1 Day",
  "5d": "5 Days",
  "1wk": "1 Week",
  "1mo": "1 Month",
  "1y": "1 Year",
};

function setStatus(message) {
  statusEl.textContent = message;
}

function hideSuggestions() {
  suggestions.classList.add("hidden");
  suggestions.replaceChildren();
}

function formatPrice(value, currency) {
  if (!Number.isFinite(value)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

async function searchStocks(query) {
  if (searchController) searchController.abort();
  searchController = new AbortController();

  spinner.classList.remove("hidden");

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: searchController.signal,
    });

    if (!response.ok) throw new Error("Search request failed");

    const results = await response.json();
    renderSuggestions(results);
  } catch (error) {
    if (error.name !== "AbortError") {
      hideSuggestions();
      setStatus("Stock search is temporarily unavailable. Please try again.");
    }
  } finally {
    spinner.classList.add("hidden");
  }
}

function renderSuggestions(results) {
  suggestions.replaceChildren();

  if (!results.length) {
    hideSuggestions();
    return;
  }

  results.forEach((stock) => {
    const item = document.createElement("li");
    item.setAttribute("role", "option");
    item.tabIndex = 0;

    const symbol = document.createElement("div");
    symbol.className = "suggestion-symbol";
    symbol.textContent = stock.symbol;

    const name = document.createElement("div");
    name.className = "suggestion-name";
    name.textContent = [stock.name, stock.exchange].filter(Boolean).join(" · ");

    item.append(symbol, name);

    const choose = () => {
      selectedStock = stock;
      searchInput.value = stock.symbol;
      stockName.textContent = stock.name;
      stockSymbol.textContent = `${stock.symbol}${stock.exchange ? ` · ${stock.exchange}` : ""}`;
      hideSuggestions();
      loadChart();
    };

    item.addEventListener("click", choose);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter") choose();
    });

    suggestions.appendChild(item);
  });

  suggestions.classList.remove("hidden");
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  const query = searchInput.value.trim();

  if (query.length < 1) {
    hideSuggestions();
    return;
  }

  searchTimer = setTimeout(() => searchStocks(query), 300);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) hideSuggestions();
});

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentRange = button.dataset.range;

    rangeButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    if (selectedStock) loadChart();
  });
});

async function loadChart() {
  if (!selectedStock) return;

  if (chartController) chartController.abort();
  chartController = new AbortController();

  setStatus(
    `Loading ${selectedStock.symbol} data for ${rangeLabels[currentRange]}…`,
  );
  latestPrice.textContent = "…";

  try {
    const response = await fetch(
      `/api/chart?symbol=${encodeURIComponent(selectedStock.symbol)}&range=${encodeURIComponent(currentRange)}`,
      { signal: chartController.signal },
    );

    if (!response.ok) throw new Error("Chart request failed");

    const data = await response.json();

    if (!data.points || data.points.length === 0) {
      latestPrice.textContent = "—";
      setStatus("No price data is available for this range.");
      return;
    }

    renderChart(data);
  } catch (error) {
    if (error.name !== "AbortError") {
      latestPrice.textContent = "—";
      setStatus("Could not load stock data. Please try again later.");
    }
  }
}

function renderChart(data) {
  const points = data.points;
  const currency = data.currency || "USD";
  const lastPoint = points[points.length - 1];

  latestPrice.textContent = formatPrice(lastPoint.price, currency);
  setStatus(
    `${rangeLabels[currentRange]} · ${points.length} data points · Latest available data`,
  );

  if (chart) chart.destroy();

  const context = document.getElementById("stock-chart").getContext("2d");

  chart = new Chart(context, {
    type: "line",
    data: {
      labels: points.map((point) => new Date(point.time)),
      datasets: [
        {
          label: `${data.symbol} price`,
          data: points.map((point) => point.price),
          borderColor: "#61e6b5",
          backgroundColor: "rgba(97, 230, 181, 0.10)",
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.22,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatPrice(context.parsed.y, currency),
            title: (items) =>
              items.length ? new Date(items[0].parsed.x).toLocaleString() : "",
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            tooltipFormat: "PPp",
            displayFormats: {
              minute: "HH:mm",
              hour: "HH:mm",
              day: "MMM d",
              week: "MMM d",
              month: "MMM yyyy",
            },
          },
          ticks: { color: "#91a1ba", maxTicksLimit: 6 },
          grid: { color: "rgba(145,161,186,0.08)" },
        },
        y: {
          ticks: {
            color: "#91a1ba",
            callback: (value) => formatPrice(value, currency),
          },
          grid: { color: "rgba(145,161,186,0.10)" },
        },
      },
    },
  });
}
selectedStock = { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" };
searchInput.value = "AAPL";
stockName.textContent = selectedStock.name;
stockSymbol.textContent = "AAPL · NASDAQ";
loadChart();