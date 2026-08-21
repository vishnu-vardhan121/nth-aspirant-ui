# Course live classes (Zoom / Meet join)

**Date:** 2026-08-04  
**Status:** Implemented (classic UI)

## Locked defaults
- Tool-neutral copy: **Join live class**
- Two links: show *If this meeting is full, use the other link.*
- Times: **IST** (`Asia/Kolkata`)
- Staff: **admin + interviewer** manage **all** courses’ classes (`is_admin()`)

## Data
`course_classes`: title, starts_at, meet_url_1, meet_url_2 (optional)

## Surfaces
- Aspirant enrolled course card → today + upcoming list  
- Admin course detail → Live classes tab  
- Interviewer → Live classes nav page  
