#!/bin/bash
set -e

# Exit if no PR number is provided
if [ -z "$1" ]; then
  echo "Error: Pull Request number is required."
  exit 1
fi

PR_NUMBER=$1
DEBUG=false

# Check for a debug flag in the second argument
if [ "$2" == "--debug" ]; then
  DEBUG=true
fi

# Get the diff and changed files into variables
echo "Fetching diff for PR #${PR_NUMBER}..."
DIFF=$(gh pr diff "${PR_NUMBER}")
CHANGED_FILES=$(gh pr diff "${PR_NUMBER}" --name-only)

# Build the context packet in a variable
CONTEXT_PACKET="## Pull Request Diff:\n\`\`\`diff\n${DIFF}\n\`\`\`\n\n## Full Content of Changed Files:\n"

while IFS= read -r file; do
  if [ -f "$file" ]; then
    CONTEXT_PACKET+=$(printf "\n---\n### File: \`%s\`\n\`\`\`\n%s\n\`\`\`\n" "$file" "$(git show "HEAD:${file}")")
  fi
done <<< "${CHANGED_FILES}"

# If in debug mode, print the context packet
if [ "$DEBUG" = true ]; then
  echo "--- DEBUG: Context Packet ---"
  echo -e "${CONTEXT_PACKET}"
  echo "--- END DEBUG ---"
fi

# Create the review prompt
REVIEW_PROMPT=$(cat <<'EOF'
You are an expert code reviewer. Your task is to provide a detailed review of this pull request.

**IMPORTANT:** You have been provided with a complete "context packet" that includes both the pull request diff and the full content of every changed file. Rely *only* on this context to perform your review.

**Review Guidelines:**
- Focus on code quality, security, performance, and maintainability.
- For this project, also consider the gameplay and user experience.
- Provide specific, constructive feedback.

**Output Format:**
Please structure your feedback using this exact markdown format. If you have no feedback for a section, omit it.

---
### 
*(Feedback on the user experience, game feel, and fun factor.)*

### 
*(Specific suggestions for improvement, including code snippets if helpful.)*
- **File:** `path/to/file.js:line` - Your detailed suggestion.

### 
*(Point out things you liked about the PR!)*

---

If you have no suggestions at all, respond with the single phrase: "This looks great! No suggestions."

Here is the context packet:
EOF
)

# Run the review
printf "%s\n\n%s" "${REVIEW_PROMPT}" "${CONTEXT_PACKET}" | gemini > review.md
