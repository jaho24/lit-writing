import { useState, useRef } from 'react';
import { uploadApi } from '../../api/client';
import { useAppStore } from '../../stores/appStore';
import { FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

export function UploadDialog({ onClose }: { onClose: () => void }) {
  const { fetchLiterature, fetchTags } = useAppStore();
  const [uploadMode, setUploadMode] = useState<'single' | 'folder'>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folderPath, setFolderPath] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('请选择PDF文件');
    }
  };

  const refreshData = async () => {
    await fetchLiterature();
    await fetchTags();
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

  const handleFolderUpload = async () => {
    if (!folderPath.trim()) {
      setError('请输入文件夹路径');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setError(null);
    
    try {
      const response = await uploadApi.scanFolder(folderPath);
      const result = response.data;
      setUploadResult(`扫描完成：共${result.total}个文件，导入${result.imported}篇，跳过${result.skipped}篇，失败${result.failed}篇`);
      await refreshData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '文件夹扫描失败，请重试';
      setError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('请拖放PDF文件');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">导入文献</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setUploadMode('single')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                uploadMode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              单个文件
            </button>
            <button
              onClick={() => setUploadMode('folder')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                uploadMode === 'folder'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              文件夹
            </button>
          </div>
          
          {uploadMode === 'single' ? (
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
          ) : (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文件夹路径
                </label>
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="输入文件夹路径，例如: /path/to/pdfs"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleFolderUpload}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? '扫描中...' : '开始扫描'}
                </button>
              </div>
            </div>
          )}
          
          {isUploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
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