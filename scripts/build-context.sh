#!/bin/bash
set -e

# Exit if no PR number is provided
if [ -z "$1" ]; then
  echo "Error: Pull Request number is required."
  exit 1
fi

PR_NUMBER=$1

# Get the diff and changed files
echo "Fetching diff for PR #${PR_NUMBER}..."
gh pr diff "${PR_NUMBER}" > diff.txt
gh pr diff "${PR_NUMBER}" --name-only > files.txt

echo "--- diff.txt content ---"
cat diff.txt
echo "--- files.txt content ---"
cat files.txt

# Start with the diff
echo "## Pull Request Diff:" > context.txt
echo '```diff' >> context.txt
cat diff.txt >> context.txt
echo '```' >> context.txt
echo "" >> context.txt
echo "## Full Content of Changed Files:" >> context.txt

# Append each changed file's content
while IFS= read -r file; do
  if [ -f "$file" ]; then
    echo "---" >> context.txt
    echo "### File: \`${file}\`" >> context.txt
    echo '```' >> context.txt
    # Use git show to read the file from the index, avoiding filesystem issues
    git show "HEAD:${file}" >> context.txt
    echo '```' >> context.txt
    echo "" >> context.txt
  fi
done < files.txt

# Set the multiline output for the next step
echo "--- context.txt content ---"
cat context.txt

{
  echo 'context<<EOF'
  cat context.txt
  echo 'EOF'
} >> "$GITHUB_OUTPUT"