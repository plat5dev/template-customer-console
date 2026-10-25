#!/bin/sh
# Writes /config.js from the environment, so one image serves any stack.
# The nginx image runs /docker-entrypoint.d/*.sh before it starts.
set -eu

js() { printf '"%s"' "$(printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g')"; }

cat > /usr/share/nginx/html/config.js <<CONFIG
window.__PLAT5_WEB_CONFIG__ = {
  gatewayUrl: $(js "${GATEWAY_URL:-}"),
  authIssuer: $(js "${AUTH_ISSUER:-}"),
  authClientId: $(js "${AUTH_CLIENT_ID:-}"),
  authRedirectUri: $(js "${AUTH_REDIRECT_URI:-}"),
  authAudience: $(js "${AUTH_AUDIENCE:-}"),
  authSubjectClaim: $(js "${AUTH_SUBJECT_CLAIM:-}"),
}
CONFIG
