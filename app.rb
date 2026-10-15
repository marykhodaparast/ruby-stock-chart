
require 'sinatra/base'
require 'net/http'
require 'json'
require 'uri'
require 'time'

class StockChartApp < Sinatra::Base
  set :public_folder, File.join(__dir__, 'public')
  set :views, File.join(__dir__, 'views')

  get '/' do
    send_file File.join(settings.public_folder, 'index.html')
  end

  get '/api/search' do
    content_type :json

    query = params['q'].to_s.strip
    halt 400, { error: 'Query is required' }.to_json if query.empty?

    uri = URI('https://query1.finance.yahoo.com/v1/finance/search')
    uri.query = URI.encode_www_form(
      q: query,
      quotesCount: 10,
      newsCount: 0
    )

    response = Net::HTTP.get_response(uri)
    halt 502, { error: 'Stock search is unavailable' }.to_json unless response.is_a?(Net::HTTPSuccess)

    data = JSON.parse(response.body)
    results = Array(data['quotes']).filter_map do |quote|
      next unless quote['symbol']

      {
        symbol: quote['symbol'],
        name: quote['shortname'] || quote['longname'] || quote['symbol'],
        exchange: quote['exchange']
      }
    end

    results.to_json
  rescue StandardError => e
    warn "Search error: #{e.class}: #{e.message}"
    halt 502, { error: 'Unable to search stocks right now' }.to_json
  end

  get '/api/chart' do
    content_type :json

    symbol = params['symbol'].to_s.strip
    range = params['range'].to_s

    halt 400, { error: 'Symbol is required' }.to_json if symbol.empty?

    allowed_ranges = %w[1d 5d 1wk 1mo 1y]
    halt 400, { error: 'Invalid range' }.to_json unless allowed_ranges.include?(range)

    uri = URI(
      "https://query1.finance.yahoo.com/v8/finance/chart/#{URI.encode_www_form_component(symbol)}"
    )
    uri.query = URI.encode_www_form(
      range: range,
      interval: range == '1d' ? '5m' : (range == '5d' ? '15m' : '1d')
    )

    response = Net::HTTP.get_response(uri)
    halt 502, { error: 'Stock data is unavailable' }.to_json unless response.is_a?(Net::HTTPSuccess)

    payload = JSON.parse(response.body)
    result = payload.dig('chart', 'result', 0)
    halt 404, { error: 'No chart data found' }.to_json unless result

    timestamps = result['timestamp'] || []
    indicators = result.dig('indicators', 'quote', 0) || {}
    closes = indicators['close'] || []

    points = timestamps.zip(closes).filter_map do |timestamp, close|
      next if timestamp.nil? || close.nil?

      {
        time: Time.at(timestamp).utc.iso8601,
        price: close
      }
    end

    {
      symbol: symbol,
      currency: result.dig('meta', 'currency'),
      points: points
    }.to_json
  rescue StandardError => e
    warn "Chart error: #{e.class}: #{e.message}"
    halt 502, { error: 'Unable to load chart data right now' }.to_json
  end
end
