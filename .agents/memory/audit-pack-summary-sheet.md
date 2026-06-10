---
name: Audit-pack Summary.xlsx contents index
description: Why the audit ZIP's root Summary sheet renders blank and how the single-sheet Excel renderer must be fed.
---

The audit pack's root `Summary.xlsx` is built by the single-sheet Excel renderer
(`createExcelBuffer` else-branch → `getCustomHeaders` + `addHeadersToWorksheet` +
`addDataToWorksheet`). Two non-obvious constraints make it silently render an empty file:

1. **Every `module_name` needs a `getCustomHeaders` case.** With no case it returns
   `[]` → no columns → the renderer writes a blank sheet (no error). The Summary is
   generated with `module_name = AuditReportModuleEnum.AuditReport`, so that enum needs
   its own header list.
2. **`addDataToWorksheet` maps FLAT top-level keys per row** (`item[key]`). Feeding it a
   nested shape (e.g. `{module_name, records:[{file_name, description}]}`) maps nothing →
   blank rows even when headers exist. Pass an array of flat objects whose keys equal the
   header `key`s.

**Why:** these two failure modes are silent (no exception, no log), so an empty Summary
looks like "nothing was collected" rather than a rendering mismatch.

**How to apply:** when adding/altering any audit sheet, add the header case AND ensure the
data rows are flat & keyed to those headers. Counts that should reflect the actual ZIP
contents must be derived from successful `archive.append()` calls (what made it into the
zip), not raw DB references.

**Two summary builders, same flaw:** `generateZipFileToBuffer` (in-memory
`ZipEntryCollector`, the LIVE path users download via R2, builds `Summary.xlsx`) and the
legacy `generateZipFile` (archiver, local FS, builds `Master Summary.xlsx`). Both shared
the nested-shape bug. The live path is the one that matters; the legacy one is unused.

**Cosmetic gotcha:** the single-sheet path names the worksheet TAB by `payload.module_name`
(falls back to `sheetName` only when module_name is absent), so the Summary tab is labelled
by the module enum, not "Summary". The filename is still `Summary.xlsx`.
