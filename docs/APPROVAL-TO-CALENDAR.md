# Approval to calendar handoff

After final approval in the two-step review, Studio offers the publication planner to an actor who also has calendar-management permission. The planner uses the approved package returned by the successful save, rather than looking in stale pre-approval screen state.

The package, platform and account are already selected. Date/time remain blank and required; Studio does not invent a publication time. The selected workspace timezone is shown and converted to an absolute timestamp on submission. Only the exact newly approved package is offered in this immediate planner. Existing calendar controls remain available for intentional later planning/replacement.

Canceling the planner keeps the approval saved and the package ready for later planning. An approver without calendar authority gets an approval notice for a calendar manager; approval does not grant scheduling rights. Repeated submissions for the same package, content, instant and group reuse the task, including equivalent timezone-offset representations. Actual publication still requires a person and a separately confirmed public URL.

The shared persistence boundary advances the workspace version once per atomic commit, even when approval/selection and automatic preparation perform multiple internal domain transitions. This preserves the deployed database's CAS requirement and audit history without a migration. Local PostgreSQL tests verify a composed selection/writing operation, retained reservation and rejection of a stale duplicate commit.
