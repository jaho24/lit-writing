import { useAppStore } from '../../stores/appStore';
import { getPdfUrl } from '../../api/client';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Highlighter, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, X, Plus, Underline, Square } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

interface PDFPreviewProps {
  literatureId: number;
  initialPage?: number;
  initialScale?: number;
}

export function PDFPreview({ literatureId, initialPage = 1, initialScale = 1.2 }: PDFPreviewProps) {
  const selectedLit = useAppStore(s => s.literature.find(l => l.id === literatureId) || null);
  const annotations = useAppStore(s => s.annotations);
  const tags = useAppStore(s => s.tags);
  const createAnnotation = useAppStore(s => s.createAnnotation);
  const setAnnotationTags = useAppStore(s => s.setAnnotationTags);
  const fetchAnnotations = useAppStore(s => s.fetchAnnotations);
  const createTag = useAppStore(s => s.createTag);
  const updateTabState = useAppStore(s => s.updateTabState);

  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(initialScale);
  const [selectedText, setSelectedText] = useState('');
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPos, setHighlightMenuPos] = useState({ x: 0, y: 0 });
  const [pendingAnnotationId, setPendingAnnotationId] = useState<number | null>(null);
  const [pendingTagSelection, setPendingTagSelection] = useState<number[]>([]);
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#4CAF50');

  const [areaHighlightMode, setAreaHighlightMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef(currentPage);
  const scaleRef = useRef(scale);

  currentPageRef.current = currentPage;
  scaleRef.current = scale;

  useEffect(() => {
    if (selectedLit) {
      loadPDF();
      fetchAnnotations(literatureId);
    }
    return () => {
      updateTabState(literatureId, currentPageRef.current, scaleRef.current);
    };
  }, [literatureId]);

  const loadPDF = async () => {
    if (!selectedLit?.file_path) return;
    try {
      const pdf = await pdfjsLib.getDocument(getPdfUrl(selectedLit.file_path)).promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  };

  const getAnnotationDisplayColor = (ann: { color: string; tags?: { id: number; name: string; color: string }[] }) => {
    const firstTag = ann.tags?.[0];
    return firstTag ? firstTag.color : '#9E9E9E';
  };

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // 1) Render canvas
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      // 2) Render text layer using PDF.js official TextLayer class
      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv) {
        textLayerDiv.innerHTML = '';
        const textContentSource = await page.streamTextContent();
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();
      }

      // 3) Render annotation overlay
      renderAnnotationOverlays(pageNum);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  }, [pdfDocument, scale]);

  const renderAnnotationOverlays = (pageNum: number) => {
    const container = annotationLayerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const lit = selectedLit;
    const pageAnnotations = annotations.filter(
      ann => ann.literature_id === lit?.id && ann.page === pageNum
    );

    for (const ann of pageAnnotations) {
      if ((ann.type === 'highlight' || ann.type === 'underline') && ann.position_x != null && ann.position_y != null && ann.width != null && ann.height != null) {
        const div = document.createElement('div');
        div.className = 'pdf-annotation-overlay';
        div.dataset.annotationId = String(ann.id);
        const displayColor = getAnnotationDisplayColor(ann);
        div.style.left = `${ann.position_x * scale}px`;
        div.style.top = `${ann.position_y * scale}px`;
        div.style.width = `${ann.width * scale}px`;
        div.style.height = `${ann.height * scale}px`;
        
        if (ann.type === 'underline') {
          div.style.backgroundColor = 'transparent';
          div.style.borderBottom = `2px solid ${displayColor}`;
          div.style.height = '2px';
        } else {
          div.style.backgroundColor = displayColor + '4D';
        }
        
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          handleAnnotationClick(ann.id);
        });
        container.appendChild(div);
      }
    }
  };

  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, renderPage]);

  useEffect(() => {
    if (pdfDocument && annotations.length >= 0) {
      renderAnnotationOverlays(currentPage);
    }
  }, [annotations]);

  const handleAnnotationClick = (annotationId: number) => {
    const ann = annotations.find(a => a.id === annotationId);
    if (!ann) return;
    setSelectedText(ann.text || '');
    setPendingAnnotationId(ann.id);
    setPendingTagSelection(ann.tags?.map(t => t.id) || []);
  };

  const handleMouseUp = () => {
    if (pendingAnnotationId) return;
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      setShowHighlightMenu(false);
      return;
    }
    const text = selection.toString().trim();
    setSelectedText(text);

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setHighlightMenuPos({ x: rect.left + rect.width / 2, y: rect.top });
    setShowHighlightMenu(true);
  };

  const handleHighlight = async (annotationType: 'highlight' | 'underline' = 'highlight') => {
    const lit = selectedLit;
    if (!selectedText || !lit) return;

    const selection = window.getSelection();
    let positionData: Record<string, number> = {};

    if (selection && selection.rangeCount > 0 && pageWrapperRef.current) {
      const range = selection.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const wrapperRect = pageWrapperRef.current.getBoundingClientRect();

      positionData = {
        position_x: (rangeRect.left - wrapperRect.left) / scale,
        position_y: (rangeRect.top - wrapperRect.top) / scale,
        width: rangeRect.width / scale,
        height: rangeRect.height / scale,
      };
    }

    await createAnnotation({
      literature_id: lit.id,
      page: currentPage,
      text: selectedText,
      type: annotationType,
      ...positionData,
    });

    setShowHighlightMenu(false);
    window.getSelection()?.removeAllRanges();

    const storeAnnotations = useAppStore.getState().annotations;
    const latest = storeAnnotations.find(
      a => a.literature_id === lit.id && a.text === selectedText && a.page === currentPage
    );
    if (latest) {
      setPendingAnnotationId(latest.id);
      setPendingTagSelection([]);
    }
    setSelectedText('');
  };

  const handleTagToggleInPanel = (tagId: number) => {
    setPendingTagSelection(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleConfirmTags = async () => {
    if (pendingAnnotationId) {
      await setAnnotationTags(pendingAnnotationId, pendingTagSelection);
      setPendingAnnotationId(null);
      setPendingTagSelection([]);
      setShowNewTagInput(false);
      setSelectedText('');
    }
  };

  const handleSkipTags = () => {
    setPendingAnnotationId(null);
    setPendingTagSelection([]);
    setShowNewTagInput(false);
    setSelectedText('');
  };

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim(), newTagColor);
    const updatedTags = useAppStore.getState().tags;
    const newTag = updatedTags.find(t => t.name === newTagName.trim());
    if (newTag) {
      setPendingTagSelection(prev => [...prev, newTag.id]);
    }
    setNewTagName('');
    setShowNewTagInput(false);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };


  const handleAreaMouseDown = (e: React.MouseEvent) => {
    if (!areaHighlightMode || !pageWrapperRef.current) return;
    const rect = pageWrapperRef.current.getBoundingClientRect();
    setDragStart({ x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale });
    setIsDragging(true);
    setDragRect(null);
  };

  const handleAreaMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !pageWrapperRef.current) return;
    const rect = pageWrapperRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;
    setDragRect({
      x: Math.min(dragStart.x, currentX),
      y: Math.min(dragStart.y, currentY),
      w: Math.abs(currentX - dragStart.x),
      h: Math.abs(currentY - dragStart.y),
    });
  };

  const handleAreaMouseUp = async () => {
    if (!isDragging || !dragRect || !selectedLit) {
      setIsDragging(false);
      return;
    }
    if (dragRect.w > 5 && dragRect.h > 5) {
      await createAnnotation({
        literature_id: selectedLit.id,
        page: currentPage,
        type: 'highlight',
        position_x: dragRect.x,
        position_y: dragRect.y,
        width: dragRect.w,
        height: dragRect.h,
      });
      const storeAnnotations = useAppStore.getState().annotations;
      const latest = storeAnnotations.find(
        a => a.literature_id === selectedLit.id && a.page === currentPage && !a.text
      );
      if (latest) {
        setPendingAnnotationId(latest.id);
        setPendingTagSelection([]);
      }
    }
    setIsDragging(false);
    setDragRect(null);
    setAreaHighlightMode(false);
  };

  if (!selectedLit) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#999' }}>
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2" style={{ color: '#ccc' }} />
          <p style={{ fontSize: '13px' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={handlePrevPage} disabled={currentPage === 1} className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">第 {currentPage} 页 / 共 {totalPages} 页</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded-md"><ZoomOut className="w-5 h-5" /></button>
            <span className="text-sm text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded-md"><ZoomIn className="w-5 h-5" /></button>
            <button
              onClick={() => setAreaHighlightMode(!areaHighlightMode)}
              className="p-2 rounded-md transition-colors"
              style={{ background: areaHighlightMode ? '#e8f0fe' : 'transparent', color: areaHighlightMode ? '#2D6DA4' : '#666' }}
              title="区域高亮"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <div
            ref={pageWrapperRef}
            className="relative inline-block"
            style={{ cursor: areaHighlightMode ? 'crosshair' : 'default' }}
            onMouseDown={areaHighlightMode ? handleAreaMouseDown : undefined}
            onMouseMove={areaHighlightMode ? handleAreaMouseMove : undefined}
            onMouseUp={areaHighlightMode ? handleAreaMouseUp : undefined}
          >
            <canvas ref={canvasRef} className="block border border-gray-200" />

            <div
              ref={annotationLayerRef}
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 1 }}
            />

            <div
              ref={textLayerRef}
              className="pdf-text-layer"
              onMouseUp={handleMouseUp}
            />

            {areaHighlightMode && dragRect && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${dragRect.x * scale}px`,
                  top: `${dragRect.y * scale}px`,
                  width: `${dragRect.w * scale}px`,
                  height: `${dragRect.h * scale}px`,
                  border: '2px dashed #2D6DA4',
                  backgroundColor: 'rgba(45, 109, 164, 0.1)',
                  zIndex: 10,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {showHighlightMenu && !pendingAnnotationId && (
        <div
          className="fixed bg-white border rounded-lg shadow-lg py-1.5 z-50"
          style={{ left: highlightMenuPos.x - 80, top: highlightMenuPos.y - 44, borderColor: '#e0e0e0' }}
        >
          <div className="flex items-center">
            <button
              onClick={() => handleHighlight('highlight')}
              className="px-3 py-2 text-[12px] hover:bg-gray-100 flex items-center rounded-md transition-colors"
              style={{ color: '#1a1a1a' }}
            >
              <Highlighter className="w-4 h-4 mr-1.5" style={{ color: '#2D6DA4' }} />
              高亮
            </button>
            <button
              onClick={() => handleHighlight('underline')}
              className="px-3 py-2 text-[12px] hover:bg-gray-100 flex items-center rounded-md transition-colors"
              style={{ color: '#1a1a1a' }}
            >
              <Underline className="w-4 h-4 mr-1.5" style={{ color: '#2D6DA4' }} />
              下划线
            </button>
          </div>
        </div>
      )}

      {pendingAnnotationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-80 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">分配标签</h3>
              <button onClick={handleSkipTags} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {selectedText && (
              <div className="bg-gray-50 rounded-md p-2 mb-3 text-xs text-gray-700 line-clamp-3">
                "{selectedText}"
              </div>
            )}

            <p className="text-xs text-gray-500 mb-3">
              标注颜色自动跟随标签颜色，也可跳过稍后分配。
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleTagToggleInPanel(tag.id)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    pendingTagSelection.includes(tag.id)
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white shadow-sm" style={{ backgroundColor: tag.color }} />
                  <span className="text-gray-800">{tag.name}</span>
                  {pendingTagSelection.includes(tag.id) && <span className="text-blue-600 ml-auto">✓</span>}
                </button>
              ))}
            </div>

            {showNewTagInput ? (
              <div className="flex items-center space-x-2 mb-3">
                <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                <input
                  type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                  placeholder="标签名称"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button onClick={handleCreateNewTag} disabled={!newTagName.trim()} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400">创建</button>
              </div>
            ) : (
              <button onClick={() => setShowNewTagInput(true)} className="w-full flex items-center space-x-1 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 border border-dashed border-gray-300 mb-3">
                <Plus className="w-4 h-4" /><span>创建新标签</span>
              </button>
            )}

            <div className="flex space-x-2">
              <button onClick={handleConfirmTags} className="flex-1 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">确认</button>
              <button onClick={handleSkipTags} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors">跳过</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
