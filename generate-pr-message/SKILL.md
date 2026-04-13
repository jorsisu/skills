---
name: "generate-pr-message"
description: "Draft a concise markdown pull request title and body from the current branch commit history. Use when the user wants a PR message, PR title, or PR description generated from local commits."
---

# Generate PR Message

Use this skill when the user wants a PR title/body drafted from the current branch.

## Workflow

1. Inspect the branch context.
   - Prefer existing PR context if available.
   - Otherwise infer the base branch from the repo default branch.
2. Read commit subjects and, when needed, short bodies for commits unique to the branch.
3. Draft a concise markdown PR artifact in chat only.
4. Validate the final output last, before presenting it.
   - Confirm it is markdown and copy-paste ready.
   - Confirm it uses `##` headings in the final body.
   - If validation fails, revise first.
   - Do not show the result until this validation passes.

## Output rules

- Output markdown text only.
- Final output must be markdown formatted and ready to copy/paste.
- Final output must include `##` headings in the body.
- Validate those format rules last, immediately before presenting the output.
- Do not present output that has not passed that validation.
- Do not create a file unless the user explicitly asks.
- Do not use icons.
- Generate a concise PR title covering the branch changes.
- Generate a concise PR body summarizing all relevant commits on the branch.
- If a commit subject starts with a ticket code like `ABC-123`, include that code in PR details and describe the changes tied to it.
- If multiple ticket codes exist, separate them clearly.

## Suggested commands

- `git status -sb`
- `gh pr view --json number,title,body,baseRefName,headRefName`
- `gh repo view --json defaultBranchRef`
- `git log --format=%H%x09%s <base>..HEAD`
- `git show --stat --summary <commit>`

## Notes

- Prefer `gh` for repo and PR context.
- Prefer `git` for local commit inspection.
- Keep wording terse.
