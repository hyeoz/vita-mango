import Foundation
import React

@objc(VMLiveActivity)
final class VMLiveActivity: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }
  @objc func execute(_ command: String, payload: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *) else {
      resolve(command == "pending" ? "[]" : "{\"supported\":false,\"allowed\":false,\"enabled\":false,\"active\":false}")
      return
    }
    let operation: VMActivityCoordinator.Operation
    switch command {
    case "sync": operation = .sync(payload)
    case "start": operation = .start
    case "stop": operation = .stop
    case "reset": operation = .reset
    case "pending": operation = .pending
    default: operation = .status
    }
    Task {
      do { resolve(try await VMActivityCoordinator.shared.submit(operation)) }
      catch { reject("LIVE_ACTIVITY_FAILED", error.localizedDescription, error) }
    }
  }
}
