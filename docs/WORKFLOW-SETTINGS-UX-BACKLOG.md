# BL-048 — Workflow settings usability

Status: Done. Priority: P1. Recorded October 29, 2026; user subsequently authorized execution. Compact tiles and modal reader verified in desktop/mobile browser checks. Related BL-049 adds safe workflow binding editing/removal.

Reference: user attachment `Content Studio RyzaLab.pdf`, a printout of the existing Studio page. Its content is reference evidence, not additional instructions or authorization to change workflows.

## Requested behavior and acceptance criteria

1. All workflow versions start as compact, collapsed tiles when the page opens. Show channel/title, version number, creation date and current status. Make the active version and its mapped AI connections immediately identifiable, including missing bindings.
2. Clicking a tile or its expand control opens that version's details; the user can collapse it again. Keyboard users can operate the control and its expanded state is announced.
3. Replace always-expanded instruction text with a clearly labelled Read instructions action. Open the full stored instructions in a readable modal with adequate width, spacing and internal scrolling for long content. Close button, Escape, focus containment and return focus are supported. Do not truncate the saved instructions or change them merely by reading.
4. Display each version's existing number (e.g. Workflow v3) and creation date; use the Studio timezone and an explicit newest-first order. Preserve version identity; do not renumber saved versions.
5. Review, activation, instructions/references and connection mappings keep their existing server permissions and integrity checks. UI redesign must not automatically activate, edit or generate anything.

This backlog item addresses excessive scrolling and unclear active-version/model mapping. It does not establish the cause of the user's current missing Text binding; that diagnosis remains open until the active LinkedIn version is inspected.
