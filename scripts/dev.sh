#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/.dev-certs"
CADDYFILE="$ROOT/.dev-caddyfile"
PORT="${PORT:-9080}"
CADDY_PORT="${CADDY_PORT:-8443}"

# Find required tools
CADDY="$(command -v caddy 2>/dev/null || true)"
if [ -z "$CADDY" ]; then
  echo "Error: caddy not found on PATH" >&2
  echo "Install via: nix develop  (or install caddy manually)" >&2
  exit 1
fi

PYTHON="$(command -v python3 2>/dev/null || true)"
if [ -z "$PYTHON" ]; then
  echo "Error: python3 not found on PATH" >&2
  exit 1
fi

QRGEN="$(command -v qrencode 2>/dev/null || true)"

# Detect LAN IP (first non-loopback IPv4)
LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' || true)"
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(ifconfig 2>/dev/null | awk '/inet / && !/127\.0\.0\.1/ {print $2; exit}' || true)"
fi
if [ -z "$LAN_IP" ]; then
  LAN_IP="127.0.0.1"
fi

# Generate self-signed cert (regenerate if IP changed or missing)
NEED_NEW_CERT=false
if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
  NEED_NEW_CERT=true
elif ! openssl x509 -in "$CERT_DIR/cert.pem" -noout -ext subjectAltName 2>/dev/null | grep -q "$LAN_IP"; then
  NEED_NEW_CERT=true
fi

if [ "$NEED_NEW_CERT" = true ]; then
  echo ">>> Generating self-signed TLS certificate..."
  mkdir -p "$CERT_DIR"
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$CERT_DIR/key.pem" \
    -out "$CERT_DIR/cert.pem" \
    -days 365 \
    -subj "/CN=ocr-dev" \
    -addext "subjectAltName=DNS:localhost,DNS:ocr-dev,IP:127.0.0.1,IP:${LAN_IP}" \
    2>/dev/null
  echo "    Certs written to $CERT_DIR/"
fi

# Generate Caddyfile with resolved paths
cat > "$CADDYFILE" <<EOF
{
	auto_https off
}

:${CADDY_PORT} {
	tls ${CERT_DIR}/cert.pem ${CERT_DIR}/key.pem

	header {
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Embedder-Policy "require-corp"
		Cross-Origin-Resource-Policy "cross-origin"
		Access-Control-Allow-Origin "*"
	}

	@wasm path *.wasm
	header @wasm {
		-Content-Type
		Content-Type "application/wasm"
	}

	reverse_proxy localhost:${PORT}
}
EOF

# Build if needed
if [ ! -d "$ROOT/dist" ]; then
  echo ">>> Building project..."
  (cd "$ROOT" && npm run build)
fi

cleanup() {
  echo ""
  echo ">>> Shutting down..."
  kill "$PY_PID" "$CADDY_PID" 2>/dev/null || true
  wait "$PY_PID" "$CADDY_PID" 2>/dev/null || true
  rm -f "$CADDYFILE"
}
trap cleanup EXIT INT TERM

echo ">>> Starting static file server on http://localhost:$PORT"
"$PYTHON" -m http.server "$PORT" --directory "$ROOT" &>/dev/null &
PY_PID=$!

echo ">>> Starting Caddy on https://localhost:$CADDY_PORT"
"$CADDY" run --config "$CADDYFILE" --adapter caddyfile &>/dev/null &
CADDY_PID=$!

sleep 1

LOCAL_URL="https://localhost:${CADDY_PORT}/examples/vanilla/"
LAN_URL="https://${LAN_IP}:${CADDY_PORT}/examples/vanilla/"

echo ""
echo "============================================"
echo "  Dev server running"
echo "============================================"
echo ""
echo "  Local:"
echo "    ${LOCAL_URL}"
echo ""
echo "  Network (scan QR on phone):"
echo "    ${LAN_URL}"

if [ -n "$QRGEN" ]; then
  echo ""
  "$QRGEN" -t ANSIUTF8 "$LAN_URL"
else
  echo ""
  echo "  (install qrencode for QR code in terminal)"
fi

echo ""
echo "  HTTPS uses a self-signed cert."
echo "  On your phone: accept the warning, then"
echo "  grant camera permission when prompted."
echo ""
echo "  Press Ctrl+C to stop."
echo "============================================"

wait
