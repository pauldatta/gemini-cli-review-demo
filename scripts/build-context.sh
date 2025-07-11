#!/bin/bash
set -euo pipefail

# Exit if no PR number is provided
if [ -z "$1" ]; then
  echo "Error: Pull Request number is required." >&2
  exit 1
fi

PR_NUMBER=$1
DEBUG_FLAG="${2:-}" # Default to empty string if not provided

# Get the diff content into a variable.
echo "Fetching diff for PR #${PR_NUMBER}..."
DIFF_CONTENT=$(gh pr diff "${PR_NUMBER}")

# --- Debugging output ---
if [[ "$DEBUG_FLAG" == "--debug" ]]; then
  echo "--- diff content ---"
  echo "${DIFF_CONTENT}"
  echo "--------------------"
fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo 'context<<EOF'
    echo "## Pull Request Diff:"
    echo '```diff'
    echo "${DIFF_CONTENT}"
    echo '```'
    echo 'EOF'
  } >> "$GITHUB_OUTPUT"
else
  # If not in a GitHub Actions environment, print to stdout for local testing.
  echo "--- GITHUB_OUTPUT is not set, printing to standard output ---"
  echo "${DIFF_CONTENT}"
fi
