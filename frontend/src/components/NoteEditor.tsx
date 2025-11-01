import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface NoteEditorProps {
  content: any;
  onChange?: (content: any) => void;
  editable?: boolean;
  placeholder?: string;
}

export function NoteEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Start writing...',
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-primary prose-a:text-primary',
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getJSON();
      // Only update if content actually changed to avoid cursor jumps
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return (
      <div className="border border-border rounded-lg p-4 min-h-[200px] bg-card/50 animate-pulse text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className={`
        border rounded-lg bg-card
        ${editable ? 'border-border hover:border-ring' : 'border-border/50'}
        ${editable ? 'shadow-sm' : ''}
      `}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
