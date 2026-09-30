import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct VMIntakeAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var remaining: [VMIntakeItem]
    var completedNames: String
    var taken: Int
    var total: Int
    var remainingCount: Int
    var copy: VMIntakeCopy
    var complete: Bool { total > 0 && taken == total }
  }
  var day: String
  var session: String
  var expiresAt: Date
}

@available(iOS 17.0, *)
struct VMMarkIntakeIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Record supplement intake"
  static var openAppWhenRun = false
  @Parameter(title: "Supplement") var itemId: String
  @Parameter(title: "Day") var day: String
  @Parameter(title: "Session") var session: String
  init() {}
  init(itemId: String, day: String, session: String) {
    self.itemId = itemId; self.day = day; self.session = session
  }
  func perform() async throws -> some IntentResult {
    // LiveActivityIntent executes in the containing app, even if JS isn't running.
    _ = try await VMActivityCoordinator.shared.submit(.mark(itemId, day, session))
    return .result()
  }
}

@available(iOS 17.0, *)
actor VMActivityCoordinator {
  static let shared = VMActivityCoordinator()
  enum Operation: Sendable {
    case sync(String), start, stop, reset, pending, status
    case mark(String, String, String)
  }
  private var tail: Task<String, Error>?

  // ActivityKit update/end suspends. Serialize whole transactions as well as
  // disk writes so quick taps can never publish states out of order.
  func submit(_ operation: Operation) async throws -> String {
    let previous = tail
    let task = Task { [self] in
      if let previous { _ = await previous.result }
      return try await apply(operation)
    }
    tail = task
    return try await task.value
  }

  private func apply(_ operation: Operation) async throws -> String {
    var journal = try VMIntakeDisk.read()
    switch operation {
    case .pending:
      return String(decoding: try JSONEncoder().encode(journal.pending), as: UTF8.self)
    case .status: break
    case .reset:
      journal = VMIntakeJournal()
      try VMIntakeDisk.write(journal)
      await endAll()
    case .stop:
      journal.enabled = false
      try VMIntakeDisk.write(journal)
      await endAll()
    case .sync(let json):
      struct Input: Decodable { var snapshot: VMIntakeSnapshot; var acknowledged: [String] }
      let input = try JSONDecoder().decode(Input.self, from: Data(json.utf8))
      guard input.snapshot.day == VMIntakeDisk.day() else { return status(journal) }
      journal.reconcile(input.snapshot, acknowledged: Set(input.acknowledged))
      try VMIntakeDisk.write(journal)
      try await refresh(&journal, explicitStart: false)
    case .start:
      guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        throw NSError(domain: "VMActivity", code: 1, userInfo: [NSLocalizedDescriptionKey: "disabled"])
      }
      journal.enabled = true
      try VMIntakeDisk.write(journal)
      try await refresh(&journal, explicitStart: true)
    case .mark(let id, let day, let session):
      let current = Activity<VMIntakeAttributes>.activities.first {
        $0.attributes.session == session && $0.attributes.day == day &&
          $0.attributes.expiresAt > Date() && $0.activityState == .active
      }
      guard current != nil, journal.enabled,
        journal.markTaken(itemId: id, day: day, today: VMIntakeDisk.day()) else {
        // A stale card must never tick tomorrow's dose.
        return status(journal)
      }
      try VMIntakeDisk.write(journal)
      await cancelTodayReminder(item: journal.snapshot?.items.first { $0.id == id })
      try await refresh(&journal, explicitStart: false)
    }
    return status(journal)
  }

  private func status(_ journal: VMIntakeJournal) -> String {
    let active = Activity<VMIntakeAttributes>.activities.contains {
      $0.attributes.day == VMIntakeDisk.day() && $0.attributes.expiresAt > Date() &&
      $0.activityState == .active
    }
    return "{\"supported\":true,\"allowed\":\(ActivityAuthorizationInfo().areActivitiesEnabled),\"enabled\":\(journal.enabled),\"active\":\(active)}"
  }

  private func endAll() async {
    for activity in Activity<VMIntakeAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  private func refresh(_ journal: inout VMIntakeJournal, explicitStart: Bool) async throws {
    guard journal.enabled, let snapshot = journal.snapshot, !snapshot.items.isEmpty,
      snapshot.day == VMIntakeDisk.day() else { await endAll(); return }
    let state = VMIntakeAttributes.ContentState(
      remaining: Array(snapshot.items.filter { !$0.taken }.prefix(3)),
      completedNames: snapshot.items.filter(\.taken).prefix(2).map(\.title).joined(separator: " · "),
      taken: snapshot.items.filter(\.taken).count, total: snapshot.items.count,
      remainingCount: snapshot.items.filter { !$0.taken }.count, copy: snapshot.copy)
    var current: Activity<VMIntakeAttributes>?
    for activity in Activity<VMIntakeAttributes>.activities {
      if activity.attributes.day != snapshot.day || activity.attributes.expiresAt <= Date() ||
          activity.activityState == .ended || activity.activityState == .dismissed || current != nil {
        await activity.end(nil, dismissalPolicy: .immediate)
      } else { current = activity }
    }
    if let activity = current {
      let content = ActivityContent(state: state, staleDate: activity.attributes.expiresAt)
      if state.complete {
        await activity.end(content, dismissalPolicy: .after(Date().addingTimeInterval(60)))
      } else { await activity.update(content) }
    } else if !state.complete && (explicitStart || journal.lastStartedDay != snapshot.day) {
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
      let midnight = Calendar.current.startOfDay(for: Date()).addingTimeInterval(1)
      let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: midnight)!
      let expiry = min(nextDay.addingTimeInterval(-1), Date().addingTimeInterval(8 * 3600))
      _ = try Activity.request(attributes: VMIntakeAttributes(day: snapshot.day,
        session: UUID().uuidString, expiresAt: expiry),
        content: ActivityContent(state: state, staleDate: expiry), pushType: nil)
      journal.lastStartedDay = snapshot.day
      try VMIntakeDisk.write(journal)
    }
  }
}

import UserNotifications
@available(iOS 17.0, *)
private func cancelTodayReminder(item: VMIntakeItem?) async {
  guard let item else { return }
  let center = UNUserNotificationCenter.current()
  let delivered = await center.deliveredNotifications()
  center.removeDeliveredNotifications(withIdentifiers: delivered.filter {
    ($0.request.content.userInfo["name"] as? String) == item.name &&
      Calendar.current.isDateInToday($0.date)
  }.map { $0.request.identifier })
  // Recurring triggers must remain for tomorrow. The app will rebuild them
  // when it resumes; never delete a recurring reminder from this background action.
}
