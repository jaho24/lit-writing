import { useAppStore } from '../../stores/appStore';
import { useState } from 'react';
import { FileText, Save, Trash2, AlertCircle } from 'lucide-react';

interface Literature {
  id: number;
  title: string | null;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
  metadata_confidence: Record<string, string> | null;
}

export function LiteratureDetail() {
  const { 
    selectedLiterature, 
    updateLiterature, 
    deleteLiterature 
  } = useAppStore();
  
  const [formData, setFormData] = useState<Literature | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confidenceColors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800'
  };

  const handleInputChange = (field: keyof Literature, value: string | number | null) => {
    if (formData) {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleSave = () => {
    if (formData) {
      updateLiterature(formData.id, formData);
    }
  };

  const handleDelete = () => {
    if (formData) {
      deleteLiterature(formData.id);
      setShowDeleteConfirm(false);
    }
  };

  if (!selectedLiterature) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>请选择一篇文献查看详情</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    setFormData(selectedLiterature);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">文献详情</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              value={formData?.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData?.metadata_confidence?.title && (
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${confidenceColors[formData.metadata_confidence.title as keyof typeof confidenceColors]}`}>
                {formData.metadata_confidence.title === 'high' ? '高' : 
                 formData.metadata_confidence.title === 'medium' ? '中' : '低'}置信度
              </span>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作者
            </label>
            <input
              type="text"
              value={formData?.authors || ''}
              onChange={(e) => handleInputChange('authors', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData?.metadata_confidence?.authors && (
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${confidenceColors[formData.metadata_confidence.authors as keyof typeof confidenceColors]}`}>
                {formData.metadata_confidence.authors === 'high' ? '高' : 
                 formData.metadata_confidence.authors === 'medium' ? '中' : '低'}置信度
              </span>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              年份
            </label>
            <input
              type="number"
              value={formData?.year || ''}
              onChange={(e) => handleInputChange('year', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData?.metadata_confidence?.year && (
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${confidenceColors[formData.metadata_confidence.year as keyof typeof confidenceColors]}`}>
                {formData.metadata_confidence.year === 'high' ? '高' : 
                 formData.metadata_confidence.year === 'medium' ? '中' : '低'}置信度
              </span>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              期刊
            </label>
            <input
              type="text"
              value={formData?.journal || ''}
              onChange={(e) => handleInputChange('journal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData?.metadata_confidence?.journal && (
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${confidenceColors[formData.metadata_confidence.journal as keyof typeof confidenceColors]}`}>
                {formData.metadata_confidence.journal === 'high' ? '高' : 
                 formData.metadata_confidence.journal === 'medium' ? '中' : '低'}置信度
              </span>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DOI
            </label>
            <input
              type="text"
              value={formData?.doi || ''}
              onChange={(e) => handleInputChange('doi', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData?.metadata_confidence?.doi && (
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${confidenceColors[formData.metadata_confidence.doi as keyof typeof confidenceColors]}`}>
                {formData.metadata_confidence.doi === 'high' ? '高' : 
                 formData.metadata_confidence.doi === 'medium' ? '中' : '低'}置信度
              </span>
            )}
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              摘要
            </label>
            <textarea
              value={formData?.abstract || ''}
              onChange={(e) => handleInputChange('abstract', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>保存</span>
        </button>
        
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>删除</span>
        </button>
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 w-96">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">
              您确定要删除这篇文献吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}