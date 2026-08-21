#!/usr/bin/env swift

import AppKit

struct ShotSpec {
  let filename: String
  let source: String
  let headline: String
  let subtitle: String
  let cropHeight: CGFloat
  let startColor: NSColor
  let endColor: NSColor
  let chips: [String]
}

private let canvasSize = NSSize(width: 1242, height: 2688)
private let repoRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
private let sourceRoot = repoRoot.appendingPathComponent("build/store-source")
private let outputRoot = repoRoot.appendingPathComponent("fastlane/screenshots/ko")
private let mascotURL = repoRoot.appendingPathComponent("assets/splash-jelly.png")

private func color(_ hex: UInt32) -> NSColor {
  NSColor(
    red: CGFloat((hex >> 16) & 0xff) / 255,
    green: CGFloat((hex >> 8) & 0xff) / 255,
    blue: CGFloat(hex & 0xff) / 255,
    alpha: 1
  )
}

private let specs: [ShotSpec] = [
  ShotSpec(
    filename: "01_personalized_survey.png",
    source: "01_survey.png",
    headline: "내 컨디션에 맞춘\n똑똑한 맞춤 설문",
    subtitle: "답변에 따라 필요한 질문만 골라서 물어봐요",
    cropHeight: 2556,
    startColor: color(0xEAF8FF),
    endColor: color(0xFFF8EE),
    chips: []
  ),
  ShotSpec(
    filename: "02_smart_recommendation.png",
    source: "02_recommendation.png",
    headline: "겹치는 효능은 줄이고\n딱 맞는 조합만",
    subtitle: "근거와 주의사항, 기대 효과까지 한눈에 확인해요",
    cropHeight: 2556,
    startColor: color(0xFFF4DE),
    endColor: color(0xF4EEFF),
    chips: []
  ),
  ShotSpec(
    filename: "03_daily_intake.png",
    source: "03_home.png",
    headline: "오늘 먹을 영양제\n한눈에 체크",
    subtitle: "복용 현황과 남은 영양제를 바로 확인해요",
    cropHeight: 1920,
    startColor: color(0xFFF0F6),
    endColor: color(0xFFF9EE),
    chips: ["✓ 오늘 복용 현황", "✓ 남은 영양제 확인"]
  ),
  ShotSpec(
    filename: "04_daily_diary.png",
    source: "04_diary.png",
    headline: "하루 컨디션을\n한 줄로 기록",
    subtitle: "복용과 컨디션을 함께 돌아보는 작은 습관",
    cropHeight: 1960,
    startColor: color(0xF4EEFF),
    endColor: color(0xE9FAFF),
    chips: ["✓ 간단한 한 줄 기록", "✓ 지난 컨디션 모아보기"]
  ),
  ShotSpec(
    filename: "05_manual_supplement_add.png",
    source: "05_manual_add.png",
    headline: "53종 영양제를\n검색해서 직접 추가",
    subtitle: "카테고리 선택과 중복 방지까지 간편하게",
    cropHeight: 2556,
    startColor: color(0xEAFBFF),
    endColor: color(0xFFF4E8),
    chips: []
  )
]

final class StoreScreenshotView: NSView {
  let spec: ShotSpec
  let sourceImage: NSImage
  let mascotImage: NSImage

  override var isFlipped: Bool { true }

  init(spec: ShotSpec, sourceImage: NSImage, mascotImage: NSImage) {
    self.spec = spec
    self.sourceImage = sourceImage
    self.mascotImage = mascotImage
    super.init(frame: NSRect(origin: .zero, size: canvasSize))
  }

  required init?(coder: NSCoder) { nil }

  private func roundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
    if let stroke {
      stroke.setStroke()
      path.lineWidth = lineWidth
      path.stroke()
    }
  }

  private func drawText(
    _ text: String,
    in rect: NSRect,
    font: NSFont,
    color: NSColor,
    alignment: NSTextAlignment = .left,
    lineSpacing: CGFloat = 0
  ) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineSpacing = lineSpacing
    paragraph.lineBreakMode = .byWordWrapping
    (text as NSString).draw(
      with: rect,
      options: [.usesLineFragmentOrigin, .usesFontLeading],
      attributes: [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph
      ]
    )
  }

  private func drawDecorationPill(_ rect: NSRect, fill: NSColor, angle: CGFloat) {
    NSGraphicsContext.saveGraphicsState()
    let transform = NSAffineTransform()
    transform.translateX(by: rect.midX, yBy: rect.midY)
    transform.rotate(byDegrees: angle)
    transform.translateX(by: -rect.midX, yBy: -rect.midY)
    transform.concat()
    roundedRect(rect, radius: rect.height / 2, fill: fill, stroke: color(0x2A2033), lineWidth: 4)
    NSGraphicsContext.restoreGraphicsState()
  }

  private func drawChip(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat) {
    let rect = NSRect(x: x, y: y, width: width, height: 76)
    roundedRect(rect, radius: 38, fill: .white.withAlphaComponent(0.9), stroke: color(0x2A2033), lineWidth: 3)
    drawText(
      text,
      in: NSRect(x: rect.minX + 20, y: rect.minY + 18, width: rect.width - 40, height: 46),
      font: NSFont(name: "NanumSquareRoundB", size: 27) ?? .boldSystemFont(ofSize: 27),
      color: color(0x2A2033),
      alignment: .center
    )
  }

  override func draw(_ dirtyRect: NSRect) {
    NSGradient(starting: spec.startColor, ending: spec.endColor)?.draw(in: bounds, angle: -90)

    drawDecorationPill(NSRect(x: 1015, y: 76, width: 118, height: 48), fill: color(0x7C5CFF), angle: -9)
    drawDecorationPill(NSRect(x: 1092, y: 148, width: 86, height: 38), fill: color(0x3EC7E6), angle: 12)

    mascotImage.draw(
      in: NSRect(x: 78, y: 58, width: 122, height: 122),
      from: .zero,
      operation: .sourceOver,
      fraction: 1,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
    roundedRect(NSRect(x: 218, y: 84, width: 430, height: 70), radius: 35, fill: .white.withAlphaComponent(0.82))
    drawText(
      "비타망고 · 나만의 영양제 루틴",
      in: NSRect(x: 248, y: 101, width: 380, height: 44),
      font: NSFont(name: "NanumSquareRoundB", size: 27) ?? .boldSystemFont(ofSize: 27),
      color: color(0x5A3FD6)
    )

    drawText(
      spec.headline,
      in: NSRect(x: 82, y: 195, width: 1080, height: 184),
      font: NSFont(name: "NanumSquareRoundEB", size: 68) ?? .boldSystemFont(ofSize: 68),
      color: color(0x2A2033),
      lineSpacing: 8
    )
    drawText(
      spec.subtitle,
      in: NSRect(x: 86, y: 408, width: 1060, height: 56),
      font: NSFont(name: "NanumSquareRoundB", size: 29) ?? .systemFont(ofSize: 29),
      color: color(0x766B82)
    )

    let imageX: CGFloat = 121
    let imageY: CGFloat = 520
    let imageWidth: CGFloat = 1000
    let sourceWidth = sourceImage.size.width
    let sourceHeight = sourceImage.size.height
    let cropHeight = min(spec.cropHeight, sourceHeight)
    let imageHeight = cropHeight * (imageWidth / sourceWidth)
    let imageRect = NSRect(x: imageX, y: imageY, width: imageWidth, height: imageHeight)

    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = color(0x2A2033).withAlphaComponent(0.20)
    shadow.shadowBlurRadius = 24
    shadow.shadowOffset = NSSize(width: 0, height: -14)
    shadow.set()
    roundedRect(imageRect, radius: 56, fill: .white)
    NSGraphicsContext.restoreGraphicsState()

    let clip = NSBezierPath(roundedRect: imageRect, xRadius: 56, yRadius: 56)
    NSGraphicsContext.saveGraphicsState()
    clip.addClip()
    let sourceRect = NSRect(x: 0, y: sourceHeight - cropHeight, width: sourceWidth, height: cropHeight)
    sourceImage.draw(
      in: imageRect,
      from: sourceRect,
      operation: .sourceOver,
      fraction: 1,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
    NSGraphicsContext.restoreGraphicsState()
    color(0x2A2033).setStroke()
    clip.lineWidth = 5
    clip.stroke()

    if !spec.chips.isEmpty {
      let chipY = min(imageRect.maxY + 48, canvasSize.height - 116)
      drawChip(spec.chips[0], x: 152, y: chipY, width: 440)
      drawChip(spec.chips[1], x: 620, y: chipY, width: 470)
    }
  }
}

try FileManager.default.createDirectory(at: outputRoot, withIntermediateDirectories: true)
guard let mascot = NSImage(contentsOf: mascotURL) else {
  fatalError("Unable to load mascot at \(mascotURL.path)")
}

for spec in specs {
  let sourceURL = sourceRoot.appendingPathComponent(spec.source)
  guard let source = NSImage(contentsOf: sourceURL) else {
    fatalError("Unable to load source image at \(sourceURL.path)")
  }
  let view = StoreScreenshotView(spec: spec, sourceImage: source, mascotImage: mascot)
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize.width),
    pixelsHigh: Int(canvasSize.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    fatalError("Unable to allocate bitmap for \(spec.filename)")
  }
  bitmap.size = canvasSize
  view.cacheDisplay(in: view.bounds, to: bitmap)
  guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Unable to encode \(spec.filename)")
  }
  let outputURL = outputRoot.appendingPathComponent(spec.filename)
  try png.write(to: outputURL, options: .atomic)
  print("Wrote \(outputURL.path)")
}
