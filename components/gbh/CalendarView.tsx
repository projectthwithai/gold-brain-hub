import React from 'react';

const CalendarView = () => {
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getWinLoseStatus = (day: number) => {
    const logs = localStorage.getItem('logs');
    if (logs) {
      const log = JSON.parse(logs).find((log: any) => log.day === day);
      if (log) {
        return log.achieved? 'WIN' : 'LOSE';
      }
    }
    // If no data is available, return a sample WIN/LOSE status
    return day % 2 === 0? 'WIN' : 'LOSE';
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => (
        <div key={day} className="flex justify-center items-center h-12 w-12 bg-gray-800 rounded">
          {day}
          {getWinLoseStatus(day) === 'WIN'? (
            <span className="bg-gold-500 text-white px-2 py-1 rounded ml-2">WIN</span>
          ) : (
            <span className="bg-red-500 text-white px-2 py-1 rounded ml-2">LOSE</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default CalendarView;