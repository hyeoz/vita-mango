#!/usr/bin/env swift

import AppKit

let appRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let mascotURL = appRoot.appendingPathComponent("assets/splash-jelly.png")
let outputURL = appRoot.appendingPathComponent("fastlane/metadata/android/ko-KR/images/featureGraphic.png")
let size = NSSize(width: 1024, height: 500)

func color(_ hex: UInt32) -> NSColor {
  NSColor(
    red: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: 1
  )
}

func rounded(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, width: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = width
    path.stroke()
  }
}

func text(_ value: String, rect: NSRect, size: CGFloat, weight: NSFont.Weight, color: NSColor) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.lineBreakMode = .byWordWrapping
  paragraph.lineSpacing = 7
  (value as NSString).draw(
    with: rect,
    options: [.usesLineFragmentOrigin, .usesFontLeading],
    attributes: [
      .font: NSFont.systemFont(ofSize: size, weight: weight),
      .foregroundColor: color,
      .paragraphStyle: paragraph
    ]
  )
}

final class FeatureGraphicView: NSView {
  let mascot: NSImage
  override var isFlipped: Bool { true }

  init(mascot: NSImage) {
    self.mascot = mascot
    super.init(frame: NSRect(origin: .zero, size: size))
  }

  required init?(coder: NSCoder) { nil }

  override func draw(_ dirtyRect: NSRect) {
    NSGradient(starting: color(0xFFF0CF), ending: color(0xFFD6E7))?.draw(in: bounds, angle: -12)

    rounded(NSRect(x: 76, y: 74, width: 554, height: 352), radius: 42, fill: .white.withAlphaComponent(0.92), stroke: color(0x2A2033), width: 5)
    rounded(NSRect(x: 112, y: 110, width: 185, height: 46), radius: 23, fill: color(0xFFF0A8))
    text("비타망고", rect: NSRect(x: 134, y: 116, width: 150, height: 35), size: 23, weight: .bold, color: color(0x5A3FD6))
    text("젤리와 만드는\n영양제 루틴", rect: NSRect(x: 112, y: 176, width: 445, height: 128), size: 48, weight: .heavy, color: color(0x2A2033))

    let rows = [
      ("✓", "오늘의 복용 체크", color(0x7C5CFF)),
      ("✓", "맞춤 추천과 기록", color(0x28BFD7))
    ]
    for (index, row) in rows.enumerated() {
      let y = CGFloat(318 + index * 48)
      rounded(NSRect(x: 112, y: y, width: 31, height: 31), radius: 15.5, fill: row.2)
      text(row.0, rect: NSRect(x: 119, y: y + 2, width: 22, height: 25), size: 18, weight: .bold, color: .white)
      text(row.1, rect: NSRect(x: 156, y: y - 1, width: 330, height: 35), size: 23, weight: .semibold, color: color(0x675C70))
    }

    mascot.draw(
      in: NSRect(x: 626, y: 46, width: 350, height: 350),
      from: .zero,
      operation: .sourceOver,
      fraction: 1,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
    rounded(NSRect(x: 700, y: 405, width: 205, height: 48), radius: 24, fill: color(0xFFFFFF).withAlphaComponent(0.88), stroke: color(0x2A2033), width: 3)
    text("오늘도 잘 챙겼어!", rect: NSRect(x: 720, y: 416, width: 170, height: 28), size: 18, weight: .bold, color: color(0x5A3FD6))

    rounded(NSRect(x: 894, y: 62, width: 78, height: 32), radius: 16, fill: color(0x7C5CFF), stroke: color(0x2A2033), width: 3)
    rounded(NSRect(x: 930, y: 106, width: 54, height: 25), radius: 12.5, fill: color(0x3EC7E6), stroke: color(0x2A2033), width: 3)
  }
}

guard let mascot = NSImage(contentsOf: mascotURL) else {
  fatalError("Unable to load mascot at \(mascotURL.path)")
}

try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
let view = FeatureGraphicView(mascot: mascot)
guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: Int(size.width),
  pixelsHigh: Int(size.height),
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
) else {
  fatalError("Unable to allocate output bitmap")
}

bitmap.size = size
view.cacheDisplay(in: view.bounds, to: bitmap)

guard
  let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 1.0]),
  let opaqueBitmap = NSBitmapImageRep(data: jpeg),
  let png = opaqueBitmap.representation(using: .png, properties: [:])
else {
  fatalError("Unable to encode PNG")
}
try png.write(to: outputURL)
print("Generated \(outputURL.path)")
