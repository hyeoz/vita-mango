#!/usr/bin/env ruby

require "spaceship"
require "digest/md5"

APP_IDENTIFIER = "com.vitamango.app"
APP_VERSION = "1.0.0"
PLATFORM = "IOS"
LOCALE = "ko"
DISPLAY_TYPE = "APP_IPHONE_65"

app_dir = File.expand_path("..", __dir__)
repo_dir = File.dirname(app_dir)
screenshots_dir = File.join(app_dir, "fastlane", "screenshots", LOCALE)
screenshots = Dir[File.join(screenshots_dir, "*.png")].sort
abort("Expected exactly 5 Korean screenshots, found #{screenshots.length}") unless screenshots.length == 5

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

app = Spaceship::ConnectAPI::App.find(APP_IDENTIFIER)
abort("App Store Connect app not found") unless app

submission = app.get_in_progress_review_submission(platform: PLATFORM)
if submission
  puts "Canceling current review submission"
  submission.cancel_submission
  deadline = Time.now + 180
  loop do
    sleep 5
    break unless app.get_in_progress_review_submission(platform: PLATFORM)
    abort("Timed out waiting for review cancellation") if Time.now >= deadline
  end
  puts "Review submission canceled"
end

version = app.get_app_store_versions(
  filter: { platform: PLATFORM },
  includes: "build,appStoreVersionSubmission"
).find { |item| item.version_string == APP_VERSION }
abort("App Store version #{APP_VERSION} not found") unless version

localization = version.get_app_store_version_localizations.find { |item| item.locale == LOCALE }
abort("#{LOCALE} localization not found") unless localization

existing_sets = localization.get_app_screenshot_sets
target_sets = existing_sets.select { |set| set.screenshot_display_type == DISPLAY_TYPE }
target_sets.each(&:delete!)
puts "Removed #{target_sets.length} existing #{DISPLAY_TYPE} screenshot set(s)"

set = localization.create_app_screenshot_set(
  attributes: { screenshotDisplayType: DISPLAY_TYPE }
)

uploaded = screenshots.map do |path|
  puts "Uploading #{File.basename(path)}"
  screenshot = set.upload_screenshot(path: path, wait_for_processing: true)
  abort("Screenshot processing failed: #{screenshot.error_messages.join('; ')}") unless screenshot.complete?
  screenshot
end

set.reorder_screenshots(app_screenshot_ids: uploaded.map(&:id))
local_checksums = screenshots.map { |path| Digest::MD5.file(path).hexdigest }
deadline = Time.now + 60
loop do
  verified = Spaceship::ConnectAPI::AppScreenshotSet.get(app_screenshot_set_id: set.id)
  remote = verified.app_screenshots
  remote_checksums = remote.map(&:source_file_checksum)
  break if remote.length == 5 && remote.all?(&:complete?) && remote_checksums == local_checksums
  abort("Remote screenshot order/checksum does not match local files") if Time.now >= deadline
  sleep 2
end

puts "Verified #{remote.length} screenshots in filename order"
