# Security Specification for Income & Expense Tracker

## 1. Data Invariants
*   **Ownership Integrity**: A transaction document belongs strictly to the user who created it (`ownerId == request.auth.uid`). No user can read, list, update, or delete another user's transaction.
*   **Schema Consistency**:
    *   `type` must be exactly `"income"` or `"expense"`.
    *   `amount` must be a positive number greater than `0`.
    *   `category` must be a valid string with bounded length (e.g., maximum 50 characters) to prevent database pollution.
    *   `date` must be a non-empty string in `YYYY-MM-DD` format (10 characters).
    *   `description` is an optional string of maximum 200 characters.
*   **Temporal Integrity**:
    *   `createdAt` must exactly match the server timestamp `request.time` during creation.
    *   `updatedAt` must exactly match the server timestamp `request.time` during updates.
*   **Immutable Ownership**:
    *   The `ownerId` and `createdAt` cannot be altered during any update operation.

## 2. The "Dirty Dozen" Malicious Payloads

The following attack vectors represent attempts to bypass validations and must be blocked:
1.  **Identity Spoofing**: Attempting to write a transaction where `ownerId` is set to another user's UID.
2.  **Unauthenticated Write**: Writing a transaction without being logged in.
3.  **Cross-User Read**: Attempting to fetch/get a transaction belonging to another user.
4.  **Collection Scan / Scraping**: Querying the entire `transactions` collection without filtering by `ownerId`.
5.  **Negative/Zero Amount**: Creating a transaction with a negative amount (e.g., `amount: -100` or `amount: 0`).
6.  **Invalid Type**: Setting `type` to a value like `"loan"` or `"gift"` instead of `"income"` or `"expense"`.
7.  **Over-sized Description**: Sending a 5MB string inside the `description` field to cause resource exhaustion (Denial of Wallet).
8.  **Malformed Date**: Creating a transaction with `date: "not-a-date"`.
9.  **Date/Time Spoofing**: Supplying a pre-dated `createdAt` timestamp from the client instead of the true `request.time`.
10. **Ownership Hijacking**: Updating an existing transaction to change its `ownerId`.
11. **Creation Timing Hijacking**: Modifying the custom immutable `createdAt` timestamp during an update.
12. **Malicious ID injection**: Writing a document with a junk ID of 2000 characters to break the Firestore path system.

## 3. Firestore Rules Mapping

Let's use a standard Zero-Trust rule structure verifying authentication state, schema fields, value constraints, and immutable parameters.
All validations are packaged into an `isValidTransaction` helper function.
`allow list` checks `resource.data.ownerId == request.auth.uid` to enforce query containment.
`allow update` checks `incoming().diff(existing()).affectedKeys().hasOnly([...])` to restrict changeable fields.
