
FROM ruby:3.2-alpine

WORKDIR /app

RUN apk add --no-cache build-base

COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

ENV RACK_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bundle", "exec", "puma", "-p", "8080", "config.ru"]

