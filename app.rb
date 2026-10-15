
require 'sinatra/base'
require 'net/http'
require 'json'
require 'uri'
require 'time'
require 'openssl'

class StockChartApp < Sinatra::Base
  set :public_folder, File.join(__dir__, 'public')

  API_BASE = 'https://api.twelvedata.com'.freeze

  def self.fetch_api(path, params)
    uri = URI("#{API_BASE}#{path}")
    uri.query = URI.encode_www_form(params)

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 10
    http.read_timeout = 20

    response = http.request(Net::HTTP::Get.new(uri))
    data = JSON.parse(response.body)

    [response.is_a?(Net::HTTPSuccess), data]
  rescue StandardError => e
    warn "Twelve Data request error: #{e.class}: #{e.message}"
    [false, {}]
  end

  def self.api_key
    ENV['TWELVE_DATA_API_KEY'].to_s.strip
  end

  get '/' do
    send_file File.join(settings.public_folder, 'index.html')
  end

  get '/api/search' do
    content_type :json

    query = params['q'].to_s.strip
    halt 400, { error: 'Query is required' }.to_json if query.empty?
    halt 500, { error: 'API key is not configured' }.to_json if self.class.api_key.empty?

    success, data = self.class.fetch_api(
      '/symbol_search',
      {
        symbol: query,
        outputsize: 10,
        apikey: self.class.api_key
      }
    )

    if !success || data['status'] == 'error'
      warn "Stock search failed: #{data['message']}"
      halt 502, { error: 'Unable to search stocks right now' }.to_json
    end

    results = Array(data['data']).filter_map do |item|
      next unless item['symbol']

      {
        symbol: item['symbol'],
        name: item['instrument_name'] || item['symbol'],
        exchange: item['exchange'] || item['country'] || ''
      }
    end

    results.to_json
  end

  get '/api/chart' do
    content_type :json

    symbol = params['symbol'].to_s.strip
    range = params['range'].to_s

    halt 400, { error: 'Symbol is required' }.to_json if symbol.empty?

    ranges = {
      '1d'  => ['5min', 78],
      '5d'  => ['15min', 130],
      '1wk' => ['1day', 7],
      '1mo' => ['1day', 30],
      '1y'  => ['1day', 252]
    }

    halt 400, { error: 'Invalid range' }.to_json unless ranges.key?(range)
    halt 500, { error: 'API key is not configured' }.to_json if self.class.api_key.empty?

    interval, outputsize = ranges[range]

    success, data = self.class.fetch_api(
      '/time_series',
      {
        symbol: symbol,
        interval: interval,
        outputsize: outputsize,
        apikey: self.class.api_key
      }
    )

    if !success || data['status'] == 'error' || !data['values']
      warn "Stock chart failed: #{data['message']}"
      halt 502, {
        error: data['message'] || 'Unable to load stock data right now'
      }.to_json
    end

    points = Array(data['values']).filter_map do |item|
      close = Float(item['close'], exception: false)
      next unless close && item['datetime']

      {
        time: Time.parse("#{item['datetime']} UTC").utc.iso8601,
        price: close
      }
    end.reverse

    {
      symbol: symbol,
      currency: data.dig('meta', 'currency'),
      points: points
    }.to_json
  end
end
