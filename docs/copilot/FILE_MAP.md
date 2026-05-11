# AI Copilot — File Map

Index of every file created or modified during the copilot build.

---

## New files

### src/lib/

| Path                                | Purpose                         |
| ----------------------------------- | ------------------------------- |
| `src/lib/leads/createLeadRecord.ts` | Pure DB logic for lead creation |

### src/actions/

| Path                             | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `src/actions/lead/createLead.ts` | Session-auth wrapper for createLeadRecord |

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

## Module dependency graph (Phase 0a)

Lead creation paths:

In-platform (thunderbolt form):

```
createLeadFromForm.ts → createLead.ts → createLeadRecord.ts → DB
```

External webhook:

```
/api/lead-generate route → createLeadRecord.ts → DB
```
