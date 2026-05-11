# AI Copilot — File Map

Index of every file created or modified during the copilot build.

---

## New files

### src/lib/

| Path                                       | Purpose                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| `src/lib/leads/createLeadRecord.ts`        | Pure DB logic for lead creation (Phase 0a)                  |
| `src/lib/anthropic.ts`                     | Anthropic SDK singleton + pinned model constants (Phase 0b) |
| `src/lib/copilot/audit.ts`                 | PII-redacting audit log writer (Phase 0b)                   |
| `src/lib/copilot/normalizeActionResult.ts` | Server action response normalizer (Phase 0b)                |
| `src/lib/copilot/canUserDo.ts`             | Permission check for all copilot actions (Phase 0b)         |

### src/actions/

| Path                                           | Purpose                                          |
| ---------------------------------------------- | ------------------------------------------------ |
| `src/actions/lead/createLead.ts`               | Session-auth wrapper for createLeadRecord (0a)   |
| `src/actions/estimate/invoice/sendEstimate.ts` | Unified email/SMS send with audit log (Phase 0b) |

### prisma/

| Path                                                             | Purpose            |
| ---------------------------------------------------------------- | ------------------ |
| `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql` | Phase 0a migration |

### docs/copilot/

| Path                | Purpose                              |
| ------------------- | ------------------------------------ |
| `ARCHITECTURE.md`   | System design                        |
| `PRISMA_SCHEMA.md`  | Prisma model designs                 |
| `TOOL_REGISTRY.md`  | Specification for every copilot tool |
| `BUILD_PHASES.md`   | Phased build plan                    |
| `RECON_REPORT.md`   | Initial codebase recon               |
| `CHANGELOG.md`      | Chronological build log              |
| `FILE_MAP.md`       | This file                            |
| `REVIEWER_GUIDE.md` | For dev team's PR review             |
| `MERGE_NOTES.md`    | Deployment notes                     |
| `README.md`         | Entry point                          |

---

## Modified files

| Path                                     | Phase | Change                                     |
| ---------------------------------------- | ----- | ------------------------------------------ |
| `prisma/schema.prisma`                   | 0a    | Added User.hasCopilot + 3 models + 2 enums |
| `src/app/api/lead-generate/route.ts`     | 0a    | Extracted DB logic to helper               |
| `src/actions/lead/createLeadFromForm.ts` | 0a    | Direct createLead call                     |

---

## Module dependency graph

### Phase 0a — Lead creation paths

In-platform (thunderbolt form):

```
createLeadFromForm.ts → createLead.ts → createLeadRecord.ts → DB
```

External webhook:

```
/api/lead-generate route → createLeadRecord.ts → DB
```

### Phase 0b — Helper dependency graph

```
sendEstimate.ts → sendInvoiceEmail.ts / sendInvoiceSms.ts
              → normalizeActionResult.ts
              → audit.ts → db
              → getEssentials() → getServerSession

canUserDo.ts → getPermissions.ts → db

anthropic.ts  (leaf — no local dependencies, reads ANTHROPIC_API_KEY at runtime)
```
