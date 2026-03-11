# Mock interview system – simple guide

## In one picture

```
STUDENT                              ADMIN
   |                                    |
   |  1) Book a slot (pick time)         |
   |     OR                             |
   |     Request a slot (no time) -------|----> 2) Admin assigns date/time
   |                                    |      Student gets notification
   |  <-------- notification -----------|
   |                                    |
   |  3) Need to change time?            |
   |     Click "Request reschedule" -----|----> 4) Admin sees in "Reschedule requests"
   |     (give reason)                  |      • Approve = set NEW time, student notified
   |                                    |      • Reject = send message to student
   |  <-------- new time or message ----|
   |                                    |
   |  5) Join at scheduled time (Meet link)
   |  6) After mock: scores/feedback show here
```

---

## For the student

**How do I get a mock?**
- **Book a slot** — Pick a date and time from the list. You get the Meet link immediately.
- **Or request a slot** — Click “Request mock (no slot)”, add notes if you want. Admin will assign a time. You get a notification (here and in Messages) when it’s scheduled.

**I’m scheduled but need a different time. What do I do?**
- In **My mock registrations**, find that mock and click **Request reschedule**. Enter a reason and submit.
- Admin will either:
  - **Approve** — They set a new date/time. You get a notification with the new time and Meet link.
  - **Reject** — They send you a message (in Messages and here). You stay at the original time (or contact them outside the app).

**So: Request reschedule → Admin approves (I get new time) or rejects (I get a message).**

---

## For the admin

**What do I do on this page?**
1. **Create slots** — So students can book a date/time.
2. **Your slots** — See all slots (available / booked / cancelled). Reschedule or cancel if needed; student is notified.
3. **Reschedule requests** — When a student clicks “Request reschedule”, they appear here.  
   - **Approve** — You set the new date/time (and Meet link). Student is notified.  
   - **Reject** — You write a message to the student. They see it in Messages. Time stays as before.
4. **Students waiting for a slot** — They requested without picking a time. You **Set schedule** (date, time, Meet link); they get a notification.
5. **All mock registrations** — Full list. Set schedule for “Requested”, mark “Completed” or “No-show” for scheduled mocks.

**Reschedule in short:**  
Student requests reschedule → You see it under **Reschedule requests** → Approve = you choose the new time and they’re notified; Reject = you send a message. No reschedule = they join at the existing time.

---

## Status meanings

| Status       | Meaning |
|-------------|---------|
| **Requested** | Student asked for a mock without picking a time. You need to **Set schedule**. |
| **Scheduled** | Time (and Meet link) is set. Student was notified. |
| **Completed** | Mock done; student sees scores/feedback. |
| **No-show**   | Student didn’t join. You can free the slot. |
| **Cancelled** | Slot or request was cancelled. |

---

## Summary

- **Student gets a mock:** Either books a slot or requests; if requested, admin sets time and student is notified.
- **Student wants to change time:** Clicks “Request reschedule” with a reason. Admin **approves** (sets new time, student notified) or **rejects** (sends message). If approved, the student gets the new time.
