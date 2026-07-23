'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react'

// Load pdf.js from CDN — avoids all Webpack/ESM interop issues
const PDFJS_CDN = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs'
const PDFJS_WORKER_CDN = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

interface PdfViewerProps {
  fileUrl: string
  fileName?: string
  height?: string
}

// Global cache so we only load pdf.js once
let pdfjsPromise: Promise<any> | null = null

function loadPdfJs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise
  pdfjsPromise = import(/* webpackIgnore: true */ PDFJS_CDN).then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
    return mod
  })
  return pdfjsPromise
}

export function PdfViewer({ fileUrl, fileName, height = '500px' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)

  // Load pdf.js and the document
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
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [fileUrl])

  // Render the current page whenever pageNumber or scale changes
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || loading) return

    let cancelled = false

    async function renderPage() {
      try {
        // Cancel any in-progress render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
          renderTaskRef.current = null
        }

        const pdf = pdfDocRef.current
        const page = await pdf.getPage(pageNumber)
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current!
        const context = canvas.getContext('2d')!

        // High-DPI support
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        context.scale(dpr, dpr)

        if (!cancelled) {
          const renderTask = page.render({ canvasContext: context, viewport })
          renderTaskRef.current = renderTask
          await renderTask.promise
        }
      } catch (err: any) {
        // Ignore cancelled render errors
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err)
        }
      }
    }

    renderPage()
    return () => { cancelled = true }
  }, [pageNumber, scale, loading])

  function goToPrev() {
    setPageNumber((p) => Math.max(1, p - 1))
  }

  function goToNext() {
    setPageNumber((p) => Math.min(numPages, p + 1))
  }

  function zoomIn() {
    setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(1)))
  }

  function zoomOut() {
    setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))
  }

  function handleDownload() {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName || 'document.pdf'
    a.click()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8" style={{ height }}>
        <p className="text-sm text-slate-600">Unable to display this PDF.</p>
        <button
          onClick={handleDownload}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1a2332] underline"
        >
          <Download className="h-4 w-4" />
          Download to view
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrev}
            disabled={pageNumber <= 1 || loading}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-600 min-w-[80px] text-center">
            {loading ? '— / —' : `${pageNumber} / ${numPages}`}
          </span>
          <button
            onClick={goToNext}
            disabled={pageNumber >= numPages || loading}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5 || loading}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-600 min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2.5 || loading}
            className="rounded p-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="rounded p-1.5 text-slate-600 hover:bg-slate-200"
          aria-label="Download PDF"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* PDF content */}
      <div className="overflow-auto bg-slate-100 flex justify-center" style={{ height }}>
        {loading ? (
          <div className="flex items-center justify-center h-full w-full">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="py-4">
            <canvas
              ref={canvasRef}
              className="shadow-sm bg-white"
            />
          </div>
        )}
      </div>
    </div>
  )
}
