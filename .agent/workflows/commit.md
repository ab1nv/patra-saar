---
description: Generate semantic conventional commit messages from staged changes and commit
---

# /commit — Semantic Conventional Commit Agent

## Purpose

Analyzes staged git changes and generates a well-structured conventional commit message, then commits the code.

## Steps

### 1. Check for staged changes

// turbo

```bash
git diff --cached --stat
```

If no staged changes exist, inform the user and stop. Suggest running `git add` first.

### 2. Get the full diff of staged changes

// turbo

```bash
git diff --cached
```

### 3. Analyze the diff and generate a commit message

Based on the staged changes, generate a conventional commit message following this format:

```
<type>(<scope>): <short description>

<body — what changed and why, in bullet points>

<footer — breaking changes, issue refs if applicable>
```

**Commit types**:
| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. (no code change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `build` | Changes to build system or dependencies |
| `ci` | Changes to CI configuration |
| `chore` | Other changes that don't modify src or test files |
| `revert` | Reverts a previous commit |

**Scope**: The module, component, or area affected (e.g., `auth`, `leave`, `api`, `frontend`, `docker`). Use lowercase. Omit if changes span many areas.

**Rules**:

- Short description: imperative mood, lowercase, no period, max 72 chars
- Body: explain _what_ and _why_, not _how_. Use bullet points.
- If there are breaking changes, add `BREAKING CHANGE:` in the footer
- Reference issues when applicable: `Closes #123`
- If changes span multiple logical units, suggest splitting into multiple commits

### 4. Present the commit message to the user for review

Show the generated commit message and ask for confirmation. The user may:

- **Approve** → proceed to commit
- **Edit** → modify the message
- **Reject** → abort

### 5. Commit with the approved message

```bash
git commit -m "<type>(<scope>): <short description>" -m "<body>" -m "<footer>"
```

### 6. Show the result

// turbo

```bash
git log -1 --pretty=format:"%h %s%n%n%b"
```

## Examples

**Single feature**:

```
feat(leave): add sandwich rule configuration for leave policies

- Add SandwichRuleConfig model with day-gap and leave-type settings
- Implement sandwich day calculation in leave balance service
- Add admin UI for configuring sandwich rules per leave type

Closes #45
```

**Bug fix**:

```
fix(auth): prevent token refresh race condition on concurrent requests

- Add mutex lock around refresh token rotation
- Return cached new token if refresh is already in-flight
- Add regression test for concurrent refresh scenario
```

**Multi-scope refactor**:

```
refactor(api,services): extract common pagination logic into shared utility

- Create PaginationParams dependency with cursor + limit
- Create paginate() helper that works with any SQLAlchemy query
- Update all list endpoints to use shared pagination
- Remove duplicate pagination code from 12 service methods
```
