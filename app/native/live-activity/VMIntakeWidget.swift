import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let mango = Color(red: 1, green: 0.88, blue: 0.48)
private let ink = Color(red: 0.065, green: 0.082, blue: 0.118)

struct MangoMark: View {
  var body: some View {
    GeometryReader { g in
      let sx = g.size.width / 40, sy = g.size.height / 44
      ZStack {
        Path { p in
          p.move(to: CGPoint(x: 24, y: 9))
          p.addCurve(to: CGPoint(x: 4, y: 29), control1: CGPoint(x: 12, y: 5), control2: CGPoint(x: 3, y: 15))
          p.addCurve(to: CGPoint(x: 24, y: 39), control1: CGPoint(x: 5, y: 41), control2: CGPoint(x: 15, y: 44))
          p.addCurve(to: CGPoint(x: 33, y: 15), control1: CGPoint(x: 32, y: 34), control2: CGPoint(x: 37, y: 23))
          p.addCurve(to: CGPoint(x: 24, y: 9), control1: CGPoint(x: 31, y: 12), control2: CGPoint(x: 29, y: 10))
        }.fill(Color(red: 1, green: 0.706, blue: 0.24))
        Path { p in
          p.move(to: CGPoint(x: 10, y: 30))
          p.addQuadCurve(to: CGPoint(x: 23, y: 12), control: CGPoint(x: 10, y: 17))
        }.stroke(mango, style: StrokeStyle(lineWidth: 3, lineCap: .round))
        Path { p in
          p.move(to: CGPoint(x: 24, y: 10))
          p.addCurve(to: CGPoint(x: 36, y: 3), control1: CGPoint(x: 24, y: 3), control2: CGPoint(x: 31, y: 0))
          p.addQuadCurve(to: CGPoint(x: 24, y: 10), control: CGPoint(x: 35, y: 14))
        }.fill(Color(red: 0.58, green: 0.71, blue: 0.49))
      }.scaleEffect(x: sx, y: sy, anchor: .topLeading)
    }.accessibilityHidden(true)
  }
}

@available(iOS 17.0, *)
struct IntakeCard: View {
  var state: VMIntakeAttributes.ContentState
  var attributes: VMIntakeAttributes
  var stale = false

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 10) {
        if state.complete {
          Image(systemName: "checkmark").font(.system(size: 21, weight: .semibold))
            .foregroundStyle(ink).frame(width: 39, height: 39).background(mango, in: Circle())
        } else { MangoMark().frame(width: 29, height: 33) }
        VStack(alignment: .leading, spacing: 3) {
          if !state.complete { Text(state.copy.brand).font(.system(size: 11)).foregroundStyle(.white.opacity(0.64)) }
          Text(state.complete ? state.copy.complete : (stale ? state.copy.expired : state.copy.title))
            .font(.system(size: 17, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.75)
          if state.complete { Text(state.copy.completeSubtitle).font(.system(size: 11)).foregroundStyle(.white.opacity(0.65)) }
        }
        Spacer(minLength: 3)
        (Text("\(state.taken)").font(.system(size: 27, weight: .bold)).foregroundColor(mango) +
          Text(" / \(state.total)").font(.system(size: 15)).foregroundColor(.white.opacity(0.65)))
          .monospacedDigit().accessibilityLabel("\(state.taken) / \(state.total)")
      }
      if !state.complete {
        if stale {
          Link(destination: URL(string: "vitamango://home")!) {
            Text(state.copy.openApp).font(.system(size: 13, weight: .semibold))
              .frame(maxWidth: .infinity, minHeight: 44).background(.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 13))
          }
        } else {
          HStack(spacing: 7) {
            ForEach(state.remaining) { item in
              Button(intent: VMMarkIntakeIntent(itemId: item.id, day: attributes.day, session: attributes.session)) {
                HStack(spacing: 5) {
                  Circle().stroke(color(item.color), lineWidth: 1.7).frame(width: 15, height: 15)
                  Text(item.title).font(.system(size: 12, weight: .medium)).lineLimit(2).minimumScaleFactor(0.8)
                }.frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 5)
                  .background(.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 13))
                  .overlay(RoundedRectangle(cornerRadius: 13).stroke(.white.opacity(0.16), lineWidth: 1))
                  .contentShape(RoundedRectangle(cornerRadius: 13))
              }.buttonStyle(.plain).accessibilityLabel("\(item.title), \(state.copy.taken)")
            }
          }
        }
        HStack(spacing: 8) {
          if !state.completedNames.isEmpty {
            Text("✓ " + state.completedNames).lineLimit(1).foregroundStyle(.white.opacity(0.75))
          }
          Spacer(minLength: 0)
          Text(state.remainingCount > 3 ? "+\(state.remainingCount - 3)" : state.copy.hint)
            .lineLimit(1).foregroundStyle(.white.opacity(0.6))
        }.font(.system(size: 10)).frame(height: 13)
      }
    }.fixedSize(horizontal: false, vertical: true)
      .foregroundStyle(.white).padding(.horizontal, 16).padding(.vertical, 14)
      .frame(maxWidth: .infinity).frame(height: state.complete ? 88 : 148)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }

  private func color(_ hex: String) -> Color {
    let value = UInt(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0xffb43d
    return Color(red: Double((value >> 16) & 255) / 255,
      green: Double((value >> 8) & 255) / 255, blue: Double(value & 255) / 255)
  }
}

@available(iOS 17.0, *)
struct VMIntakeWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: VMIntakeAttributes.self) { context in
      IntakeCard(state: context.state, attributes: context.attributes, stale: context.isStale)
        .id(context.state.complete)
        .transaction { $0.animation = nil }
        .activityBackgroundTint(ink.opacity(0.94)).activitySystemActionForegroundColor(.white)
        .widgetURL(URL(string: "vitamango://home"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.bottom) {
          IntakeCard(state: context.state, attributes: context.attributes, stale: context.isStale)
            .id(context.state.complete)
            .padding(.horizontal, -8)
        }
      } compactLeading: {
        MangoMark().frame(width: 21, height: 24)
      } compactTrailing: {
        Text("\(context.state.taken)/\(context.state.total)")
          .font(.system(size: 13, weight: .semibold)).monospacedDigit().foregroundStyle(mango)
      } minimal: {
        MangoMark().frame(width: 21, height: 24)
      }.keylineTint(mango).widgetURL(URL(string: "vitamango://home"))
    }
  }
}

#if WIDGET_EXTENSION
@main
struct VMIntakeWidgetBundle: WidgetBundle {
  var body: some Widget { VMIntakeWidget() }
}
#endif
