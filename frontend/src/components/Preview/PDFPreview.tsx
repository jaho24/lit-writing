import { useAppStore } from '../../stores/appStore';
import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Highlighter, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export function PDFPreview() {
  const selectedLit = useAppStore(s => s.literature.find(l => l.id === s.selectedLiteratureId) || null);
  const selectedLiteratureId = useAppStore(s => s.selectedLiteratureId);
  const annotations = useAppStore(s => s.annotations);
  const createAnnotation = useAppStore(s => s.createAnnotation);
  const fetchAnnotations = useAppStore(s => s.fetchAnnotations);

  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [isRotated, setIsRotated] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedLiteratureId && selectedLit) {
      loadPDF();
      fetchAnnotations(selectedLiteratureId);
    }
  }, [selectedLiteratureId]);

  const loadPDF = async () => {
    if (!selectedLit?.file_path) return;
    
    try {
      const pdfUrl = selectedLit.file_path.startsWith('pdfs/')
        ? `/${selectedLit.file_path}`
        : `/pdfs/${selectedLit.file_path}`;
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const renderPage = async (pageNum: number) => {
    if (!pdfDocument || !canvasRef.current) return;
    
    try {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      drawAnnotations(pageNum);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const drawAnnotations = (pageNum: number) => {
    if (!canvasRef.current) return;
    
    const lit = selectedLit;
    const pageAnnotations = annotations.filter(
      ann => ann.literature_id === lit?.id && ann.page === pageNum
    );
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    pageAnnotations.forEach(annotation => {
      if (annotation.type === 'highlight' && annotation.position_x && annotation.position_y && annotation.width && annotation.height) {
        context.fillStyle = annotation.color + '4D';
        context.fillRect(
          annotation.position_x * scale,
          annotation.position_y * scale,
          annotation.width * scale,
          annotation.height * scale
        );
      }
    });
  };

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale, isRotated]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setHighlightPosition({ x: rect.left, y: rect.top });
      setShowHighlightMenu(true);
    }
  };

  const handleHighlight = () => {
    const lit = selectedLit;
    if (!selectedText || !lit) return;
    
    createAnnotation({
      literature_id: lit.id,
      page: currentPage,
      text: selectedText,
      type: 'highlight'
    });
    
    setShowHighlightMenu(false);
    setSelectedText('');
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setIsRotated(prev => !prev);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (!selectedLit) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>请选择一篇文献查看PDF</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50" ref={containerRef}>
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-sm text-gray-600">
              第 {currentPage} 页 / 共 {totalPages} 页
            </span>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <span className="text-sm text-gray-600 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative bg-white p-4">
        <canvas
          ref={canvasRef}
          className="mx-auto border border-gray-200"
          onMouseUp={handleTextSelection}
        />
      </div>
      
      {showHighlightMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-2 z-50"
          style={{ left: highlightPosition.x, top: highlightPosition.y }}
        >
          <button
            onClick={handleHighlight}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
          >
            <Highlighter className="w-4 h-4 mr-2" />
            <span>高亮</span>
          </button>
        </div>
      )}
    </div>
  );
}