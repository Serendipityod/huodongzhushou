import React, { useState, useEffect } from 'react';
import { AppEvent, AddressLibraryItem, TimeFormatItem, ViewState, SelectionState } from './types.ts';
import { EventList } from './components/EventList.tsx';
import { AddressLibrary } from './components/AddressLibrary.tsx';
import { TimeFormatLibrary } from './components/TimeFormatLibrary.tsx';
import { ImportPanel } from './components/ImportPanel.tsx';
import { IssueSidebar } from './components/IssueSidebar.tsx';
import { validateTimeFormat, INITIAL_TIME_FORMATS } from './constants.ts';
import { LayoutDashboard, Clock, ChevronDown, ChevronUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('list');
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [locations, setLocations] = useState<AddressLibraryItem[]>([]);
  const [timeFormats, setTimeFormats] = useState<TimeFormatItem[]>(INITIAL_TIME_FORMATS);
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(true);
  
  // Track selection with source context to avoid scroll loops
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // Initialize with locations parsed from user provided image
  useEffect(() => {
    if (locations.length === 0) {
      const initialData = [
        "文化宫四楼文化交流中心",
        "线上征集",
        "文化宫球馆",
        "文化宫围棋天地",
        "文化宫职工体适能健身馆",
        "南宁市工人文化宫微信公众号",
        "文化宫三楼多功能厅",
        "交通银行金融中心",
        "文化宫一楼大堂报名点",
        "南宁市红色工运教育体验馆",
        "南宁市职工AI科技教育体验馆",
        "各基层工会",
        "南宁市各中小学",
        "文化宫职工广场"
      ];
      
      setLocations(initialData.map(name => ({
        id: Math.random().toString(36).substr(2, 9),
        name
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation Helper
  const validateEvent = (event: Omit<AppEvent, 'id' | 'isLocationValid' | 'isTimeValid' | 'ignoredErrors'> & { id?: string, ignoredErrors?: any[] }): AppEvent => {
    // Pass the current timeFormats state to the validation function
    const timeValidation = validateTimeFormat(event.time, timeFormats);
    // Exact match check for location
    const isLocationValid = locations.some(loc => loc.name === event.location.trim());
    
    return {
      ...event,
      id: event.id || Math.random().toString(36).substr(2, 9),
      isTimeValid: timeValidation.isValid,
      validationMessage: timeValidation.message,
      isLocationValid,
      ignoredErrors: event.ignoredErrors || []
    };
  };

  // Re-validate all events when location library OR time formats change
  useEffect(() => {
    setEvents(prevEvents => prevEvents.map(evt => {
       const isLocationValid = locations.some(loc => loc.name === evt.location.trim());
       const timeValidation = validateTimeFormat(evt.time, timeFormats);
       return { 
           ...evt, 
           isLocationValid, 
           isTimeValid: timeValidation.isValid,
           validationMessage: timeValidation.message 
       };
    }));
  }, [locations, timeFormats]);

  const addTimeFormat = (name: string, pattern: string) => {
    setTimeFormats(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name,
      pattern
    }]);
  };

  const removeTimeFormat = (id: string) => {
    setTimeFormats(prev => prev.filter(t => t.id !== id));
  };

  // --- Handlers ---
  const handleUpdateEvent = (id: string, field: keyof AppEvent, value: string) => {
     setEvents(prev => prev.map(evt => {
        if (evt.id !== id) return evt;
        const updated = { ...evt, [field]: value };
        // If field affects validation, re-validate
        if (field === 'time') {
            const result = validateTimeFormat(value, timeFormats);
            updated.isTimeValid = result.isValid;
            updated.validationMessage = result.message;
        }
        if (field === 'location') updated.isLocationValid = locations.some(l => l.name === value.trim());
        
        return updated;
     }));
  };

  const updateEventTime = (id: string, newTime: string) => {
     handleUpdateEvent(id, 'time', newTime);
  };
  
  const updateEventLocation = (id: string, newLocation: string) => {
     handleUpdateEvent(id, 'location', newLocation);
  };

  const fixSerialNumbers = () => {
    setEvents(prev => prev.map((evt, index) => ({
      ...evt,
      serialNo: String(index + 1)
    })));
  };

  const handleIgnoreError = (id: string, type: 'serial' | 'time' | 'location') => {
      setEvents(prev => prev.map(evt => {
          if (evt.id !== id) return evt;
          const currentIgnored = evt.ignoredErrors || [];
          if (currentIgnored.includes(type)) return evt;
          return { ...evt, ignoredErrors: [...currentIgnored, type] };
      }));
  };

  const handleRestoreError = (id: string, type: 'serial' | 'time' | 'location') => {
      setEvents(prev => prev.map(evt => {
          if (evt.id !== id) return evt;
          const currentIgnored = evt.ignoredErrors || [];
          return { ...evt, ignoredErrors: currentIgnored.filter(t => t !== type) };
      }));
  };

  const addLocation = (name: string) => {
    if (locations.some(l => l.name === name)) return;
    setLocations(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name }]);
  };

  const removeLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  const handleExcelImport = (rawData: any[]) => {
    // Check if data exists and confirm replacement
    if (events.length > 0) {
        const confirmed = window.confirm("当前页面存在已有数据，继续导入将删除已有数据按最新的文件内容重新导入");
        if (!confirmed) {
            return;
        }
    }

    const importedEvents: AppEvent[] = [];
    
    let bestHeaderRowIndex = -1;
    let maxScore = 0;
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      let score = 0;
      const rowStr = row.map(c => String(c).trim().replace(/\s+/g, ''));
      if (rowStr.some(s => s.includes('序号'))) score += 10;
      if (rowStr.some(s => (s.includes('名称') || s.includes('活动') || s.includes('内容')) && !s.includes('时间') && !s.includes('地点'))) score += 10;
      if (rowStr.some(s => s.includes('时间') || s.includes('日期'))) score += 10;
      if (rowStr.some(s => s.includes('地点') || s.includes('地址') || s.includes('场馆'))) score += 10;
      if (score > maxScore) { maxScore = score; bestHeaderRowIndex = i; }
    }

    let colMap = { serial: -1, name: -1, time: -1, location: -1 };
    if (bestHeaderRowIndex !== -1) {
       const row = rawData[bestHeaderRowIndex];
       const rowStr = row.map((c: any) => String(c).trim().replace(/\s+/g, ''));
       rowStr.forEach((cell: string, idx: number) => {
          if (/序号/.test(cell)) colMap.serial = idx;
          if (/名称|活动|内容|项目/.test(cell) && !/时间|日期|地点|地址|场馆/.test(cell)) colMap.name = idx;
          if (/时间|日期/.test(cell)) colMap.time = idx;
          if (/地点|地址|场馆/.test(cell)) colMap.location = idx;
       });
       if (colMap.name !== -1) {
          if (colMap.time === -1) colMap.time = colMap.name + 1;
          if (colMap.location === -1) colMap.location = colMap.name + 2;
       } else if (colMap.serial !== -1) {
           colMap.name = colMap.serial + 1;
           colMap.time = colMap.serial + 2;
           colMap.location = colMap.serial + 3;
       }
    } else {
       let looksLikeSerial = false;
       if (rawData.length > 1) {
          const firstCell = rawData[0][0];
          if (!isNaN(Number(firstCell))) looksLikeSerial = true;
       }
       if (looksLikeSerial) colMap = { serial: 0, name: 1, time: 2, location: 3 };
       else colMap = { serial: -1, name: 0, time: 1, location: 2 };
    }

    const startRow = bestHeaderRowIndex === -1 ? 0 : bestHeaderRowIndex + 1;
    for (let i = startRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;
        const getVal = (idx: number) => idx >= 0 && idx < row.length ? String(row[idx] || '').trim() : '';
        const getTime = (idx: number) => {
            if (idx < 0 || idx >= row.length) return '';
            let val = row[idx];
            if (typeof val === 'number' && val > 30000) {
                 const dateObj = new Date((val - 25569) * 86400 * 1000);
                 if (!isNaN(dateObj.getTime())) {
                    val = `${dateObj.getUTCMonth() + 1}月${dateObj.getUTCDate()}日`;
                 }
            }
            return String(val || '').trim();
        };

        const serialNo = getVal(colMap.serial);
        const name = getVal(colMap.name);
        const time = getTime(colMap.time);
        const location = getVal(colMap.location);

        if (name) {
            // Use importedEvents.length for serial generation because we are replacing the old list
            importedEvents.push(validateEvent({ 
              serialNo: serialNo || String(importedEvents.length + 1), 
              name, 
              time, 
              location 
            }));
        }
    }

    if (importedEvents.length > 0) {
      setEvents(importedEvents); // Replace logic
      alert(`成功导入 ${importedEvents.length} 条数据`);
    } else {
      alert('未识别到有效数据。请确保Excel格式正确。');
    }
  };

  const exportExcel = () => {
    if (events.length === 0) {
        alert('没有数据可导出');
        return;
    }
    const ws = XLSX.utils.json_to_sheet(events.map(e => ({
      '序号': e.serialNo,
      '活动名称': e.name,
      '时间': e.time,
      '地点': e.location
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "活动列表");
    XLSX.writeFile(wb, "校验后活动数据.xlsx");
  };

  // Determine if we should show the sidebar
  // Show if there are pending issues OR ignored issues (so user can restore them)
  const hasIssues = events.some(e => {
      const serialWrong = e.serialNo !== String(events.indexOf(e) + 1);
      const timeWrong = !e.isTimeValid;
      const locWrong = !e.isLocationValid;
      return serialWrong || timeWrong || locWrong;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm z-20 sticky top-0">
        <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <LayoutDashboard className="w-8 h-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">活动数据校验助手</span>
            </div>
            <nav className="flex space-x-4 items-center">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                活动管理
              </button>
              <button
                onClick={() => setView('library')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'library' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                地址库
              </button>
              <button
                onClick={() => setView('time-formats')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  view === 'time-formats' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="w-4 h-4 mr-1.5" />
                时间格式
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[95%] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'list' ? (
          <div className="flex gap-6 items-start">
            {/* Left Content: Import & List */}
            <div className={`flex-1 min-w-0 transition-all duration-300 ${hasIssues ? 'max-w-[calc(100%-30rem)]' : 'w-full'}`}>
              <div className="space-y-8">
                {/* Actions Bar: Import Toggle & Export */}
                <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setIsImportPanelOpen(!isImportPanelOpen)}
                      className="flex items-center text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-md border border-gray-300 shadow-sm hover:bg-gray-50"
                    >
                      {isImportPanelOpen ? (
                        <>收起导入面板 <ChevronUp className="w-4 h-4 ml-2" /></>
                      ) : (
                        <>展开导入面板 <ChevronDown className="w-4 h-4 ml-2" /></>
                      )}
                    </button>

                    <button
                        onClick={exportExcel}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700 focus:outline-none"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        导出 Excel
                    </button>
                </div>
                  
                {isImportPanelOpen && (
                  <ImportPanel 
                    timeFormats={timeFormats}
                    onImportExcel={handleExcelImport}
                  />
                )}
                
                <div className="border-t border-gray-200 pt-8">
                  <EventList 
                    events={events} 
                    onDelete={(id) => setEvents(prev => prev.filter(e => e.id !== id))}
                    onClearAll={() => {
                      if (confirm('确定清空所有数据吗?')) setEvents([]);
                    }}
                    onUpdateEvent={handleUpdateEvent}
                    selection={selection}
                    onSelectRow={(id, source, field) => setSelection({ id, source, field })}
                  />
                </div>
              </div>
            </div>

            {/* Right Sidebar: Issues */}
            {hasIssues && (
              <div className="flex-shrink-0 sticky top-24">
                <IssueSidebar 
                  events={events}
                  locations={locations}
                  onFixSerial={fixSerialNumbers}
                  onAddLocationToLibrary={addLocation}
                  onAddFormatRule={addTimeFormat}
                  onUpdateEventTime={updateEventTime}
                  onUpdateEventLocation={updateEventLocation}
                  onIgnoreError={handleIgnoreError}
                  onRestoreError={handleRestoreError}
                  selection={selection}
                  onSelectIssue={(id, source, field) => setSelection({ id, source, field })}
                />
              </div>
            )}
          </div>
        ) : view === 'library' ? (
          <AddressLibrary 
            locations={locations} 
            onAddLocation={addLocation} 
            onRemoveLocation={removeLocation}
          />
        ) : (
          <TimeFormatLibrary
            formats={timeFormats}
            onAddFormat={addTimeFormat}
            onRemoveFormat={removeTimeFormat}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
         <div className="max-w-[95%] mx-auto px-4 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Event Validator. 红色高亮表示格式错误或未知地址。
         </div>
      </footer>
    </div>
  );
};

export default App;