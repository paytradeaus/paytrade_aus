---
name: Audit-pack ZIP Windows compatibility
description: Why audit-pack zips must avoid data descriptors and long paths to open in the Windows built-in extractor.
---

# Audit-pack ZIP must be Windows-Explorer-native

The audit-pack download (`generateZipFileToBuffer`) must produce a zip the
Windows built-in extractor can open with no third-party tool.

**Two independent failure modes, both verified against a real prod pack:**

1. **Data descriptors → false "Password protected" + error 0x80004005.**
   The `archiver` library streams entries with general-purpose **bit 3** (data
   descriptor) set and zero CRC/sizes in the local header. Windows Explorer
   mis-reads that as encrypted and refuses extraction with 0x80004005 — even on
   tiny, short-path files like a README. macOS/Linux/7-Zip read it fine, so the
   archive is technically valid; this is a Windows-Explorer-only quirk.
   **Fix:** write the zip with CRC-32 + real sizes in each local header and GP
   flag `0x0800` (UTF-8, NO bit 3). A hand-rolled writer
   (`buildWindowsFriendlyZip`) does this; an in-memory `ZipEntryCollector`
   mimics archiver's `.append(data,{name})` so helper methods are unchanged.

2. **Windows 260-char MAX_PATH → "destination file could not be created".**
   The outer pack file name becomes the extraction folder (~130 chars), and
   bank-statement attachment names redundantly re-embed the full ~53-char
   account name. Combined with the deepest module folder
   ("Supplier-Subcontractor Payment Claims/Attachments/") this blew past 260.
   **Fix:** cap bank/project names in the outer pack name (`getFileName`) and
   strip redundant bank/project prefixes + hard-cap basenames inside the zip
   (`shortenZipEntryName`). Directory segments are enum-based and bounded, so
   only file names and the outer name needed capping.

**Why:** construction clients extract these on Windows with the built-in tool;
"valid on Mac" is not enough.

**How to apply:** never reintroduce `archiver` streamed output on a
user-downloaded pack path (the legacy unused `generateZipFile` still uses it —
route it through `buildWindowsFriendlyZip` if ever revived). Keep the writer
non-ZIP64 (throws >4GB) since packs are a few MB. Verify any change with:
`zipfile.testzip()=None`, GP bit0=0, GP bit3=0, and worst-case extracted path
< 260.
