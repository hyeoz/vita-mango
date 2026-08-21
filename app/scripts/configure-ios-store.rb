#!/usr/bin/env ruby

require "spaceship"
require "json"
require "net/http"
require "uri"

app_dir = File.expand_path("..", __dir__)
repo_dir = File.dirname(app_dir)
raw_key_path = ENV.fetch("ASC_KEY_PATH")
key_path = [
  File.expand_path(raw_key_path),
  File.expand_path(raw_key_path, app_dir),
  File.expand_path(raw_key_path, repo_dir)
].find { |path| File.exist?(path) }
abort("App Store Connect API key file not found") unless key_path

token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV.fetch("ASC_KEY_ID"),
  issuer_id: ENV.fetch("ASC_ISSUER_ID"),
  filepath: key_path
)
Spaceship::ConnectAPI.token = token

app = Spaceship::ConnectAPI::App.find("com.vitamango.app")
abort("App Store Connect app not found") unless app

# The app shows third-party ads through AdMob, and the SDK agreement grants the
# rights needed to display that content.
app.update(
  attributes: {
    contentRightsDeclaration: Spaceship::ConnectAPI::App::ContentRightsDeclaration::USES_THIRD_PARTY_CONTENT
  }
)
puts "Content rights configured"

def asc_request(token, method, path, body: nil, query: nil)
  uri = URI("https://api.appstoreconnect.apple.com#{path}")
  uri.query = URI.encode_www_form(query) if query
  request_class = {
    get: Net::HTTP::Get,
    post: Net::HTTP::Post
  }.fetch(method)
  request = request_class.new(uri)
  request["Authorization"] = "Bearer #{token.text}"
  if body
    request["Content-Type"] = "application/json"
    request.body = JSON.generate(body)
  end
  Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(request) }
end

# Fastlane's legacy price-tier endpoint no longer supports new apps, so use the
# current public App Store Connect price-schedule API. Keep this idempotent: if
# a schedule already exists, leave it untouched.
price_schedule = asc_request(token, :get, "/v1/apps/#{app.id}/appPriceSchedule")
abort("Unable to read App Store price schedule: HTTP #{price_schedule.code}") unless ["200", "404"].include?(price_schedule.code)

base_territory_id = "KOR"
if price_schedule.code == "200"
  base_territory = asc_request(token, :get, "/v1/appPriceSchedules/#{app.id}/baseTerritory")
  if base_territory.code == "200"
    base_territory_id = JSON.parse(base_territory.body).dig("data", "id") || base_territory_id
  end
end

manual_prices = asc_request(token, :get, "/v1/appPriceSchedules/#{app.id}/manualPrices")
has_manual_price = if manual_prices.code == "200"
  JSON.parse(manual_prices.body).fetch("data").any?
else
  false
end

unless has_manual_price
  price_points = asc_request(
    token,
    :get,
    "/v1/apps/#{app.id}/appPricePoints",
    query: { "filter[territory]" => base_territory_id, "limit" => "200" }
  )
  abort("Unable to read App Store price points: HTTP #{price_points.code}") unless price_points.code == "200"
  free_price_point = JSON.parse(price_points.body).fetch("data").find do |item|
    item.dig("attributes", "customerPrice").to_f.zero?
  end
  abort("Free App Store price point not found") unless free_price_point

  new_price_id = "${newprice-0}"
  create_price = asc_request(
    token,
    :post,
    "/v1/appPriceSchedules",
    body: {
      data: {
        type: "appPriceSchedules",
        attributes: {},
        relationships: {
          app: { data: { type: "apps", id: app.id } },
          manualPrices: { data: [{ type: "appPrices", id: new_price_id }] },
          baseTerritory: { data: { type: "territories", id: base_territory_id } }
        }
      },
      included: [{
        type: "appPrices",
        id: new_price_id,
        attributes: { startDate: nil, endDate: nil },
        relationships: {
          appPricePoint: {
            data: { type: "appPricePoints", id: free_price_point.fetch("id") }
          }
        }
      }]
    }
  )
  abort("Unable to create free App Store price schedule: HTTP #{create_price.code} #{create_price.body}") unless create_price.code.start_with?("2")
  created_schedule = JSON.parse(create_price.body).fetch("data")
  puts "Created price schedule #{created_schedule.fetch("id", app.id)}"
end
puts "Free pricing configured"

app_info = app.fetch_edit_app_info
abort("Editable App Info record not found") unless app_info

age_rating = app_info.fetch_age_rating_declaration
abort("Age rating declaration not found") unless age_rating

age_rating.update(attributes: {
  alcoholTobaccoOrDrugUseOrReferences: "NONE",
  contests: "NONE",
  gamblingSimulated: "NONE",
  gunsOrOtherWeapons: "NONE",
  horrorOrFearThemes: "NONE",
  matureOrSuggestiveThemes: "NONE",
  medicalOrTreatmentInformation: "NONE",
  profanityOrCrudeHumor: "NONE",
  sexualContentGraphicAndNudity: "NONE",
  sexualContentOrNudity: "NONE",
  violenceCartoonOrFantasy: "NONE",
  violenceRealisticProlongedGraphicOrSadistic: "NONE",
  violenceRealistic: "NONE",
  advertising: true,
  ageAssurance: false,
  gambling: false,
  healthOrWellnessTopics: true,
  lootBox: false,
  messagingAndChat: false,
  parentalControls: false,
  unrestrictedWebAccess: false,
  userGeneratedContent: false
})
puts "Age rating questionnaire configured"

version = app.get_app_store_versions(
  filter: { platform: "IOS" },
  includes: "build,appStoreVersionSubmission"
).find { |item| item.version_string == "1.0.0" }
abort("App Store version 1.0.0 not found") unless version
version.update(attributes: { copyright: "2026 HYEWON LEE" })
puts "Copyright configured"

# App privacy answers are completed in App Store Connect. Apple removed the
# legacy endpoint Fastlane used for this questionnaire, while the other store
# settings above remain supported through the public API.
puts "Store settings configured; complete App Privacy in App Store Connect"
