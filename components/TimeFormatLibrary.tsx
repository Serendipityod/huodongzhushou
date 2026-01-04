import React, { useState } from 'react';
import { TimeFormatItem } from '../types';
import { Plus, Trash2, Clock, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { validateTimeFormat } from '../constants';

interface TimeFormatLibraryProps {
  formats: TimeFormatItem[];
  onAddFormat: (name: string, pattern: string) => void;
  onRemoveFormat: (id: string) => void;
}

export const TimeFormatLibrary: React.FC<TimeFormatLibraryProps> = ({ formats, onAddFormat, onRemoveFormat }) => {
  const [newFormat, setNewFormat] = useState({ name: '', pattern: '' });
  const [testValue, setTestValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFormat.name.trim() && newFormat.pattern.trim()) {
      // Basic regex validity check
      try {
        new RegExp(newFormat.pattern);
        onAddFormat(newFormat.name.trim(), newFormat.pattern.trim());
        setNewFormat({ name: '', pattern: '' });
      } catch (err) {
        alert('正则表达式格式不正确，请检查。');
      }
    }
  };

  const validationResult = validateTimeFormat(testValue, formats);
  const isTestValid = validationResult.isValid;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* List Section */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">时间格式管理</h2>
              <p className="text-sm text-gray-500">定义系统允许的时间文本格式 (基于正则表达式)。</p>
            </div>
          </div>

          <div className="space-y-3">
            {formats.map((fmt) => (
              <div
                key={fmt.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 group"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium text-gray-900">{fmt.name}</h3>
                    {fmt.isSystem && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                        系统预设
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1 truncate" title={fmt.pattern}>
                    {fmt.pattern}
                  </p>
                </div>
                {!fmt.isSystem && (
                  <button
                    onClick={() => onRemoveFormat(fmt.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar: Add & Test */}
      <div className="space-y-6">
        {/* Add New */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">添加新格式</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">格式名称</label>
              <input
                type="text"
                required
                className="w-full rounded-md border-gray-300 shadow-sm border px-3 py-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                value={newFormat.name}
                onChange={(e) => setNewFormat({ ...newFormat, name: e.target.value })}
                placeholder="例如：全数字日期"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">正则表达式 (Regex)</label>
              <input
                type="text"
                required
                className="w-full rounded-md border-gray-300 shadow-sm border px-3 py-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-mono text-sm"
                value={newFormat.pattern}
                onChange={(e) => setNewFormat({ ...newFormat, pattern: e.target.value })}
                placeholder="例如：^\d{4}年$"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加规则
            </button>
          </form>
        </div>

        {/* Test Tool */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <PlayCircle className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-bold text-gray-900">校验测试</h3>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              className="w-full rounded-md border-gray-300 shadow-sm border px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="输入时间文本测试..."
            />
            {testValue && (
              <div className={`flex flex-col p-3 rounded-md ${isTestValid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <div className="flex items-center">
                  {isTestValid ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">格式匹配成功</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">格式不匹配</span>
                    </>
                  )}
                </div>
                {!isTestValid && validationResult.message && (
                  <span className="text-xs mt-1 ml-7 opacity-80">{validationResult.message}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};