import { useState, useRef } from 'react';
import { uploadApi } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import { FileText, X, CheckCircle, AlertCircle, FolderOpen, Files } from 'lucide-react';

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

type UploadMode = 'single' | 'multi' | 'localFolder';

interface BatchProgress {
  total: number;
  completed: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: { file: string; error: string }[];
}

export function UploadDialog({ onClose }: { onClose: () => void }) {
  const { fetchLiterature, fetchTags } = useAppStore();
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const refreshData = async () => {
    await fetchLiterature();
    await fetchTags();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('请选择PDF文件');
    }
  };

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setError('未找到PDF文件');
      return;
    }
    setSelectedFiles(pdfFiles);
    setError(null);
    setUploadResult(null);
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setError('文件夹中未找到PDF文件');
      return;
    }
    setSelectedFiles(pdfFiles);
    setError(null);
    setUploadResult(null);
  };

  const handleSingleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setError(null);

    try {
      const response = await uploadApi.uploadPDF(selectedFile);
      setUploadResult(`成功导入文献：${response.data.title || response.data.file_name || '未命名'}`);
      await refreshData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '上传失败，请重试';
      setError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    const progress: BatchProgress = {
      total: selectedFiles.length,
      completed: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    setBatchProgress(progress);

    for (const file of selectedFiles) {
      try {
        await uploadApi.uploadPDF(file);
        progress.imported++;
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || '上传失败';
        if (err?.response?.status === 409) {
          progress.skipped++;
        } else {
          progress.failed++;
          progress.errors.push({ file: file.name, error: msg });
        }
      }
      progress.completed++;
      setBatchProgress({ ...progress });
      setUploadProgress(Math.round((progress.completed / progress.total) * 100));
    }

    const resultParts: string[] = [];
    if (progress.imported > 0) resultParts.push(`导入${progress.imported}篇`);
    if (progress.skipped > 0) resultParts.push(`跳过${progress.skipped}篇`);
    if (progress.failed > 0) resultParts.push(`失败${progress.failed}篇`);
    setUploadResult(`共${progress.total}个PDF，${resultParts.join('，')}`);

    await refreshData();
    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      setError('请拖放PDF文件');
      return;
    }

    if (pdfFiles.length === 1) {
      setSelectedFile(pdfFiles[0]!);
      setUploadMode('single');
    } else {
      setSelectedFiles(pdfFiles);
      setUploadMode('multi');
    }
    setError(null);
  };

  const resetMode = () => {
    setError(null);
    setUploadResult(null);
    setBatchProgress(null);
    setSelectedFile(null);
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const switchMode = (mode: UploadMode) => {
    setUploadMode(mode);
    resetMode();
  };

  const modeButtons: { mode: UploadMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'single', label: '单个文件', icon: <FileText className="w-4 h-4" /> },
    { mode: 'multi', label: '多个文件', icon: <Files className="w-4 h-4" /> },
    { mode: 'localFolder', label: '本地文件夹', icon: <FolderOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[440px] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">导入文献</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex space-x-2 mb-4">
            {modeButtons.map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => switchMode(mode)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-1 ${
                  uploadMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {uploadMode === 'single' && (
            <div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">拖放PDF文件到此处，或点击选择文件</p>
                <p className="text-sm text-gray-500">支持PDF格式</p>

                {selectedFile && (
                  <div className="mt-4 p-2 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700 truncate">{selectedFile.name}</p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSingleUpload}
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isUploading ? '上传中...' : '开始上传'}
                  </button>
                </div>
              )}
            </div>
          )}

          {uploadMode === 'multi' && (
            <div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => multiFileInputRef.current?.click()}
              >
                <input
                  ref={multiFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleMultiFileSelect}
                  className="hidden"
                />

                <Files className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">点击选择多个PDF文件</p>
                <p className="text-sm text-gray-500">支持一次选择多个PDF</p>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-2 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      已选择 {selectedFiles.length} 个PDF文件
                    </p>
                  </div>
                )}
              </div>

              {selectedFiles.length > 0 && !isUploading && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleBatchUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    开始批量上传
                  </button>
                </div>
              )}
            </div>
          )}

          {uploadMode === 'localFolder' && (
            <div>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => folderInputRef.current?.click()}
              >
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  accept=".pdf"
                  onChange={handleFolderSelect}
                  className="hidden"
                />

                <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">点击选择本地文件夹</p>
                <p className="text-sm text-gray-500">自动扫描文件夹中所有PDF文件（含子目录）</p>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 p-2 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      找到 {selectedFiles.length} 个PDF文件
                    </p>
                  </div>
                )}
              </div>

              {selectedFiles.length > 0 && !isUploading && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleBatchUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    开始批量上传
                  </button>
                </div>
              )}
            </div>
          )}

          {isUploading && batchProgress && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                已处理 {batchProgress.completed}/{batchProgress.total} 个文件
              </p>
              {batchProgress.failed > 0 && (
                <div className="mt-2 max-h-24 overflow-y-auto">
                  {batchProgress.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 truncate">
                      {e.file}: {e.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {isUploading && !batchProgress && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                上传进度: {uploadProgress}%
              </p>
            </div>
          )}

          {uploadResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800">{uploadResult}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}