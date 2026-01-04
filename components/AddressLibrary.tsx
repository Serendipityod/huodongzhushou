import React, { useState } from 'react';
import { AddressLibraryItem } from '../types.ts';
import { Plus, Trash2, MapPin } from 'lucide-react';

interface AddressLibraryProps {
  locations: AddressLibraryItem[];
  onAddLocation: (name: string) => void;
  onRemoveLocation: (id: string) => void;
}

export const AddressLibrary: React.FC<AddressLibraryProps> = ({ locations, onAddLocation, onRemoveLocation }) => {
  const [newLocation, setNewLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLocation.trim()) {
      onAddLocation(newLocation.trim());
      setNewLocation('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-6">
        <div className="bg-blue-100 p-2 rounded-lg mr-3">
          <MapPin className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">地址库管理</h2>
          <p className="text-sm text-gray-500">在此维护合法的活动地点。导入数据时将自动核对。</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          placeholder="输入新地址..."
          className="flex-1 rounded-md border-gray-300 shadow-sm border px-4 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        />
        <button
          type="submit"
          disabled={!newLocation.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加地址
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 group hover:border-blue-300 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 truncate mr-2" title={loc.name}>
              {loc.name}
            </span>
            <button
              onClick={() => onRemoveLocation(loc.id)}
              className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {locations.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400 text-sm">
            地址库为空，请添加常用地址。
          </div>
        )}
      </div>
    </div>
  );
};