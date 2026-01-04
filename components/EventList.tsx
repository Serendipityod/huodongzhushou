import React, { useEffect } from 'react';
import { AppEvent, SelectionState } from '../types.ts';
import { Trash2, Clock } from 'lucide-react';

interface EventListProps {
  events: AppEvent[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onUpdateEvent: (id: string, field: keyof AppEvent, value: string) => void;
  onSelectRow?: (id: string, source: 'table', field?: 'time' | 'location' | 'serial') => void;
  selection?: SelectionState | null;
}

export const EventList: React.FC<EventListProps> = ({ 
  events, 
  onDelete, 
  onClearAll, 
  onUpdateEvent, 
  onSelectRow,
  selection
}) => {
  // Auto-scroll logic when sidebar selection changes
  useEffect(() => {
    if (selection?.source === 'sidebar' && selection.id) {
       const el = document.getElementById(`event-row-${selection.id}`);
       if (el) {
         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
    }
  }, [selection]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">暂无活动数据</h3>
        <p className="text-gray-500 mt-1">请通过 Excel 导入添加活动</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">活动列表 ({events.length})</h2>
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
        >
          清空列表
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                序号
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%]">
                活动名称
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">
                地点
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event, index) => {
              // Serial Validation
              const expectedSerial = (index + 1).toString();
              const isSerialValid = event.serialNo === expectedSerial;
              const isSerialIgnored = event.ignoredErrors?.includes('serial');

              const isTimeIgnored = event.ignoredErrors?.includes('time');
              const isLocationIgnored = event.ignoredErrors?.includes('location');

              // Visual error state check (ignore ignored errors)
              const hasSerialError = !isSerialValid && !isSerialIgnored;
              const hasTimeError = !event.isTimeValid && !isTimeIgnored;
              const hasLocationError = !event.isLocationValid && !isLocationIgnored;

              const hasAnyError = hasSerialError || hasTimeError || hasLocationError;
              const isSelected = selection?.id === event.id;
              
              return (
                <tr 
                  key={event.id}
                  id={`event-row-${event.id}`}
                  onClick={() => onSelectRow && onSelectRow(event.id, 'table')}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : 
                    hasAnyError ? 'bg-red-50 hover:bg-red-100' : 
                    'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-2 py-3 align-top text-center">
                    <input 
                      type="text" 
                      value={event.serialNo}
                      onClick={(e) => { e.stopPropagation(); onSelectRow?.(event.id, 'table', 'serial'); }}
                      onChange={(e) => onUpdateEvent(event.id, 'serialNo', e.target.value)}
                      className={`w-full text-center bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm font-medium cursor-pointer ${
                        hasSerialError ? 'text-red-600 font-bold' : 'text-gray-500'
                      }`}
                    />
                  </td>
                  <td className="px-2 py-3 align-top">
                    <input 
                      type="text"
                      value={event.name}
                      onChange={(e) => onUpdateEvent(event.id, 'name', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm font-medium text-gray-900"
                    />
                  </td>
                  <td className="px-2 py-3 align-top">
                    <input 
                      type="text"
                      value={event.time}
                      onClick={(e) => { e.stopPropagation(); onSelectRow?.(event.id, 'table', 'time'); }}
                      onChange={(e) => onUpdateEvent(event.id, 'time', e.target.value)}
                      className={`w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm cursor-pointer ${
                        hasTimeError ? 'text-red-600 font-bold' : 'text-gray-500'
                      }`}
                    />
                  </td>
                  <td className="px-2 py-3 align-top">
                     <input 
                      type="text"
                      value={event.location}
                      onClick={(e) => { e.stopPropagation(); onSelectRow?.(event.id, 'table', 'location'); }}
                      onChange={(e) => onUpdateEvent(event.id, 'location', e.target.value)}
                      className={`w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:ring-0 text-sm cursor-pointer ${
                        hasLocationError ? 'text-red-600 font-bold' : 'text-gray-500'
                      }`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          onDelete(event.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};