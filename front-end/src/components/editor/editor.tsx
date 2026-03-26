"use client";
import React, { useRef, useState } from "react";
import {
  BtnBold,
  BtnBulletList,
  BtnItalic,
  BtnLink,
  BtnNumberedList,
  BtnRedo,
  BtnStrikeThrough,
  BtnUndo,
  createButton,
  createDropdown,
  Editor,
  EditorProvider,
  HtmlButton,
  Separator,
  Toolbar,
} from "react-simple-wysiwyg";
import { singleUploadApi } from "@/network/apolloClient";
import { showErrorToast } from "@/components/Toaster";

function ImageUploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showErrorToast("Please select a valid image file (PNG, JPG, GIF, or WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        showErrorToast("Please log in to upload images");
        return;
      }

      const userData = {
        attachment_type: "Content_image",
        uploaded_by: "admin",
      };

      const result = await singleUploadApi(file, userData, accessToken);

      if (result && result.file_path) {
        const imgUrl = result.file_path.startsWith("/")
          ? result.file_path
          : `/${result.file_path}`;
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${imgUrl}" alt="${file.name}" style="max-width: 100%; height: auto; margin: 10px 0;" />`
        );
      } else {
        showErrorToast("Failed to upload image");
      }
    } catch (err) {
      console.error("Image upload error:", err);
      showErrorToast("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <button
        type="button"
        title="Insert image"
        className="rsw-btn"
        onClick={handleClick}
        disabled={uploading}
        style={{ 
          opacity: uploading ? 0.5 : 1,
          cursor: uploading ? "wait" : "pointer",
          fontSize: "14px",
        }}
      >
        {uploading ? "..." : "\u{1F5BC}"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />
    </>
  );
}

export default function CustomEditor(props: any) {
  const { onChange, value, disabled = false } = props;

  function handleOnChange(e: any) {
    onChange && onChange(e.target.value);
  }
  const BtnAlignCenter = createButton("Align center", "\u2261", "justifyCenter");
  const BtnUnderline = createButton("Underline", "U", "underline");
  const BtnStrikethrough = createButton("Strikethrough", "S", "strikethrough");
  const BtnAlignRight = createButton("Align Right", "\u2192", "justifyRight");
  const BtnAlignLeft = createButton("Align Left", "\u2190", "justifyLeft");
  const BtnStyles = createDropdown("Styles", [
    ["Normal", "formatBlock", "DIV"],
    ["\uD835\uDDDB\uD835\uDDF2\uD835\uDDEE\uD835\uDDF1\uD835\uDDF2\uD835\uDDFF \uD835\uDFED", "formatBlock", "H1"],
    ["Header 2", "formatBlock", "H2"],
    ["Header 3", "formatBlock", "H3"],
    ["Header 4", "formatBlock", "H4"],
    ["Header 5", "formatBlock", "H5"],
    ["Header 6", "formatBlock", "H6"],
    ["\uD835\uDE72\uD835\uDE98\uD835\uDE89\uD835\uDE8E", "formatBlock", "PRE"],
  ]);

  return (
    <EditorProvider>
      <Editor
        disabled={disabled}
        value={value}
        onChange={handleOnChange}
        className="edit-bar"
      >
        <Toolbar>
          <BtnRedo />
          <BtnUndo />
          <Separator />
          <BtnBold />
          <BtnItalic />
          <BtnStrikeThrough />
          <BtnUnderline />
          <Separator />
          <BtnNumberedList />
          <BtnBulletList />
          <Separator />
          <BtnLink />
          <BtnStyles />
          <Separator />
          <ImageUploadButton />
          <Separator />
          <HtmlButton />
        </Toolbar>
      </Editor>
    </EditorProvider>
  );
}
