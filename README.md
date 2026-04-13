# Skills

Reusable AI coding skills for daily workflows. Each skill is a folder containing instructions, scripts, and resources that extend AI assistant capabilities.

## Usage

Point your AI assistant to a skill folder. The assistant reads `SKILL.md` and follows the instructions.

## Available Skills

| Skill | Description |
|-------|-------------|
| [figma-bridge](./figma-bridge/) | Automates Figma → Code workflow using MCP. Extracts design data, maps to project tokens, suggests implementation |
| [generate-pr-message](./generate-pr-message/) | Draft a concise markdown PR title and body from the current branch commit history |
| [sitecore-search-react](./sitecore-search-react/) | Sitecore Search SDK integration patterns for React with facets, URL sync, and SearchUrlManager |

## Adding a New Skill

1. Copy `_template/` to a new folder
2. Rename and edit `SKILL.md` with your instructions
3. Add supporting files as needed (scripts, templates, examples)

## Skill Structure

```
skill-name/
├── SKILL.md          # Required - main instruction file
├── scripts/          # Optional - helper scripts
├── templates/        # Optional - code templates
├── examples/         # Optional - reference implementations
└── *.md              # Optional - additional documentation
```

## SKILL.md Format

```yaml
---
name: skill-name
description: Short description of the skill
---

[Detailed instructions in markdown]
```

## Contributing

1. Fork the repo
2. Create a skill folder following the structure above
3. Submit a PR with your skill
