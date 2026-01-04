import React, { useState, useEffect } from 'react';
import { AppEvent, AddressLibraryItem, SelectionState } from '../types';
import { ListOrdered, MapPin, Clock, Check, Plus, AlertCircle, Wand2, EyeOff, RotateCcw, Lightbulb, FilePlus } from 'lucide-react';
import { getRecommendedTime, getRecommendedLocation, generateRegexFromTime } from '../constants';

interface IssueSidebarProps {
  events: AppEvent[];
  locations: AddressLibraryItem[];
  onFixSerial: () => void;
  onAddLocationToLibrary: (name: string) => void;
  onAddFormatRule: (name: string, pattern: string) => void;
  onUpdateEventTime: (id: string, newTime: string) => void;
  onUpdateEventLocation: (id: string, newLocation: string) => void;
  onIgnoreError: (id: string, type: 'serial' | 'time' | 'location') => void;
  onRestoreError: (id: string, type: 'serial' | 'time' | 'location') => void;
  selection?: SelectionState | null;
  onSelectIssue?: (id: string, source: 'sidebar', field?: 'time' | 'location' | 'serial') => void;
}

export const IssueSidebar: React.FC<IssueSidebarProps> = ({ 
  events, 
  locations,
  onFixSerial, 
  onAddLocationToLibrary,
  onAddFormatRule,
  onUpdateEventTime,
  onUpdateEventLocation,
  onIgnoreError,
  onRestoreError,
  selection,
  onSelectIssue
}) => {
  const [viewMode, setViewMode] = useState<'pending' | 'ignored'>('pending');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTimeVal, setTempTimeVal] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // --- Filtering Logic ---
  
  // Pending Issues
  const pendingSerialIssues = events.filter(e => e.serialNo !== String(events.indexOf(e) + 1) && !e.ignoredErrors?.includes('serial'));
  const pendingTimeIssues = events.filter(e => !e.isTimeValid && !e.ignoredErrors?.includes('time'));
  const pendingLocationIssues = events.filter(e => !e.isLocationValid && !e.ignoredErrors?.includes('location'));
  
  // Group Pending Locations
  const uniqueInvalidLocations = Array.from(new Set(pendingLocationIssues.map(e => e.location))).filter(l => !!l);

  // Ignored Issues
  const ignoredSerialIssues = events.filter(e => e.serialNo !== String(events.indexOf(e) + 1) && e.ignoredErrors?.includes('serial'));
  const ignoredTimeIssues = events.filter(e => !e.isTimeValid && e.ignoredErrors?.includes('time'));
  const ignoredLocationIssues = events.filter(e => !e.isLocationValid && e.ignoredErrors?.includes('location'));

  const pendingCount = (pendingSerialIssues.length > 0 ? 1 : 0) + pendingTimeIssues.length + uniqueInvalidLocations.length;
  const ignoredCount = (ignoredSerialIssues.length > 0 ? 1 : 0) + ignoredTimeIssues.length + ignoredLocationIssues.length;

  // Auto-scroll logic
  useEffect(() => {
    if (selection?.source === 'table' && selection.id) {
      const event = events.find(e => e.id === selection.id);
      if (!event) return;

      let targetElementId = '';
      const hasTimeError = !event.isTimeValid && !event.ignoredErrors?.includes('time');
      const hasLocError = !event.isLocationValid && !event.ignoredErrors?.includes('location');
      const hasSerialError = event.serialNo !== String(events.indexOf(event) + 1) && !event.ignoredErrors?.includes('serial');

      if (hasTimeError || hasLocError || hasSerialError) {
        setViewMode('pending');
      }

      if (selection.field === 'location' && hasLocError) {
         // handled by data attribute below
      } else if (selection.field === 'time' && hasTimeError) {
         targetElementId = `issue-time-card-${event.id}`;
      } else if (selection.field === 'serial' && hasSerialError) {
         targetElementId = 'issue-serial-group';
      } else {
         if (hasTimeError) targetElementId = `issue-time-card-${event.id}`;
         else if (hasSerialError) targetElementId = 'issue-serial-group';
      }

      setTimeout(() => {
        let el = targetElementId ? document.getElementById(targetElementId) : null;
        if (!el && (hasLocError && (selection.field === 'location' || !targetElementId))) {
           el = document.querySelector(`[data-loc-card="${event.location.replace(/"/g, '\\"')}"]`);
        }

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const hlId = targetElementId || event.location;
          setHighlightId(hlId); 
          setTimeout(() => setHighlightId(null), 2000);
        }
      }, 100);
    }
  }, [selection, events]);

  if (pendingCount === 0 && ignoredCount === 0) return null;

  const handleStartEditTime = (id: string, current: string) => {
    setEditingTimeId(id);
    setTempTimeVal(current);
  };

  const handleSaveTime = (id: string) => {
    onUpdateEventTime(id, tempTimeVal);
    setEditingTimeId(null);
  };

  const handleAddFormatRule = (timeStr: string) => {
      try {
        const pattern = generateRegexFromTime(timeStr);
        // Clean string to remove brackets for the rule name
        const cleanStr = timeStr.replace(/(\(.*?\)|（.*?）)/g, '').trim();
        if (window.confirm(`是否将格式 "${cleanStr}"\n(自动生成正则: ${pattern})\n添加到合法规则库?`)) {
            onAddFormatRule(`自定义格式: ${cleanStr}`, pattern);
        }
      } catch (e) {
        console.error("Failed to generate regex", e);
        alert("无法自动生成规则，请尝试在‘时间格式’页面手动添加。");
      }
  };

  return (
    <div className="w-[450px] bg-white border-l border-gray-200 flex flex-col h-full sticky top-20 overflow-y-auto shadow-lg rounded-l-xl transition-all duration-300">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
         <button 
           className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${viewMode === 'pending' ? 'text-red-600 border-b-2 border-red-600 bg-red-50' : 'text-gray-500 hover:bg-gray-50'}`}
           onClick={() => setViewMode('pending')}
         >
            待处理 ({pendingCount})
         </button>
         <button 
           className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${viewMode === 'ignored' ? 'text-gray-800 border-b-2 border-gray-600 bg-gray-100' : 'text-gray-500 hover:bg-gray-50'}`}
           onClick={() => setViewMode('ignored')}
         >
            已忽略 ({ignoredCount})
         </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* --- PENDING VIEW --- */}
        {viewMode === 'pending' && (
          <>
            {pendingCount === 0 && (
                <div className="text-center py-10 text-gray-500 text-sm">
                   <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                   所有问题已处理
                </div>
            )}

            {/* Serial Issues */}
            {pendingSerialIssues.length > 0 && (
              <div 
                id="issue-serial-group"
                onClick={() => onSelectIssue?.(pendingSerialIssues[0].id, 'sidebar', 'serial')}
                className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 relative group transition-all duration-500 cursor-pointer ${highlightId === 'issue-serial-group' ? 'ring-2 ring-orange-400 bg-orange-50' : ''}`}
              >
                <div className="flex items-center mb-3 text-orange-600 justify-between">
                  <div className="flex items-center">
                    <ListOrdered className="w-5 h-5 mr-2" />
                    <h4 className="font-bold text-base">序号不连续</h4>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); pendingSerialIssues.forEach(e => onIgnoreError(e.id, 'serial')); }}
                    className="text-xs text-gray-500 hover:text-gray-800 underline decoration-gray-300 underline-offset-2" 
                    title="忽略此类错误"
                  >
                    全部忽略
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">检测到 {pendingSerialIssues.length} 个序号与实际行号不匹配。</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onFixSerial(); }}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-700 text-sm font-semibold rounded-md border border-orange-200 hover:bg-orange-100 transition-colors shadow-sm"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  一键重排序号
                </button>
              </div>
            )}

            {/* Location Issues */}
            {uniqueInvalidLocations.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3 text-red-600">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    <h4 className="font-bold text-base">未知地点 ({uniqueInvalidLocations.length})</h4>
                  </div>
                  <button 
                    onClick={() => uniqueInvalidLocations.forEach(loc => onAddLocationToLibrary(loc))}
                    className="text-xs text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                  >
                    全部入库
                  </button>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {uniqueInvalidLocations.map((loc, idx) => {
                    const recommendation = getRecommendedLocation(loc, locations);
                    const affectedEvents = pendingLocationIssues.filter(e => e.location === loc);
                    
                    return (
                      <div 
                        key={idx} 
                        data-loc-card={loc}
                        onClick={() => affectedEvents.length > 0 && onSelectIssue?.(affectedEvents[0].id, 'sidebar', 'location')}
                        className={`bg-gray-50 p-3 rounded-md text-sm border border-gray-100 shadow-sm transition-all duration-500 cursor-pointer ${highlightId === loc ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                             <span className="font-bold text-gray-800 break-words flex-1 leading-snug" title={loc}>{loc}</span>
                             <div className="flex flex-col gap-2 shrink-0">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onAddLocationToLibrary(loc); }} 
                                  className="px-2 py-1.5 rounded text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 transition-colors flex items-center justify-center shadow-sm w-16" 
                                  title="添加到地址库"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1"/>入库
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); affectedEvents.forEach(e => onIgnoreError(e.id, 'location')); }} 
                                  className="px-2 py-1.5 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors flex items-center justify-center shadow-sm w-16" 
                                  title="忽略"
                                >
                                    <EyeOff className="w-3.5 h-3.5 mr-1"/>忽略
                                </button>
                             </div>
                        </div>
                        {recommendation && (
                           <div className="mt-2 flex items-center justify-between bg-yellow-50 p-2 rounded border border-yellow-100">
                               <div className="flex items-center text-yellow-800 text-xs">
                                  <Lightbulb className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]" title={recommendation}>建议: {recommendation}</span>
                               </div>
                               <button 
                                 onClick={(e) => { 
                                     e.stopPropagation(); 
                                     affectedEvents.forEach(evt => onUpdateEventLocation(evt.id, recommendation));
                                 }}
                                 className="text-yellow-700 text-xs font-bold underline hover:text-yellow-900 ml-2"
                               >
                                 修改
                               </button>
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Time Issues */}
            {pendingTimeIssues.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex items-center mb-3 text-red-600">
                  <Clock className="w-5 h-5 mr-2" />
                  <h4 className="font-bold text-base">时间格式错误 ({pendingTimeIssues.length})</h4>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {pendingTimeIssues.map((item) => {
                    const recommendation = getRecommendedTime(item.time);
                    const isHighlighted = highlightId === `issue-time-card-${item.id}`;
                    
                    // Allow adding if it's explicitly a format mismatch OR if we aren't sure.
                    // If it's a logical error (validationMessage not containing "格式"), we block it.
                    const isFormatError = item.validationMessage && item.validationMessage.includes("格式");
                    // Default to true if message is missing for some reason, to enable the button.
                    const canAddRule = isFormatError || !item.validationMessage;

                    return (
                      <div 
                        key={item.id} 
                        id={`issue-time-card-${item.id}`}
                        onClick={() => onSelectIssue?.(item.id, 'sidebar', 'time')}
                        className={`bg-gray-50 p-3 rounded-md border border-gray-100 shadow-sm transition-all duration-500 cursor-pointer ${isHighlighted ? 'ring-2 ring-red-400 bg-red-50' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col flex-1 mr-2">
                            <span className="text-sm font-bold text-gray-800 break-words leading-snug" title={item.name}>
                                {item.name}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">序号 #{item.serialNo}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           {/* Edit Input Area */}
                           {editingTimeId === item.id ? (
                              <div className="flex gap-1 flex-1">
                                  <input 
                                      autoFocus
                                      type="text" 
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-1 text-xs border border-blue-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                      value={tempTimeVal}
                                      onChange={(e) => setTempTimeVal(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTime(item.id)}
                                  />
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleSaveTime(item.id); }}
                                      className="bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 border border-green-200"
                                  >
                                      <Check className="w-4 h-4" />
                                  </button>
                              </div>
                            ) : (
                              <div 
                                  className="flex-1 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded cursor-pointer border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors flex items-center justify-between group h-9"
                                  onClick={(e) => { e.stopPropagation(); handleStartEditTime(item.id, item.time); }}
                                  title="点击修改"
                              >
                                  <span className="truncate">{item.time}</span>
                                  <Wand2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-red-400" />
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (canAddRule) {
                                          handleAddFormatRule(item.time);
                                      } else {
                                          window.alert("此错误为逻辑错误（如日期不存在），添加格式规则无法解决。");
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center shadow-sm h-9 ${
                                        canAddRule 
                                        ? "text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200" 
                                        : "text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
                                    }`}
                                    title={canAddRule ? "将此格式加入规则库" : "违背常理格式错误，无法入库"}
                                >
                                    <FilePlus className="w-3.5 h-3.5 mr-1" />
                                    入库
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onIgnoreError(item.id, 'time');
                                    }} 
                                    className="px-3 py-1.5 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 transition-colors flex items-center shadow-sm h-9" 
                                    title="忽略此条错误"
                                >
                                    <EyeOff className="w-3.5 h-3.5 mr-1"/>
                                    忽略
                                </button>
                            </div>
                        </div>

                        {/* Validation Error Message */}
                        {item.validationMessage && (
                            <div className="mt-1.5 text-xs text-red-500 flex items-start">
                                <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                <span>{item.validationMessage}</span>
                            </div>
                        )}

                        {recommendation && (
                           <div className="mt-2 flex items-center justify-between bg-yellow-50 p-2 rounded border border-yellow-100">
                               <div className="flex items-center text-yellow-800 text-xs">
                                  <Lightbulb className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]" title={recommendation}>建议: {recommendation}</span>
                                </div>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onUpdateEventTime(item.id, recommendation); }}
                                 className="text-yellow-700 text-xs font-bold underline hover:text-yellow-900 ml-2"
                               >
                                 修改
                               </button>
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Ignored View Content */}
        {viewMode === 'ignored' && (
            <div className="space-y-4">
                 {ignoredCount === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                       暂无忽略的错误
                    </div>
                 )}

                 {ignoredSerialIssues.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                         <div className="flex justify-between items-center text-sm font-medium text-gray-700 mb-2">
                             <span>序号错误 ({ignoredSerialIssues.length})</span>
                             <button onClick={() => ignoredSerialIssues.forEach(e => onRestoreError(e.id, 'serial'))} className="text-blue-600 text-xs flex items-center"><RotateCcw className="w-3 h-3 mr-1"/>恢复</button>
                         </div>
                    </div>
                 )}

                 {ignoredLocationIssues.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                         <h5 className="text-sm font-medium text-gray-700 mb-2">地点错误 ({ignoredLocationIssues.length})</h5>
                         <div className="space-y-2">
                            {ignoredLocationIssues.map(e => (
                                <div key={e.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100">
                                    <span className="truncate flex-1" title={e.location}>{e.location}</span>
                                    <button onClick={() => onRestoreError(e.id, 'location')} className="text-blue-600 hover:text-blue-800 ml-2"><RotateCcw className="w-3 h-3"/></button>
                                </div>
                            ))}
                         </div>
                    </div>
                 )}

                 {ignoredTimeIssues.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                         <h5 className="text-sm font-medium text-gray-700 mb-2">时间错误 ({ignoredTimeIssues.length})</h5>
                         <div className="space-y-2">
                            {ignoredTimeIssues.map(e => (
                                <div key={e.id} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-gray-100">
                                    <div className="flex flex-col truncate flex-1">
                                       <span className="font-medium">{e.name}</span>
                                       <span className="text-gray-500">{e.time}</span>
                                    </div>
                                    <button onClick={() => onRestoreError(e.id, 'time')} className="text-blue-600 hover:text-blue-800 ml-2"><RotateCcw className="w-3 h-3"/></button>
                                </div>
                            ))}
                         </div>
                    </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
};