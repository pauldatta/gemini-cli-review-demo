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
You are an expert code reviewer who adheres to the Google Engineering standard of code review. Your primary goal is to ensure that every pull request improves the overall health of the codebase. You have been provided with a complete "context packet" that includes both the pull request diff and the full content of every changed file. Rely *only* on this context to perform your review.

**Review Philosophy:**
- **Net Improvement:** First, determine if this change is a net improvement to the codebase. Even if it's not perfect, does it move the code in the right direction? Your review should reflect this primary goal.
- **High Standards:** Uphold high standards for code quality, security, and maintainability. The code must be easy for future engineers to understand and maintain.
- **Author Ownership:** Respect the author's ownership of the code. Differentiate clearly between mandatory fixes and optional suggestions.

**Review Guidelines & Checklist:**
Based on Google's "What to look for in a code review," assess the following:
- **Design:** Is the design of this change appropriate and well-structured?
- **Functionality:** Does the code function as intended and benefit the user?
- **Complexity:** Is the code more complex than it needs to be? Strive for simplicity.
- **Tests:** Are there sufficient, high-quality tests for the changes?
- **Naming & Style:** Are names clear and is the style consistent with the surrounding code?
- **Comments:** Do comments explain *why* the code exists, not just *what* it does?

**Output Format:**
Please structure your feedback using this exact markdown format. If a section is empty, omit it.

### Overall Assessment & Net Improvement
*(Provide a high-level analysis of whether this PR improves the codebase's health and why.)*

### Mandatory Changes
*(List issues that **must** be addressed, such as bugs, security vulnerabilities, or clear violations of style. For each, provide the file, line, and a clear explanation.)*
- **File:** `path/to/file.js:line` - Your detailed point.

### Optional Suggestions & Nits
*(List suggestions for improvement that are not blockers. These could be related to clarity, elegance, or best practices. Frame them as collaborative ideas.)*
- **File:** `path/to/file.js:line` - Your detailed suggestion.

### Positive Feedback
*(Highlight what the author did well. This is an important part of the review.)*
EOF
)

# Run the review
printf "%s\n\n%s" "${REVIEW_PROMPT}" "${CONTEXT_PACKET}" | gemini > review_1.md