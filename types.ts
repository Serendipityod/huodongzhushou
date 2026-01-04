
export interface AppEvent {
  id: string;
  serialNo: string; // Keep as string to preserve original input for validation
  name: string;
  time: string;
  location: string;
  // Validation states
  isLocationValid: boolean;
  isTimeValid: boolean;
  validationMessage?: string;
  // New field for ignored errors
  ignoredErrors?: ('serial' | 'time' | 'location')[];
}

export interface AddressLibraryItem {
  id: string;
  name: string;
}

export interface TimeFormatItem {
  id: string;
  name: string;
  pattern: string; // Regex string
  isSystem?: boolean; // Optional: mark default system formats
}

export type ViewState = 'list' | 'library' | 'time-formats';

export interface SelectionState {
  id: string;
  source: 'table' | 'sidebar';
  field?: 'time' | 'location' | 'serial';
}
