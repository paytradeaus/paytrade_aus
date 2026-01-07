import React, { useEffect, useRef, useImperativeHandle } from "react";

declare global {
  interface Window {
    ysEditor?: any;
  }
}

interface YsEditorProps {
  id?: string;
  ref?: React.Ref<any>;
  style?: React.CSSProperties;
  onChange?: (data: any) => void;
  value?: string;
}

const YsEditor = React.forwardRef<any, YsEditorProps>((props, ref) => {
  const { id = "yseditor", style, onChange, value } = props;
  const editorRef = useRef<any>(null);
  const scriptLoaded = useRef(false);
  const editorInitialized = useRef(false);

  const sanitizedId = id.replace(/^[^a-z]+|[^\w-]/gi, "");

  useImperativeHandle(ref, () => ({
    getHTML: () => editorRef.current?.getHTML(),
    setHTML: (html: string) => editorRef.current?.setHTML(html),
    getText: () => editorRef.current?.getText(),
  }));

  useEffect(() => {
    if (typeof window !== "undefined" && !scriptLoaded.current) {
      const script = document.createElement("script");
      script.src = "/js/yseditor.js";
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
        if (!editorInitialized.current) {
          editorRef.current = new window.ysEditor({
            wrapper: `#${sanitizedId}`,
            toolbar: [
              "undo",
              "redo",
              "bold",
              "italic",
              "underline",
              "strikethrough",
              "h1",
              "h2",
              "h3",
              "p",
              "quote",
              "left",
              "center",
              "right",
              "justify",
              "ol",
              "ul",
              "sub",
              "sup",
              "removeformat",
            ],
            bottom: false,
            height: 200,
            scroll: false,
            includeContent: true,
            footer: false,
          });
          editorInitialized.current = true;

          const editorElement = document.getElementById(sanitizedId);
          if (editorElement) {
            editorElement.addEventListener("paste", (event) => {
              event.preventDefault();
              const text = event.clipboardData?.getData("text/plain") || "";
              document.execCommand("insertText", false, text);
            });
          }
        }
      };

      document.body.appendChild(script);

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
        }
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [sanitizedId]);

  return <div style={style || {}} id={sanitizedId}></div>;
});

YsEditor.displayName = "YsEditor";

export default YsEditor;
