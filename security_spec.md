# Security Specification for Qafila: Silk & Sand

## 1. Data Invariants
- Users can only access their own profile and assets.
- Balances and investment amounts must be non-negative.
- Timestamps must be handled by the server (request.time).
- Owners of investments and properties cannot be changed once established.

## 2. The Dirty Dozen Payloads
1. **Identity Theft**: Update another user's balance.
2. **Infinite Gold**: Set a negative amount or extremely high balance.
3. **Ghost Property**: Purchase a property for another user.
4. **Status Spoofing**: Complete an investment immediately after starting it (requires state transition logic).
5. **ID Poisoning**: Use a 1MB string as a document ID.
6. **Shadow Fields**: Add a `isVerified: true` field to a user profile.
7. **Time Travel**: Manually set `createdAt` to the past.
8. **Orphaned Investment**: Create an investment for a non-existent route or user.
9. **Blanket Query**: Authenticated user trying to `list` all users.
10. **Immutable Hijack**: Try to change the `ownerId` of an existing property.
11. **Type Poisoning**: Send a boolean where a string (status) is expected.
12. **Recursive Cost Attack**: Making deep nested collections (not applicable here as we use flat structures).

## 3. Test Runner (Draft)
A `firestore.rules.test.ts` would verify these scenarios by asserting `PERMISSION_DENIED`.
