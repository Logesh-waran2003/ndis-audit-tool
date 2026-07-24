'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Undo2, Redo2, Download, Loader2, Sparkles,
  Maximize2, Minimize2, Save,
} from 'lucide-react'
import { toast } from 'sonner'

interface DocxEditorProps {
  fileUrl: string
  fileName?: string
  evidenceId: string
  height?: string
}

export function DocxEditor({ fileUrl, fileName, evidenceId, height = '600px' }: DocxEditorProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Document content will appear here...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-8 py-6 min-h-[400px] focus:outline-none',
      },
    },
    onUpdate: () => setDirty(true),
  })

  // Load DOCX → HTML → inject into editor
  useEffect(() => {
    if (!editor) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(fileUrl)
        const arrayBuffer = await res.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (!cancelled && editor) {
          editor.commands.setContent(result.value)
          setDirty(false)
          setLoading(false)
        }
      } catch {
        if (!cancelled) { setError(true); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [fileUrl, editor])

  // AI Suggest — asks AI to improve/fix the document
  const handleAISuggest = useCallback(async () => {
    if (!editor) return
    setSuggesting(true)
    try {
      const currentHtml = editor.getHTML()
      const res = await fetch('/api/documents/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, currentHtml }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.suggestedHtml) {
        editor.commands.setContent(data.suggestedHtml)
        setDirty(true)
        toast.success('AI suggestions applied — review the changes')
      } else if (data.message) {
        toast.info(data.message)
      }
    } catch {
      toast.error('AI suggestion failed')
    }
    setSuggesting(false)
  }, [editor, evidenceId])

  // Save as DOCX — convert editor HTML → DOCX → upload as new version
  const handleSaveAsDocx = useCallback(async () => {
    if (!editor) return
    setSaving(true)
    try {
      const html = editor.getHTML()
      // Parse HTML into sections for docx
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const children: any[] = []

      doc.body.childNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return
        const el = node as HTMLElement
        const tag = el.tagName.toLowerCase()
        const text = el.textContent || ''

        if (tag === 'h1') {
          children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }))
        } else if (tag === 'h2') {
          children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }))
        } else if (tag === 'h3') {
          children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }))
        } else if (tag === 'ul' || tag === 'ol') {
          el.querySelectorAll('li').forEach(li => {
            children.push(new Paragraph({
              text: `• ${li.textContent}`,
              spacing: { after: 60 },
            }))
          })
        } else {
          // Paragraphs — handle inline formatting
          const runs: TextRun[] = []
          if (el.children.length === 0) {
            runs.push(new TextRun({ text }))
          } else {
            el.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE) {
                runs.push(new TextRun({ text: child.textContent || '' }))
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                const inline = child as HTMLElement
                const inlineTag = inline.tagName.toLowerCase()
                runs.push(new TextRun({
                  text: inline.textContent || '',
                  bold: inlineTag === 'strong' || inlineTag === 'b',
                  italics: inlineTag === 'em' || inlineTag === 'i',
                  underline: inlineTag === 'u' ? {} : undefined,
                }))
              }
            })
          }
          children.push(new Paragraph({ children: runs, spacing: { after: 120 } }))
        }
      })

      const docx = new Document({
        sections: [{ properties: {}, children }],
      })

      const buffer = await Packer.toBuffer(docx)
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const file = new File([blob], fileName || 'document.docx', { type: blob.type })

      // Upload as new evidence (replaces old)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', fileName?.replace(/\.[^.]+$/, '') || 'Edited Document')
      formData.append('category', 'POLICY')

      const uploadRes = await fetch('/api/evidence', { method: 'POST', body: formData })
      if (uploadRes.ok) {
        setDirty(false)
        toast.success('Saved as new document')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Save failed')
    }
    setSaving(false)
  }, [editor, fileName])

  // Download as DOCX (no upload)
  const handleDownload = useCallback(async () => {
    if (!editor) return
    const html = editor.getHTML()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const children: any[] = []

    doc.body.childNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as HTMLElement
      const text = el.textContent || ''
      const tag = el.tagName.toLowerCase()
      if (tag === 'h1') children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1 }))
      else if (tag === 'h2') children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2 }))
      else children.push(new Paragraph({ text, spacing: { after: 120 } }))
    })

    const docx = new Document({ sections: [{ properties: {}, children }] })
    const buffer = await Packer.toBuffer(docx)
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'document.docx'
    a.click()
    URL.revokeObjectURL(url)
  }, [editor, fileName])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8" style={{ height }}>
        <p className="text-sm text-slate-600">Unable to load this document for editing.</p>
      </div>
    )
  }

  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-50 bg-white flex flex-col'
    : 'rounded-lg border border-slate-200 overflow-hidden flex flex-col'

  return (
    <div className={wrapperClass} style={fullscreen ? undefined : { height }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5 shrink-0 flex-wrap">
        {/* Formatting */}
        <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="w-px h-5 bg-slate-200 mx-1" />

        <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Suggest */}
        <button
          onClick={handleAISuggest}
          disabled={suggesting || loading}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          title="AI will review and suggest improvements"
        >
          {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          AI Suggest
        </button>

        {/* Save */}
        <button
          onClick={handleSaveAsDocx}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-[#1a2332] text-xs font-medium text-white hover:bg-[#243447] disabled:opacity-50"
          title="Save as new document"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>

        {/* Download */}
        <button onClick={handleDownload} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" title="Download DOCX">
          <Download className="h-4 w-4" />
        </button>

        {/* Fullscreen */}
        <button onClick={() => setFullscreen(f => !f)} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* Status bar */}
      {dirty && (
        <div className="border-t border-slate-200 bg-amber-50 px-3 py-1 shrink-0">
          <p className="text-xs text-amber-700">Unsaved changes</p>
        </div>
      )}
    </div>
  )
}

function ToolbarButton({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  )
}
