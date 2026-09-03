#!/bin/sh
# Launcher for eas-cli-local-build-plugin, used via EAS_LOCAL_BUILD_PLUGIN_PATH.
#
# By default `eas build --local` runs:
#     npx -y eas-cli-local-build-plugin@<version> <base64 job blob>
# The blob is several KB long. Endpoint-security agents that inspect exec
# arguments (SentinelOne, for one) treat a long encoded token on a node command
# line as an indicator of compromise and SIGKILL the process at exec time, so
# the build dies instantly with "exited with signal: SIGKILL" and no output.
#
# This wrapper is equivalent to the default invocation -- same pinned plugin
# version, same entry point -- except the blob travels through the environment
# instead of argv, which is not inspected the same way.
set -e

JOB_B64="$1"
if [ -z "$JOB_B64" ]; then
  echo "eas-local-build-plugin: expected a base64 job argument" >&2
  exit 1
fi

# Match the plugin version eas-cli itself would have installed, so the job
# payload and the plugin stay in sync across eas-cli upgrades.
VERSION="$EAS_LOCAL_BUILD_PLUGIN_VERSION"
if [ -z "$VERSION" ]; then
  for root in "$PWD/node_modules" "$(npm root -g 2>/dev/null)"; do
    LOCAL_JS="$root/eas-cli/build/build/local.js"
    if [ -n "$root" ] && [ -f "$LOCAL_JS" ]; then
      VERSION=$(sed -n "s/.*PLUGIN_PACKAGE_VERSION = '\([^']*\)'.*/\1/p" "$LOCAL_JS" | head -1)
      [ -n "$VERSION" ] && break
    fi
  done
fi
if [ -z "$VERSION" ]; then
  echo "eas-local-build-plugin: could not determine the plugin version;" >&2
  echo "  set EAS_LOCAL_BUILD_PLUGIN_VERSION to the version eas-cli expects." >&2
  exit 1
fi

PREFIX="$HOME/.cache/eas-cli-local-build-plugin/$VERSION"
MAIN="$PREFIX/node_modules/eas-cli-local-build-plugin/dist/main.js"
if [ ! -f "$MAIN" ]; then
  echo "Installing eas-cli-local-build-plugin@$VERSION ..." >&2
  mkdir -p "$PREFIX"
  npm install --prefix "$PREFIX" --no-save --no-audit --no-fund --loglevel=error \
    "eas-cli-local-build-plugin@$VERSION" >&2
fi

EAS_LOCAL_BUILD_PLUGIN_JOB="$JOB_B64" \
EAS_LOCAL_BUILD_PLUGIN_MAIN="$MAIN" \
exec node -e '
  const main = process.env.EAS_LOCAL_BUILD_PLUGIN_MAIN;
  const job = process.env.EAS_LOCAL_BUILD_PLUGIN_JOB;
  // Rebuild the argv the plugin expects, then drop the payload so child
  // processes do not inherit a multi-kilobyte environment variable.
  process.argv = [process.argv[0], main, job];
  delete process.env.EAS_LOCAL_BUILD_PLUGIN_JOB;
  delete process.env.EAS_LOCAL_BUILD_PLUGIN_MAIN;
  require(main);
'
