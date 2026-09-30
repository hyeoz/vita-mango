import Foundation

struct VMIntakeItem: Codable, Hashable, Identifiable {
  var id: String
  var name: String
  var title: String
  var color: String
  var taken: Bool
}

struct VMIntakeCopy: Codable, Hashable {
  var brand: String
  var title: String
  var hint: String
  var complete: String
  var completeSubtitle: String
  var expired: String
  var openApp: String
  var taken: String
}

struct VMIntakeSnapshot: Codable {
  var day: String
  var items: [VMIntakeItem]
  var copy: VMIntakeCopy
}

struct VMIntakeEvent: Codable {
  var eventId: String
  var itemId: String
  var day: String
  var completed: Bool
}

struct VMIntakeJournal: Codable {
  var snapshot: VMIntakeSnapshot?
  var pending: [VMIntakeEvent] = []
  var enabled = false
  var lastStartedDay: String?

  mutating func reconcile(_ incoming: VMIntakeSnapshot, acknowledged: Set<String>) {
    // Only the app's durable-save receipt may retire events. A concurrent tap
    // that wasn't read by JS is retained and overlaid on the older JS snapshot.
    pending.removeAll { acknowledged.contains($0.eventId) }
    var next = incoming
    for event in pending where event.day == next.day {
      if let index = next.items.firstIndex(where: { $0.id == event.itemId }) {
        next.items[index].taken = true
      }
    }
    snapshot = next
  }

  @discardableResult
  mutating func markTaken(itemId: String, day: String, today: String) -> Bool {
    guard day == today, var current = snapshot, current.day == day,
          let index = current.items.firstIndex(where: { $0.id == itemId }),
          !current.items[index].taken else { return false }
    current.items[index].taken = true
    snapshot = current
    pending.append(VMIntakeEvent(eventId: UUID().uuidString, itemId: itemId,
      day: day, completed: current.items.allSatisfy(\.taken)))
    return true
  }
}

enum VMIntakeDisk {
  static var url: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("VitaMango/intake-live-activity.json")
  }
  static func read(from url: URL = url) throws -> VMIntakeJournal {
    guard FileManager.default.fileExists(atPath: url.path) else { return VMIntakeJournal() }
    return try JSONDecoder().decode(VMIntakeJournal.self, from: Data(contentsOf: url))
  }
  static func write(_ value: VMIntakeJournal, to url: URL = url) throws {
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try JSONEncoder().encode(value).write(to: url, options: .atomic)
  }
  static func day(_ date: Date = Date()) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
  }
}
