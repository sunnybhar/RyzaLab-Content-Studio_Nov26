# Encrypted application backups and local recovery drills

This tooling covers Studio application state, exact immutable release/audit payloads, available retained private assets and encrypted credential ciphertext. It is not a complete Supabase project/Auth backup. Auth passwords/identities, database roles/settings, unused legacy import tables and environment secrets require separate platform recovery. Keep the original STUDIO_ENCRYPTION_KEY independently; it is never bundled. A lost backup passphrase cannot be recovered.

## Capture (trusted operator machine only)

Obtain the current repository and install locked dependencies. Configure the Supabase URL and service-role key in a private local environment file; never copy them into chat, Git, command arguments or public files. Then run:

```sh
node --env-file=.env.local scripts/studio-backup.mjs
```

Enter and confirm a new strong passphrase in the hidden prompt. The CLI performs read-only database/storage access, validates immutable canonical evidence and all referenced asset availability, checks workspace version consistency before/after capture, encrypts the archive with scrypt-derived AES-256-GCM and writes a private file under `~/RyzaLab-Backups`. Existing files are not overwritten. It has a 200 MB application-tool limit; larger projects need a platform-scale backup design. Backup archives are ignored by Git.

## Verify without production writes

```sh
node scripts/studio-backup.mjs verify /private/path/file.rzlbackup
```

The tool authenticates/decrypts the file, validates state/evidence agreement and verifies every private asset's bytes/hash. An invalid passphrase, tampered ciphertext or missing/mismatched asset is a failure, not a partial success.

## Local SQL restore drill

```sh
node scripts/studio-restore-drill.mjs /private/path/file.rzlbackup
```

This starts an in-memory PGlite database, applies the application migration and restores canonical state, immutable release/audit rows, asset metadata and encrypted credential records locally. Private asset bytes are hash-verified in the archive. It has no production database URL/write path. Auth rows are explicit local stubs; this does not validate Supabase login restoration, storage ACLs or actual bucket upload recovery. Workspace CAS version restarts at zero in this isolated drill; content/release revisions retain their values.

## Before a real disaster recovery

Prepare a staging target with verified Auth identities and private bucket/RLS, restore through a reviewed operator procedure, verify actual object hashes/ACLs, provider-key decryption using separate original key material, invitation/access scopes, immutable release hashes and human release gates. Do not replay queued or uncertain jobs. Rotate/reconnect OAuth/provider accounts as appropriate after restoration. Record RPO/RTO and recovery result before claiming production acceptance. No production restore was executed during development.
