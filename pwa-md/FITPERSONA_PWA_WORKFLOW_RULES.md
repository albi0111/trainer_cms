# FitPersona PWA Workflow Rules

## Branching Rules

- `fitpersona_pwa` is the master branch for the FitPersona PWA.
- `staging-fitpersona-pwa` is the staging branch and must be created from `fitpersona_pwa`.
- New task branches must be created from `staging-fitpersona-pwa`.
- After manual testing, completed task changes should be merged or pushed into `staging-fitpersona-pwa`.
- Changes should move from `staging-fitpersona-pwa` to `fitpersona_pwa` only after staging validation is complete.
- Do not create task branches directly from `fitpersona_pwa` unless explicitly requested.

## Deployment Rules

- When the user says to deploy, deploy only the changes from `staging-fitpersona-pwa`.
- Do not deploy directly from `fitpersona_pwa` until a separate master deployment site is added later.
- Deployment command: `npm deploy`.
- Before deploying, confirm the current branch is `staging-fitpersona-pwa`.
- If the current branch is not `staging-fitpersona-pwa`, switch to staging or stop and ask for confirmation.

## Commit Rules

- Commit only intentional changes related to the current task.
- Do not include unrelated local edits in a commit.
- Before committing, check `git status --short`.
- Commit messages must include a detailed description in point-based format.
- The commit description should clearly list:
  - What changed.
  - Why it changed.
  - Any manual testing completed.
  - Any known risks or follow-up work.

## Suggested Commit Format

```text
Short task summary

- Changed: concise list of implementation updates.
- Reason: why this change is needed.
- Tested: commands or manual checks performed.
- Notes: risks, limitations, or follow-up items.
```
