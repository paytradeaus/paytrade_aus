"use client";

import { useEffect, useRef, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/components/Toaster";
import {
  listMarketingImages,
  uploadMarketingImage,
  MarketingImageItem,
} from "./marketingImages.function";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const MAX_SIZE = 5 * 1024 * 1024;

export default function AdminMarketingImages() {
  const [images, setImages] = useState<MarketingImageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    setLoading(true);
    const data = await listMarketingImages();
    setImages(data);
    setLoading(false);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        showErrorToast(
          `"${file.name}" is not a supported image (JPG, PNG, GIF, WEBP, SVG).`
        );
        return;
      }
      if (file.size > MAX_SIZE) {
        showErrorToast(`"${file.name}" is larger than 5MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    for (const file of validFiles) {
      const result = await uploadMarketingImage(file);
      if (result?.status === "SUCCESS") {
        successCount += 1;
      } else {
        showErrorToast(result?.message || `Could not upload "${file.name}".`);
      }
    }
    setUploading(false);

    if (successCount > 0) {
      showSuccessToast(
        successCount === 1
          ? "Image uploaded successfully."
          : `${successCount} images uploaded successfully.`
      );
      await fetchImages();
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      showSuccessToast("URL copied to clipboard.");
      setTimeout(() => setCopiedUrl(""), 2000);
    } catch {
      showErrorToast("Could not copy URL. Please copy it manually.");
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Marketing Images</h1>
        <p style={styles.subtitle}>
          Upload images for marketing emails and copy their public URL.
        </p>
      </div>

      <div
        style={styles.dropzone}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <i className="fa-light fa-cloud-arrow-up" style={styles.dropIcon}></i>
        <p style={styles.dropText}>
          {uploading
            ? "Uploading..."
            : "Click to choose images or drag & drop here"}
        </p>
        <p style={styles.dropHint}>JPG, PNG, GIF, WEBP or SVG · up to 5MB each</p>
      </div>

      <div style={styles.gallerySection}>
        <h2 style={styles.sectionTitle}>
          Uploaded images{!loading ? ` (${images.length})` : ""}
        </h2>

        {loading ? (
          <p style={styles.muted}>Loading...</p>
        ) : images.length === 0 ? (
          <p style={styles.muted}>No images uploaded yet.</p>
        ) : (
          <div style={styles.grid}>
            {images.map((image) => (
              <div key={image.url} style={styles.card}>
                <div style={styles.thumbWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.name} style={styles.thumb} />
                </div>
                <div style={styles.cardBody}>
                  <p style={styles.fileName} title={image.name}>
                    {image.name}
                  </p>
                  <div style={styles.urlRow}>
                    <input
                      readOnly
                      value={image.url}
                      style={styles.urlInput}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      type="button"
                      style={{
                        ...styles.copyBtn,
                        ...(copiedUrl === image.url ? styles.copyBtnDone : {}),
                      }}
                      onClick={() => handleCopy(image.url)}
                    >
                      {copiedUrl === image.url ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    padding: "24px",
    maxWidth: "1100px",
    margin: "0 auto",
    width: "100%",
  },
  header: { marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: 600, margin: 0 },
  subtitle: { color: "#6b7280", marginTop: "6px", fontSize: "14px" },
  dropzone: {
    border: "2px dashed #c7cbd1",
    borderRadius: "12px",
    padding: "40px 20px",
    textAlign: "center",
    cursor: "pointer",
    background: "#fafbfc",
    transition: "border-color 0.15s ease",
  },
  dropIcon: { fontSize: "32px", color: "#9aa1ab" },
  dropText: { margin: "12px 0 4px", fontWeight: 500, fontSize: "15px" },
  dropHint: { margin: 0, color: "#9aa1ab", fontSize: "13px" },
  gallerySection: { marginTop: "32px" },
  sectionTitle: { fontSize: "18px", fontWeight: 600, marginBottom: "16px" },
  muted: { color: "#9aa1ab", fontSize: "14px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "18px",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
  },
  thumbWrap: {
    height: "150px",
    background:
      "repeating-conic-gradient(#f1f3f5 0% 25%, #fff 0% 50%) 50% / 20px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  cardBody: { padding: "12px" },
  fileName: {
    fontSize: "13px",
    fontWeight: 500,
    margin: "0 0 8px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  urlRow: { display: "flex", gap: "6px" },
  urlInput: {
    flex: 1,
    minWidth: 0,
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "6px 8px",
    fontSize: "12px",
    color: "#4b5563",
    background: "#f9fafb",
  },
  copyBtn: {
    border: "none",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    background: "#2563eb",
    color: "#fff",
    whiteSpace: "nowrap",
  },
  copyBtnDone: { background: "#16a34a" },
};
