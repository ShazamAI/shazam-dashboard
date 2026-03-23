---
id: task_143
title: "Project Onboarding — Create Memory Banks"
status: in_progress
assigned_to: pm
created_by: system
company: Shazam Dashboard
created_at: 2026-03-21T12:41:57.887910Z
updated_at: 2026-03-21T12:42:02.887042Z
---

## Description

## Project Onboarding — Create Skill Memory

Analyze the project and create skill files following this structure:

### Required files:

1. `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/project/overview.md` — Project overview, tech stack, goals
2. `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/project/architecture.md` — Architecture patterns, folder structure, key modules
3. `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/project/conventions.md` — Naming conventions, code style, patterns used

4. For EACH agent, create `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/agents/{agent_name}.md`:
- **pm** (Project Manager): domain: general, modules: none
- **senior_1** (Senior Developer): domain: general, modules: none
- **senior_2** (Senior Developer): domain: general, modules: none

5. Create domain rules as needed:
   - `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/rules/testing.md` — How to test in this project
   - `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/rules/git-workflow.md` — Branch/commit conventions
   - Any other rules relevant to the project

### File format (every file must use this):
```markdown
---
name: skill-name
description: One-line description of what this skill teaches
tags: relevant, tags, here
---

Content here. Use markdown. Reference other skills with relative paths:
- For testing details, load [./rules/testing.md](./rules/testing.md)
- For architecture, see [./project/architecture.md](./project/architecture.md)
```

### Update SKILL.md index:
After creating all files, update `/Users/raphaelbarbosa/Projects/ShazamAI/shazam-dashboard/.shazam/memories/SKILL.md` to list all skills with descriptions.

### Important:
- Keep each file focused on ONE topic
- Use cross-references instead of duplicating knowledge
- Tags are used to match skills to agents — choose them carefully
- Agent files should contain role-specific context, not general project knowledge
