import React, { useState, useRef } from 'react';
import { AppEvent } from '../types';
import { Upload, FileSpreadsheet, Image as ImageIcon, CheckCircle, AlertCircle, XCircle, Loader2, Sparkles, ArrowRightLeft, FileWarning } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";

interface PosterValidatorProps {
  onImportExcel?: (data: any[]) => void;
}

interface ValidationResult {
  serial: string;
  excelEvent: AppEvent | null;
  posterEvent: Partial<AppEvent> | null;
  status: 'match' | 'mismatch' | 'missing_in_poster' | 'extra_in_poster';
  diffs: {
    name: boolean;
    time: boolean;
    location: boolean;
  };
}

export const PosterValidator: React.FC<PosterValidatorProps> = () => {
  // --- State ---
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<AppEvent[]>([]);
  const [posterData, setPosterData] = useState<Partial<AppEvent>[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[];
        
        // Simple parser similar to App.tsx but simplified for local state
        const events: AppEvent[] = [];
        // Attempt to find header row
        let startRow = 1;
        // Naive assumption: Row 0 is header, Row 1+ is data. 
        // Or if user uploads data without header, we might miss it. 
        // Let's use the same logic as App.tsx roughly: Look for "序号"
        const headerIndex = data.findIndex(row => 
            Array.isArray(row) && row.some(cell => String(cell).includes('序号'))
        );
        if (headerIndex !== -1) startRow = headerIndex + 1;

        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row) || row.length < 2) continue;
            // Assuming simplified columns for verification: Serial, Name, Time, Location
            // We'll try to map based on header if possible, or fallback to 0,1,2,3
            // For now, let's just grab the first 4 non-empty cols or standard indices
            const serial = String(row[0] || '').trim();
            const name = String(row[1] || '').trim();
            const time = String(row[2] || '').trim();
            const location = String(row[3] || '').trim();
            
            if (name) {
                events.push({
                    id: Math.random().toString(),
                    serialNo: serial,
                    name,
                    time,
                    location,
                    isTimeValid: true,
                    isLocationValid: true
                });
            }
        }
        setExcelData(events);
        setValidationResults(null); // Reset results on new data
      } catch (err) {
        alert("Excel 解析失败");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 4MB roughly to be safe with base64)
    if (file.size > 5 * 1024 * 1024) {
        alert("图片大小请小于 5MB");
        return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setPosterImage(result);
      setPosterData([]); // Reset previous AI data
      setValidationResults(null);
    };
    reader.readAsDataURL(file);
  };

  // --- AI Logic ---

  const analyzePoster = async () => {
    if (!posterImage) return;
    if (!process.env.API_KEY) {
        alert("API Key 未配置 (process.env.API_KEY)");
        return;
    }

    setIsAnalyzing(true);
    setStatusMessage('正在连接 AI 模型解析海报内容...');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Extract base64 data
        const base64Data = posterImage.split(',')[1];
        const mimeType = posterImage.substring(posterImage.indexOf(':') + 1, posterImage.indexOf(';'));

        setStatusMessage('AI 正在识别图片中的表格数据...');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', 
            contents: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                },
                {
                    text: `请识别这张图片中的活动计划表格。提取每一行数据，包含以下字段：
                    - serialNo (序号，字符串)
                    - name (活动名称，字符串)
                    - time (时间，字符串，保持原样)
                    - location (地点，字符串，保持原样)
                    
                    如果某个字段在图片中看不清或不存在，请留空。
                    请返回标准的 JSON 数组格式。`
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            serialNo: { type: Type.STRING },
                            name: { type: Type.STRING },
                            time: { type: Type.STRING },
                            location: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("AI 返回为空");

        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
            // Normalize parsed data
            const cleanedPosterData = parsed.map(item => ({
                serialNo: String(item.serialNo || '').trim(),
                name: String(item.name || '').trim(),
                time: String(item.time || '').trim(),
                location: String(item.location || '').trim()
            }));
            setPosterData(cleanedPosterData);
            setStatusMessage('解析完成，正在比对...');
            performValidation(excelData, cleanedPosterData);
        }

    } catch (e) {
        console.error(e);
        alert("AI 解析失败，请重试或检查图片清晰度。");
        setStatusMessage('');
    } finally {
        setIsAnalyzing(false);
    }
  };

  // --- Comparison Logic ---

  const performValidation = (excel: AppEvent[], poster: Partial<AppEvent>[]) => {
      const results: ValidationResult[] = [];
      const posterUsed = new Set<number>(); // Track indices of poster items used

      // 1. Iterate Excel (Ground Truth)
      excel.forEach(exItem => {
          // Try exact match by serial
          let pIndex = poster.findIndex((p, idx) => !posterUsed.has(idx) && p.serialNo === exItem.serialNo);
          
          // If no serial match, try loose name match
          if (pIndex === -1) {
              pIndex = poster.findIndex((p, idx) => !posterUsed.has(idx) && p.name && exItem.name.includes(p.name));
          }

          if (pIndex !== -1) {
              posterUsed.add(pIndex);
              const pItem = poster[pIndex];
              
              // Compare fields
              const diffName = pItem.name !== exItem.name;
              // Loose comparison for time/location (ignore spaces)
              const diffTime = pItem.time?.replace(/\s/g, '') !== exItem.time.replace(/\s/g, '');
              const diffLoc = pItem.location?.replace(/\s/g, '') !== exItem.location.replace(/\s/g, '');

              const isMatch = !diffName && !diffTime && !diffLoc;

              results.push({
                  serial: exItem.serialNo,
                  excelEvent: exItem,
                  posterEvent: pItem,
                  status: isMatch ? 'match' : 'mismatch',
                  diffs: { name: diffName, time: diffTime, location: diffLoc }
              });
          } else {
              results.push({
                  serial: exItem.serialNo,
                  excelEvent: exItem,
                  posterEvent: null,
                  status: 'missing_in_poster',
                  diffs: { name: true, time: true, location: true }
              });
          }
      });

      // 2. Check for Extra items in Poster
      poster.forEach((pItem, idx) => {
          if (!posterUsed.has(idx)) {
              results.push({
                  serial: pItem.serialNo || '?',
                  excelEvent: null,
                  posterEvent: pItem,
                  status: 'extra_in_poster',
                  diffs: { name: true, time: true, location: true }
              });
          }
      });

      // Sort by serial usually helps
      results.sort((a, b) => {
         const sa = parseFloat(a.serial) || 9999;
         const sb = parseFloat(b.serial) || 9999;
         return sa - sb;
      });

      setValidationResults(results);
      setStatusMessage('');
  };

  return (
    <div className="flex flex-col h-full gap-6">
       
       {/* Top: Controls */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           
           {/* Upload 1: Poster */}
           <div className="lg:col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                   <ImageIcon className="w-5 h-5 mr-2 text-indigo-600"/>
                   1. 上传活动海报
               </h3>
               
               {posterImage ? (
                   <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden group min-h-[200px]">
                       <img src={posterImage} alt="Poster" className="w-full h-full object-contain" />
                       <button 
                         onClick={() => { setPosterImage(null); setValidationResults(null); }}
                         className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                           <XCircle className="w-5 h-5" />
                       </button>
                   </div>
               ) : (
                   <div 
                     onClick={() => imageInputRef.current?.click()}
                     className="flex-1 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors flex flex-col items-center justify-center cursor-pointer min-h-[200px]"
                   >
                       <Upload className="w-8 h-8 text-gray-400 mb-2" />
                       <span className="text-sm text-gray-500">点击上传图片 (JPG/PNG)</span>
                   </div>
               )}
               <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
           </div>

           {/* Upload 2: Excel */}
           <div className="lg:col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                   <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600"/>
                   2. 上传对照表格
               </h3>
               
               {excelData.length > 0 ? (
                   <div className="flex-1 bg-green-50 rounded-lg border border-green-100 p-4 flex flex-col items-center justify-center relative min-h-[200px]">
                       <FileSpreadsheet className="w-12 h-12 text-green-500 mb-2" />
                       <p className="text-green-800 font-medium">已加载 {excelData.length} 条数据</p>
                       <p className="text-xs text-green-600 mt-1">文件解析成功</p>
                       <button 
                         onClick={() => { setExcelData([]); setValidationResults(null); }}
                         className="absolute top-2 right-2 text-green-700 hover:text-green-900"
                       >
                           <XCircle className="w-5 h-5" />
                       </button>
                   </div>
               ) : (
                   <div 
                     onClick={() => excelInputRef.current?.click()}
                     className="flex-1 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-green-50 hover:border-green-300 transition-colors flex flex-col items-center justify-center cursor-pointer min-h-[200px]"
                   >
                       <Upload className="w-8 h-8 text-gray-400 mb-2" />
                       <span className="text-sm text-gray-500">点击上传 Excel 对照表</span>
                   </div>
               )}
               <input ref={excelInputRef} type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
           </div>

           {/* Action: Analyze */}
           <div className="lg:col-span-4 flex flex-col justify-center items-center p-5">
               <button
                  disabled={!posterImage || excelData.length === 0 || isAnalyzing}
                  onClick={analyzePoster}
                  className={`w-full max-w-xs py-4 rounded-xl shadow-lg flex items-center justify-center text-lg font-bold transition-all transform hover:-translate-y-1 ${
                      (!posterImage || excelData.length === 0) 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-200'
                  }`}
               >
                   {isAnalyzing ? (
                       <>
                         <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                         {statusMessage || 'AI 分析中...'}
                       </>
                   ) : (
                       <>
                         <Sparkles className="w-6 h-6 mr-2" />
                         开始智能比对
                       </>
                   )}
               </button>
               {!isAnalyzing && validationResults && (
                   <div className="mt-4 text-center">
                       <p className="text-sm text-gray-500">比对完成</p>
                       <p className="text-2xl font-bold text-gray-800">
                           {validationResults.filter(r => r.status === 'match').length} / {validationResults.length} 一致
                       </p>
                   </div>
               )}
           </div>
       </div>

       {/* Bottom: Results */}
       {validationResults && (
           <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                   <h3 className="font-bold text-gray-800">比对结果详情</h3>
                   <div className="flex gap-4 text-xs">
                       <span className="flex items-center"><CheckCircle className="w-3 h-3 text-green-500 mr-1"/> 一致</span>
                       <span className="flex items-center"><XCircle className="w-3 h-3 text-red-500 mr-1"/> 不一致</span>
                       <span className="flex items-center"><AlertCircle className="w-3 h-3 text-orange-500 mr-1"/> 缺失/多余</span>
                   </div>
               </div>
               
               <div className="overflow-auto flex-1">
                   <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50 sticky top-0 z-10">
                           <tr>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">状态</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">序号</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[30%]">活动名称 (对照表 vs 海报)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[25%]">时间 (对照表 vs 海报)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[25%]">地点 (对照表 vs 海报)</th>
                           </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200 text-sm">
                           {validationResults.map((res, idx) => (
                               <tr key={idx} className={`hover:bg-gray-50 ${res.status !== 'match' ? 'bg-red-50/30' : ''}`}>
                                   <td className="px-4 py-4 whitespace-nowrap">
                                       {res.status === 'match' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                       {res.status === 'mismatch' && <XCircle className="w-5 h-5 text-red-500" />}
                                       {res.status === 'missing_in_poster' && (
                                            <span title="海报中缺失">
                                                <FileWarning className="w-5 h-5 text-orange-500" />
                                            </span>
                                       )}
                                       {res.status === 'extra_in_poster' && (
                                            <span title="海报中多余">
                                                <AlertCircle className="w-5 h-5 text-blue-500" />
                                            </span>
                                       )}
                                   </td>
                                   <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                                       {res.serial}
                                   </td>
                                   
                                   {/* Name Col */}
                                   <td className="px-4 py-4 align-top">
                                       {res.status === 'extra_in_poster' ? (
                                           <div className="text-blue-600">+ {res.posterEvent?.name}</div>
                                       ) : res.status === 'missing_in_poster' ? (
                                           <div className="text-gray-400 line-through decoration-orange-500 decoration-2">{res.excelEvent?.name}</div>
                                       ) : (
                                           <div className="flex flex-col gap-1">
                                               <div className="text-gray-900">{res.excelEvent?.name}</div>
                                               {res.diffs.name && (
                                                   <div className="text-red-600 text-xs bg-red-50 p-1 rounded flex items-center">
                                                       <ArrowRightLeft className="w-3 h-3 mr-1"/> {res.posterEvent?.name || '(空)'}
                                                   </div>
                                               )}
                                           </div>
                                       )}
                                   </td>

                                   {/* Time Col */}
                                   <td className="px-4 py-4 align-top">
                                       {res.status === 'extra_in_poster' ? (
                                           <div className="text-blue-600">{res.posterEvent?.time}</div>
                                       ) : res.status === 'missing_in_poster' ? (
                                            <div className="text-gray-400">{res.excelEvent?.time}</div>
                                       ) : (
                                            <div className="flex flex-col gap-1">
                                                <div className="text-gray-900">{res.excelEvent?.time}</div>
                                                {res.diffs.time && (
                                                    <div className="text-red-600 text-xs bg-red-50 p-1 rounded flex items-center">
                                                        <ArrowRightLeft className="w-3 h-3 mr-1"/> {res.posterEvent?.time || '(空)'}
                                                    </div>
                                                )}
                                            </div>
                                       )}
                                   </td>

                                   {/* Location Col */}
                                   <td className="px-4 py-4 align-top">
                                        {res.status === 'extra_in_poster' ? (
                                           <div className="text-blue-600">{res.posterEvent?.location}</div>
                                       ) : res.status === 'missing_in_poster' ? (
                                            <div className="text-gray-400">{res.excelEvent?.location}</div>
                                       ) : (
                                            <div className="flex flex-col gap-1">
                                                <div className="text-gray-900">{res.excelEvent?.location}</div>
                                                {res.diffs.location && (
                                                    <div className="text-red-600 text-xs bg-red-50 p-1 rounded flex items-center">
                                                        <ArrowRightLeft className="w-3 h-3 mr-1"/> {res.posterEvent?.location || '(空)'}
                                                    </div>
                                                )}
                                            </div>
                                       )}
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
       )}
    </div>
  );
};