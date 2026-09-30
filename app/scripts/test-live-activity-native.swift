import Foundation

@main
struct JournalTests {
  static func main() throws {
    let copy = VMIntakeCopy(brand: "비타망고", title: "오늘의 영양제", hint: "기록", complete: "완료",
      completeSubtitle: "완료", expired: "만료", openApp: "앱 열기", taken: "먹었어요")
    let snapshot = VMIntakeSnapshot(day: "2026-09-30", items: [
      VMIntakeItem(id: "id:omega", name: "오메가-3", title: "오메가-3", color: "#ff7eb6", taken: false),
      VMIntakeItem(id: "name:custom", name: "Custom", title: "Custom", color: "#ffd23f", taken: false),
    ], copy: copy)
    var journal = VMIntakeJournal(snapshot: snapshot)
    assert(!journal.markTaken(itemId: "id:omega", day: snapshot.day, today: "2026-10-01"))
    assert(!journal.markTaken(itemId: "missing", day: snapshot.day, today: snapshot.day))
    assert(journal.markTaken(itemId: "id:omega", day: snapshot.day, today: snapshot.day))
    assert(!journal.markTaken(itemId: "id:omega", day: snapshot.day, today: snapshot.day))
    assert(journal.pending.count == 1)
    journal.reconcile(snapshot, acknowledged: [])
    assert(journal.snapshot!.items[0].taken, "Concurrent old JS snapshot must not erase a tap")
    let first = journal.pending[0].eventId
    assert(journal.markTaken(itemId: "name:custom", day: snapshot.day, today: snapshot.day))
    assert(journal.pending.last!.completed)
    var saved = snapshot; saved.items[0].taken = true
    journal.reconcile(saved, acknowledged: [first])
    assert(journal.pending.count == 1 && journal.snapshot!.items.allSatisfy(\.taken))
    let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + "/journal.json")
    defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
    try VMIntakeDisk.write(journal, to: url)
    let recovered = try VMIntakeDisk.read(from: url)
    assert(recovered.pending.count == 1 && recovered.snapshot!.items.allSatisfy(\.taken))
    // Undo in the app is respected once the durable receipt acknowledges the tap.
    journal.reconcile(snapshot, acknowledged: Set(recovered.pending.map(\.eventId)))
    assert(journal.pending.isEmpty && !journal.snapshot!.items[0].taken)
    print("Native journal: 11 assertions passed, including crash recovery and concurrent taps")
  }
}
