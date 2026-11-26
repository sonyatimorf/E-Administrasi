# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/users/{userId}` and its subcollections belongs exclusively to `{userId}` (`request.auth.uid == userId` and `data.teacherId == request.auth.uid`).
2. **Verified Identity**: Write operations require an authenticated and email-verified user (`request.auth != null && request.auth.token.email_verified == true`).
3. **Master Gate Parent Existence**: Subcollection document writes (`students`, `schedules`, `academicEvents`, `teachingDocs`, `attendance`, `journals`, `assessments`, `guidanceNotes`, `dailyTasks`) verify that `/users/{userId}` exists (`exists(...)`) and matches `request.auth.uid`.
4. **Immutable Ownership & Creation Time**: `teacherId` and `createdAt` can never be altered on update (`incoming().teacherId == existing().teacherId && incoming().createdAt == existing().createdAt`).
5. **Temporal Integrity**: `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
6. **Strict Schema Keys & Volumetric Caps**: Every `create` checks `keys().hasAll(...)` and `keys().hasOnly(...)`; every `update` checks `diff(existing()).affectedKeys().hasOnly(...)`; every string checks `.size()`; every map (`records`, `scores`) checks `.size() <= 100`.
7. **PII Isolation**: `UserProfile` contains `email` and `Student` contains `guardianPhone`; both `get` and `list` are strictly locked to `isOwner(userId)` (`resource.data.teacherId == request.auth.uid`), with zero blanket `isSignedIn()` reads.

## 2. The "Dirty Dozen" Malicious Payloads (Must All Return PERMISSION_DENIED)
1. **Cross-Tenant Read**: User B attempts `get` on `/users/userA/students/s1`.
2. **Cross-Tenant List**: User B attempts `list` on `/users/userA/assessments`.
3. **Unverified Email Write**: User with `email_verified: false` attempts `create` on `/users/userB/dailyTasks/t1`.
4. **Owner Spoofing**: User A sets `teacherId: "userB"` while creating `/users/userA/students/s1`.
5. **Shadow Ghost Field Injection**: User A includes `"isAdmin": true` or `"extraField": "hack"` when creating a `Student`.
6. **ID Poisoning**: User A tries to write `/users/userA/schedules/invalid..id$$` or a 200-character ID.
7. **String Resource Exhaustion**: User A submits a `Student.name` of 5,000 characters (> 120 maxLength).
8. **Fake Client Timestamp**: User A submits `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Immutable Field Mutation**: User A attempts to change `teacherId` or `createdAt` on an existing `Assessment`.
10. **Invalid Enum Injection**: User A creates `AcademicEvent` with `category: "hacking_event"`.
11. **Oversized Map Poisoning**: User A submits `AttendanceSession.records` with > 100 entries.
12. **Unprotected Root Path Write**: Any user attempts to write to `/randomCollection/doc1` (blocked by default-deny catch-all).
