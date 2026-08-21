# Course invite celebrations

**Date:** 2026-08-04  
**Status:** Approved — implementing (Approach A)

## Behavior

1. **Invite welcome** — When aspirant opens Free Coding Classes and `is_invited` for an active course (not yet `free`), show once (session) a celebration-style modal: “You’re invited” + CTA to join.
2. **Join success** — After `joinCourseFree` succeeds for an invited join, show once (session) confetti modal: “You’re in!”

## UI

Reuse plan-celebration look (indigo gradient, sparkles, confetti on join success). Content-first, NTH logo on header.

## Scope

- Aspirant courses page only  
- No DB change  
- SessionStorage keys per user + course + event type  
