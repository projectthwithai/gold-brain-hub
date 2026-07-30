import React from 'react';

const AnalyticsCenter = () => {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary stats cards */}
      <div className="flex gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-bold">Total Focus Time</h2>
          <p className="text-3xl">12 hours</p>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-bold">Weekly Wins</h2>
          <p className="text-3xl">5</p>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-bold">Task Completion Rate</h2>
          <p className="text-3xl">80%</p>
        </div>
      </div>

      {/* Bar graph for daily work hours */}
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-lg font-bold">Daily Work Hours</h2>
        <div className="flex gap-2">
          <div className="w-1/7 bg-gray-600 h-12"></div>
          <div className="w-1/7 bg-gray-600 h-10"></div>
          <div className="w-1/7 bg-gray-600 h-8"></div>
          <div className="w-1/7 bg-gray-600 h-12"></div>
          <div className="w-1/7 bg-gray-600 h-10"></div>
          <div className="w-1/7 bg-gray-600 h-8"></div>
          <div className="w-1/7 bg-gray-600 h-12"></div>
        </div>
      </div>

      {/* Progress chart for weekly work hours */}
      <div className="bg-gray-800 p-4 rounded">
        <h2 className="text-lg font-bold">Weekly Work Hours</h2>
        <div className="w-full h-12 bg-gray-600 rounded">
          <div className="h-12 bg-gray-400 rounded" style={{ width: '80%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCenter;