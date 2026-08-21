#!/usr/bin/env bash
#
# Dev build onto a physical iOS device (not the simulator).
#
# What it does:
#   1. Auto-selects the connected physical iPhone/iPad (or honours DEVICE_ID).
#   2. Runs the Expo dev build (`expo run:ios --device`).
#
# Usage:
#   npm run ios:device                 # build, install, and start Metro
#   npm run ios:device -- --build-only # build + install only, no Metro
#
# Overrides (env vars):
#   DEVICE_ID=<udid>   pick a specific device (see: xcrun xctrace list devices)
#
set -euo pipefail

# Run from the app/ root regardless of where the script is invoked from.
cd "$(dirname "$0")/.."

# --- flags -------------------------------------------------------------------
BUILD_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --build-only) BUILD_ONLY=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

# --- pick the physical device ------------------------------------------------
# xctrace lists real devices before the "== Simulators ==" section. Physical
# iOS UDIDs look like 00008140-001854E926E8801C (one dash); simulator UUIDs
# have the 8-4-4-4-12 form, so we keep only the single-dash pattern.
if [ -z "${DEVICE_ID:-}" ]; then
  # Newline-separated list of physical-device UDIDs (portable to bash 3.2 —
  # no mapfile). Physical UDIDs are 8-hex + dash + 16-hex; sims are 8-4-4-4-12.
  DEVICES="$(
    xcrun xctrace list devices 2>/dev/null \
      | awk '/^== Simulators ==/{exit} /iPhone|iPad/ && !/Simulator/{print}' \
      | grep -oE '\([0-9A-Fa-f]{8}-[0-9A-Fa-f]{16}\)$' | tr -d '()'
  )"
  COUNT="$(printf '%s\n' "$DEVICES" | grep -c . || true)"
  if [ "$COUNT" -eq 0 ]; then
    echo "❌ 연결된 실기기를 못 찾았어요. USB로 연결하고 기기 잠금을 해제한 뒤 '이 컴퓨터를 신뢰'를 눌러주세요." >&2
    exit 1
  elif [ "$COUNT" -gt 1 ]; then
    echo "여러 기기가 연결돼 있어요. DEVICE_ID로 하나를 지정하세요:" >&2
    xcrun xctrace list devices 2>/dev/null | awk '/^== Simulators ==/{exit} /iPhone|iPad/ && !/Simulator/{print "  " $0}' >&2
    exit 1
  fi
  DEVICE_ID="$(printf '%s\n' "$DEVICES" | grep . | head -1)"
fi

# --- build -------------------------------------------------------------------
echo "📱 기기: $DEVICE_ID"
[ "$BUILD_ONLY" -eq 1 ] && echo "🔧 빌드 전용 (Metro 미실행)"
echo

NO_BUNDLER=""
[ "$BUILD_ONLY" -eq 1 ] && NO_BUNDLER="--no-bundler"

npx expo run:ios --device "$DEVICE_ID" $NO_BUNDLER

echo
echo "✅ 완료. 무료 Apple ID로 서명했다면 기기에서 설정 → 일반 → VPN 및 기기 관리 → 개발자 앱 '신뢰'가 필요할 수 있어요."
