// src/components/Station/StationHeader.tsx
import React from "react";

const StationHeader: React.FC = () => {
  return (
    <div className="flex justify-between items-center mb-6">
      {/* Search Input */}
      <div className="relative w-3/4">
        <svg
          className="absolute left-4 top-3.5 text-gray-400"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="w-full pl-12 pr-4 py-3 rounded-full bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          placeholder="Search station..."
        />
      </div>

      {/* Add Button */}
      <button className="bg-white text-gray-700 font-bold py-3 px-8 rounded-full shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all">
        Add sensor +
      </button>
    </div>
  );
};

export default StationHeader;
