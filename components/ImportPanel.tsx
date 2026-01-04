import React, { useRef } from 'react';
import { TimeFormatItem } from '../types';
import { Upload, FileSpreadsheet, Info, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportPanelProps {
  timeFormats: TimeFormatItem[];
  onImportExcel: (data: any[]) => void;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({ timeFormats, onImportExcel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        // Use readAsArrayBuffer for better encoding handling
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Pre-process data: Convert Date objects to "M月D日" string format
        const processedData = (data as any[]).map(row => {
          if (Array.isArray(row)) {
            return row.map(cell => {
              if (cell instanceof Date && !isNaN(cell.getTime())) {
                // Adjust for local timezone interpretation if needed
                return `${cell.getMonth() + 1}月${cell.getDate()}日`;
              }
              return cell;
            });
          }
          return row;
        });

        if (processedData.length > 0) {
           onImportExcel(processedData);
        }
      } catch (error) {
        console.error("Error reading excel", error);
        alert("Excel 解析失败，请检查文件格式。");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Excel Import Section */}
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <div className="bg-green-100 p-2 rounded-lg mr-3">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Excel 导入</h2>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-600">
            <p className="font-semibold mb-2 flex items-center"><Info className="w-4 h-4 mr-1"/> 导入说明</p>
            <p className="mb-2">请上传 .xlsx 或 .xls 文件。系统将尝试自动识别前三列为：序号、名称、时间、地点。</p>
            <p>如果未包含序号列，系统将自动生成。</p>
          </div>

          <div className="flex justify-center px-6 pt-10 pb-10 border-2 border-gray-300 border-dashed rounded-md hover:border-green-500 transition-colors cursor-pointer bg-gray-50 hover:bg-green-50" 
               onClick={() => fileInputRef.current?.click()}>
            <div className="space-y-2 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none">
                  <span>点击上传文件</span>
                </label>
                <p className="pl-1">或拖拽至此</p>
              </div>
              <p className="text-xs text-gray-500">支持 XLSX, XLS 格式</p>
            </div>
            <input 
              ref={fileInputRef}
              id="file-upload" 
              name="file-upload" 
              type="file" 
              className="sr-only" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
            />
          </div>
      </div>

      {/* Format Cheat Sheet */}
      <div className="bg-white rounded-lg shadow p-6">
         <div className="flex items-center mb-6">
            <div className="bg-yellow-100 p-2 rounded-lg mr-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">支持的时间格式</h2>
         </div>
         
         <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 h-[calc(100%-5rem)] overflow-y-auto">
             <p className="text-sm text-yellow-800 mb-3 font-medium">系统将自动验证导入数据是否符合以下规则：</p>
             <ul className="text-sm text-yellow-700 space-y-2 list-disc list-inside">
                {timeFormats.map((fmt) => (
                    <li key={fmt.id} title={fmt.pattern}>
                        <span className="font-mono">{fmt.name}</span>
                    </li>
                ))}
                <li className="pt-2 border-t border-yellow-200 mt-2 text-yellow-600 italic">注：支持括号内的备注信息，例如 "1月1日(备注)"</li>
             </ul>
         </div>
      </div>
    </div>
  );
};