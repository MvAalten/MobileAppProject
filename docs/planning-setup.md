# Planning Setup for the Fitness App

Nov 20, 2026 · @Simon

Use **GitHub Issues with Milestones and one GitHub Project board**, and let Claude do the planning. You only pick the next card and write code; Claude creates, splits, updates and closes the tasks.

## Why GitHub

- **Your code already lives there.** Releases, APKs and IzzyOnDroid all pull from GitHub, so planning sits next to the code instead of in a separate app.
- **Claude works there directly.** In Claude Code, Claude can create issues, write the code for one, and close it automatically with a commit or pull request (`Fixes #12`).
- **It's where users talk to you.** Bug reports, feature requests and contributors arrive as issues, which is also how you see interest without tracking anyone.
- **Free, open and portable.** Public for an open-source project, no extra account, and visible to future employers.

## Options compared

| Tool | How well Claude can run it | Fits this project | Verdict |
| --- | --- | --- | --- |
| GitHub Issues + Milestones + Project board | Very well: creates, labels, links to code, closes via commits | Code, releases and users in one place | **Use this** |
| Trello | Well: connected in this chat, can create boards, cards and checklists | Separate from the code; tasks get duplicated | Only for non-code to-dos |
| Claude Docs (this doc) | Very well, but it's a document, not a task tracker | Good for the plan and decisions | Keep for the plan |
| Notion, Linear, Jira | Not connected here | More setup than a solo project needs | Skip |

## How it's set up

- **One repo** for the app (public, Apache-2.0 or MIT)
- **Milestones** = roadmap phases: 1 Core, 2 Lifting, 3 First release, 4 Food, 5 Scanners, 6 Running, 7 Stores & polish, 8 iOS
- **Issues** = tasks small enough for one or two sessions (2–5 hours each), with a short checklist
- **Labels:** `core`, `lifting`, `food`, `running`, `privacy`, `bug`, `idea`, `good first issue`
- **Project board** with four columns: Backlog → Next up → In progress → Done
- The plan doc stays the "why"; GitHub holds the "what's next"

## Who does what

| You | Claude |
| --- | --- |
| Say what you finished or what got in the way | Turns the roadmap into milestones and issues |
| Pick the top card in "Next up" | Keeps "Next up" filled with the 3–5 most sensible tasks |
| Write the code (with Claude's help) | Splits issues that turn out too big |
| Test on your phone and on runs | Updates estimates and moves cards |
| Decide yes/no on bigger choices | Writes release notes and changelogs from closed issues |

## The weekly loop

1. Start a session with: "What's next?" Claude reads the board and suggests one task.
2. Build it together; the commit or pull request closes the issue.
3. End with: "Done for today" plus anything that went wrong. Claude updates the board.
4. Once a week (5 minutes): Claude summarises progress against the milestone and reshuffles "Next up".

Optional: a scheduled weekly check-in where Claude reviews the repo and sends you a short status, so you never have to open the board yourself.

## Getting started

1. Create the GitHub repo for the app (or tell Claude its name).
2. Give Claude access to it in a Claude Code session.
3. Claude creates the labels, the 8 milestones, the project board and the issues for phases 1–3.
4. Start with the first issue: set up the React Native project with encrypted SQLite.

Issues for later phases are only created when that phase gets close, so the board never looks overwhelming.
