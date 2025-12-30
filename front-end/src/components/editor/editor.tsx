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

export default function CustomEditor(props: any) {
  const { onChange, value, disabled = false } = props;
  // const [value, setValue] = useState(typedValue || "");

  function handleOnChange(e: any) {
    onChange && onChange(e.target.value);
    // setValue(e.target.value);
  }
  const BtnAlignCenter = createButton("Align center", "≡", "justifyCenter");
  const BtnUnderline = createButton("Underline", "U", "underline");
  const BtnStrikethrough = createButton("Strikethrough", "S", "strikethrough");
  const BtnAlignRight = createButton("Align Right", "→", "justifyRight");
  const BtnAlignLeft = createButton("Align Left", "←", "justifyLeft");
  const BtnStyles = createDropdown("Styles", [
    ["Normal", "formatBlock", "DIV"],
    ["𝗛𝗲𝗮𝗱𝗲𝗿 𝟭", "formatBlock", "H1"],
    ["Header 2", "formatBlock", "H2"],
    ["Header 3", "formatBlock", "H3"],
    ["Header 4", "formatBlock", "H4"],
    ["Header 5", "formatBlock", "H5"],
    ["Header 6", "formatBlock", "H6"],
    ["𝙲𝚘𝚍𝚎", "formatBlock", "PRE"],
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
          <HtmlButton />
        </Toolbar>
      </Editor>
    </EditorProvider>
  );
}
