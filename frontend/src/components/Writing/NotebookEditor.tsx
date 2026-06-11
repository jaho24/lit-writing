import { useImperativeHandle, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code, Minus, Copy, Download } from 'lucide-react';
import { CitationBlock } from './CitationBlock';
import type { CitationItem } from '../../types';
import { useAppStore } from '../../stores/appStore';

export interface EditorHandle {
  insertAtCursor: (text: string) => void;
  getContent: () => string;
}

interface NotebookEditorProps {
  editorRef: React.RefObject<EditorHandle | null>;
}

const EMPTY_CITATIONS: CitationItem[] = [];

export function NotebookEditor({ editorRef }: NotebookEditorProps) {
  const editedContent = useAppStore(s => s.editedContent);
  const citations = useAppStore(s => s.generationResult?.citations ?? EMPTY_CITATIONS);
  const lastInjectedContent = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: editedContent ?? '',
    immediatelyRender: false,
  });

  useImperativeHandle(editorRef, () => ({
    insertAtCursor: (text: string) => {
      if (editor) {
        editor.chain().focus().insertContent(text).run();
      }
    },
    getContent: () => {
      return editor ? editor.getMarkdown() : '';
    },
  }));

  useEffect(() => {
    if (editor && editedContent != null && editedContent !== lastInjectedContent.current) {
      lastInjectedContent.current = editedContent;
      editor.commands.setContent(editedContent, { emitUpdate: false });
    }
  }, [editedContent, editor]);

  const handleCopy = async () => {
    if (editor) {
      const markdown = editor.getMarkdown();
      try {
        await navigator.clipboard.writeText(markdown);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleExport = () => {
    if (editor) {
      const markdown = editor.getMarkdown();
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'writing.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('bold') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('italic') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('blockquote') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <Quote className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
              disabled={!editor}
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded hover:bg-gray-100 ${editor?.isActive('codeBlock') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              disabled={!editor}
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
              disabled={!editor}
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
              disabled={!editor}
              title="导出为 Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,.05) 27px, rgba(0,0,0,.05) 28px)',
        backgroundSize: '100% 28px',
        fontFamily: 'Georgia, serif',
        lineHeight: '1.8'
      }}>
        {editor && <EditorContent editor={editor} />}
      </div>
      {citations.length > 0 && <CitationBlock citations={citations} />}
    </div>
  );
}
