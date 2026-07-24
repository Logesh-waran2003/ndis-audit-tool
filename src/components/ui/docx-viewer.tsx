'use client'

import { useState, useEffect } from 'react'
import { Loader2, Download, Maximize2, Minimize2 } from 'lucide-react'
import mammoth from 'mammoth'

interface DocxViewerProps {
  fileUrl: string
  fileName?: string
  height?: string
}

export function DocxViewer({ fileUrl, fileName, height = '600px' }: DocxViewerProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function convert() {
      try {
        const response = await fetch(fileUrl)
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        if (!cancelled) {
          setHtml(result.value)
          setLoading(false)
        }
      } catch (err) {
        console.error('DOCX convert error:', err)
        if (!cancelled) { setError(true); setLoading(false) }
      }
    }
    convert()
    return () => { cancelled = true }
  }, [fileUrl])

  function handleDownload() {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName || 'document.docx'
    a.click()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8" style={{ height }}>
        <p className="text-sm text-slate-600">Unable to display this DOCX.</p>
        <button onClick={handleDownload} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1a2332] underline">
          <Download className="h-4 w-4" /> Download to view in Word
        </button>
      </div>
    )
  }

  const wrapperClass = fullscreen
    ? 'fixed inset-0 z-50 bg-white flex flex-col'
    : 'rounded-lg border border-slate-200 overflow-hidden'

  return (
    <div className={wrapperClass}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2 shrink-0">
        <span className="text-xs text-slate-600">{fileName || 'Document'}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setFullscreen(f => !f)} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={handleDownload} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" aria-label="Download DOCX">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="overflow-auto bg-white flex-1"
        style={fullscreen ? undefined : { height }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div
            className="prose prose-sm max-w-none px-8 py-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  )
}
