'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, Download, Loader2, Maximize2, Minimize2 } from 'lucide-react'

const PDFJS_CDN = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs'
const PDFJS_WORKER_CDN = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

interface PdfViewerProps {
  fileUrl: string
  fileName?: string
  height?: string
}

let pdfjsPromise: Promise<any> | null = null

function loadPdfJs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = import(/* webpackIgnore: true */ PDFJS_CDN).then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
    return mod
  })
  return pdfjsPromise
}

export function PdfViewer({ fileUrl, fileName, height = '600px' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const pdfDocRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const renderedPages = useRef<Set<number>>(new Set())

  // Load the PDF document
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const pdfjsLib = await loadPdfJs()
        const loadingTask = pdfjsLib.getDocument(fileUrl)
        const pdf = await loadingTask.promise
        if (!cancelled) {
          pdfDocRef.current = pdf
          setNumPages(pdf.numPages)
          setLoading(false)
        }
      } catch (err) {
        console.error('PDF load error:', err)
        if (!cancelled) { setError(true); setLoading(false) }
      }
    }
    init()
    return () => { cancelled = true }
  }, [fileUrl])

  // Render a single page to its canvas
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || renderedPages.current.has(pageNum)) return
    const canvas = canvasRefs.current.get(pageNum)
    if (!canvas) return

    renderedPages.current.add(pageNum)
    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const context = canvas.getContext('2d')!
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * dpr)
      canvas.height = Math.floor(viewport.height * dpr)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      context.scale(dpr, dpr)
      await page.render({ canvasContext: context, viewport }).promise
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`PDF render error page ${pageNum}:`, err)
      }
    }
  }, [scale])

  // Re-render all pages when scale changes
  useEffect(() => {
    if (loading || numPages === 0) return
    renderedPages.current.clear()
    for (let i = 1; i <= numPages; i++) {
      renderPage(i)
    }
  }, [scale, loading, numPages, renderPage])

  function zoomIn() { setScale(s => Math.min(2.5, +(s + 0.2).toFixed(1))) }
  function zoomOut() { setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1))) }

  function handleDownload() {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName || 'document.pdf'
    a.click()
  }

  function toggleFullscreen() {
    setFullscreen(f => !f)
  }

  // Register canvas ref
  function setCanvasRef(pageNum: number, el: HTMLCanvasElement | null) {
    if (el) {
      canvasRefs.current.set(pageNum, el)
      renderPage(pageNum)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8" style={{ height }}>
        <p className="text-sm text-slate-600">Unable to display this PDF.</p>
        <button onClick={handleDownload} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1a2332] underline">
          <Download className="h-4 w-4" /> Download to view
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
        <span className="text-xs text-slate-600">{loading ? 'Loading...' : `${numPages} page${numPages !== 1 ? 's' : ''}`}</span>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} disabled={scale <= 0.5 || loading} className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-600 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} disabled={scale >= 2.5 || loading} className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Fullscreen + Download */}
        <div className="flex items-center gap-1">
          <button onClick={toggleFullscreen} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={handleDownload} className="rounded p-1.5 text-slate-600 hover:bg-slate-200" aria-label="Download PDF">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable pages */}
      <div
        ref={containerRef}
        className="overflow-auto bg-slate-100 flex-1"
        style={fullscreen ? undefined : { height }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <canvas
                key={pageNum}
                ref={(el) => setCanvasRef(pageNum, el)}
                className="shadow-sm bg-white"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
