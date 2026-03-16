# Agent Rules — Zomorod Repo

## Required Task Header
All tasks must begin with:
- `PROJECT:`
- `REPO:`
- `THREAD:`
- `GOAL:`

## Pre‑Flight Check (Before Changes)
Before executing any task the agent must:
1. Confirm the current project.
2. Confirm the repository context.
3. Confirm files belong to this project.
4. Confirm no instructions reference another project.

If any mismatch is detected: **STOP** and report **PROJECT MISMATCH DETECTED**.

## Security Requirements
- Use **environment variables only** for secrets.
- Never commit `.env` files, key files, or credentials.
- Never move server secrets into client code.
- Treat previously committed secrets as compromised.

## Repo Hygiene
- Do not commit generated runtime artifacts (`dist/`, `node_modules/`, logs, tmp, runtime folders).
- Use `tmp/`, `runtime/`, and `logs/` only for transient local artifacts.
- Keep changes minimal and reviewable.

## Project Isolation
- This repo is **Zomorod only**.
- Do not mix logic or instructions from Nivran or QuickAIBuy.
- If a task crosses projects, report **PROJECT MISMATCH DETECTED** and stop.
