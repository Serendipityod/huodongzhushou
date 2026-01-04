import { TimeFormatItem, AddressLibraryItem } from './types.ts';

export const INITIAL_TIME_FORMATS: TimeFormatItem[] = [
  { id: '1', name: 'X月X日', pattern: '^\\d{1,2}月\\d{1,2}日$', isSystem: true },
  { id: '2', name: 'X月X日-X月X日', pattern: '^\\d{1,2}月\\d{1,2}日[-\\s]+\\d{1,2}月\\d{1,2}日$', isSystem: true },
  { id: '3', name: 'X月', pattern: '^\\d{1,2}月$', isSystem: true },
  { id: '4', name: 'X月上旬/中旬/下旬', pattern: '^\\d{1,2}月[上中下]旬$', isSystem: true },
  { id: '5', name: '每周固定时间', pattern: '^每周[一二三四五六日、\\s]+\\d{1,2}:\\d{2}-\\d{1,2}:\\d{2}$', isSystem: true },
  { id: '6', name: '多日期(顿号/空格分隔)', pattern: '^\\d{1,2}月\\d{1,2}日([、\\s]+\\d{1,2}月\\d{1,2}日)*$', isSystem: true },
  { id: '7', name: 'X月-X月', pattern: '^\\d{1,2}月-\\d{1,2}月$', isSystem: true },
  { id: '8', name: '全年', pattern: '^全年$', isSystem: true },
  { id: '9', name: 'X年X月X日-X年X月X日', pattern: '^\\d{4}年\\d{1,2}月\\d{1,2}日[-\\s]+\\d{4}年\\d{1,2}月\\d{1,2}日$', isSystem: true },
  { id: '10', name: 'X年X月X日', pattern: '^\\d{4}年\\d{1,2}月\\d{1,2}日$', isSystem: true },
];

// Helper to check if a date logically exists (e.g., Feb 30 is invalid)
// Returns NULL if valid, or a string message if invalid
const checkLogicalValidity = (str: string): string | null => {
  // 1. Extract all potential M-D pairs using a loose regex looking for numbers followed by common separators
  // Matches: 5月1日, 5.1, 5-1, 05/01
  const dates: {m: number, d: number}[] = [];
  const dateRegex = /(\d{1,2})\s*[月\.\/-]\s*(\d{1,2})\s*[日]?/g;
  
  let match;
  // We clone the regex to avoid state issues or just use a loop
  let tempStr = str;
  
  while ((match = dateRegex.exec(tempStr)) !== null) {
     dates.push({ m: parseInt(match[1]), d: parseInt(match[2]) });
  }

  // If no dates found (e.g. "全年", "每周三"), we skip logic validation (assume valid if regex matched)
  if (dates.length === 0) return null;

  // 2. Validate Existence
  const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 29 for Feb to be permissive of leap years
  for (const date of dates) {
      if (date.m < 1 || date.m > 12) return `月份 ${date.m} 无效 (需1-12)`;
      if (date.d < 1 || date.d > daysInMonth[date.m]) return `${date.m}月只有${daysInMonth[date.m]}天，无法设置为${date.d}日`;
  }

  // 3. Validate Range (Start <= End)
  // Only apply this check if the string clearly looks like a range (contains hyphen or '至') and has exactly 2 dates
  if (dates.length === 2 && /[-至]/.test(str)) {
     const start = dates[0];
     const end = dates[1];
     const v1 = start.m * 100 + start.d;
     const v2 = end.m * 100 + end.d;
     
     // Special case: Year crossover (e.g., 12月31日-1月1日) is allowed
     if (start.m === 12 && end.m === 1) return null;
     
     if (v1 > v2) {
       // Check if year is explicitly present to allow v1 > v2 (cross year)
       // If the input is "2024年12月31日-2025年1月5日", logic extracts 12-31 and 1-5.
       // 1231 > 105. It enters the 'Year crossover' check above (start.m === 12 && end.m === 1) -> returns null (VALID).
       // However, for wider ranges like "2024年11月1日-2025年2月1日", the generic check would fail.
       // We ignore the generic M-D range check if we detect years in the string.
       if (/\d{4}年/.test(str)) return null; 

       return "结束时间不能早于开始时间";
     }
  }

  return null;
};

export const validateTimeFormat = (timeStr: string, formats: TimeFormatItem[]): { isValid: boolean, message?: string } => {
  if (!timeStr) return { isValid: false, message: "时间不能为空" };

  // Remove content in brackets (half-width or full-width) for validation purposes
  // e.g. "1月1日(备注)" -> "1月1日"
  const cleanStr = timeStr.replace(/(\(.*?\)|（.*?）)/g, '').trim();

  // Step 1: Format Matching (Regex)
  const isFormatMatch = formats.some(fmt => {
    try {
      const regex = new RegExp(fmt.pattern);
      return regex.test(cleanStr);
    } catch (e) {
      console.warn(`Invalid regex pattern for format ${fmt.name}:`, fmt.pattern);
      return false;
    }
  });

  if (!isFormatMatch) return { isValid: false, message: "格式不符合任何已知规则 (如: X月X日)" };

  // Step 2: Logical Validation (Existence & Range)
  const logicError = checkLogicalValidity(cleanStr);
  if (logicError) return { isValid: false, message: logicError };

  return { isValid: true };
};

export const getRecommendedTime = (input: string): string | null => {
  if (!input) return null;
  
  const cleanInput = input.trim();

  // Pattern: 5.29 -> 5月29日
  if (/^\d{1,2}\.\d{1,2}$/.test(cleanInput)) {
    return cleanInput.replace('.', '月') + '日';
  }

  // Pattern: 5.29-5.30 -> 5月29日-5月30日
  if (/^\d{1,2}\.\d{1,2}-\d{1,2}\.\d{1,2}$/.test(cleanInput)) {
    return cleanInput.replace(/\./g, '月').replace('-', '日-') + '日';
  }

  // Pattern: 2024-05-29 -> 5月29日 (Stripping year)
  const yyyymmdd = cleanInput.match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/);
  if (yyyymmdd) {
    return `${Number(yyyymmdd[2])}月${Number(yyyymmdd[3])}日`;
  }

  // Pattern: 5/29 -> 5月29日
  if (/^\d{1,2}\/\d{1,2}$/.test(cleanInput)) {
    return cleanInput.replace('/', '月') + '日';
  }

  return null;
};

export const getRecommendedLocation = (input: string, library: AddressLibraryItem[]): string | null => {
  if (!input) return null;
  const clean = input.trim();
  
  // 1. Exact contains (Library item contains input)
  // e.g. Input "篮球馆", Library "文化宫篮球馆" -> Recommend "文化宫篮球馆"
  const containerMatch = library.find(item => item.name.includes(clean));
  if (containerMatch) return containerMatch.name;

  // 2. Input contains library item
  // e.g. Input "文化宫篮球馆(备注)", Library "文化宫篮球馆" -> Recommend "文化宫篮球馆"
  const containedMatch = library.find(item => clean.includes(item.name));
  if (containedMatch) return containedMatch.name;

  return null;
}

// Generate a Regex pattern from a sample string
// e.g. "5.1" -> "^\d{1,2}\.\d{1,2}$"
export const generateRegexFromTime = (input: string): string => {
    // 1. Clean brackets first to match validation logic, trimming spaces
    const cleaned = input.replace(/(\(.*?\)|（.*?）)/g, '').trim();

    // 2. Escape special characters
    // We do this BEFORE replacing numbers so we don't escape our own \d later
    let escaped = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // 3. Replace numbers with regex patterns
    // We need to differentiate between years (4 digits) and days/months (1-2 digits)
    // Using a replacer function:
    let pattern = escaped.replace(/\d+/g, (match) => {
        if (match.length === 4) return '\\d{4}'; // Year
        return '\\d{1,2}'; // Month or Day
    });
    
    // 4. Anchor start and end
    return `^${pattern}$`;
};