import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

type Step = 'year' | 'month' | 'day';

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  error,
  label = 'Fecha de Nacimiento',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('year');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const months = [
    { num: '1', name: 'Enero' },
    { num: '2', name: 'Febrero' },
    { num: '3', name: 'Marzo' },
    { num: '4', name: 'Abril' },
    { num: '5', name: 'Mayo' },
    { num: '6', name: 'Junio' },
    { num: '7', name: 'Julio' },
    { num: '8', name: 'Agosto' },
    { num: '9', name: 'Septiembre' },
    { num: '10', name: 'Octubre' },
    { num: '11', name: 'Noviembre' },
    { num: '12', name: 'Diciembre' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1849 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (value) {
      const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = value.match(ddmmyyyyRegex);
      if (match) {
        const [, d, m, y] = match;
        setSelectedDay(d);
        setSelectedMonth(m);
        setSelectedYear(y);
      }
    }
  }, [value]);

  const getDaysInMonth = (monthNum: number, yearNum: number) => {
    return new Date(yearNum, monthNum, 0).getDate();
  };

  const handleOpen = () => {
    setIsOpen(true);
    setStep('year');
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('year');
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setStep('day');
  };

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    const formattedDate = `${day.padStart(2, '0')}/${selectedMonth.padStart(2, '0')}/${selectedYear}`;
    onChange(formattedDate);
    handleClose();
  };

  const handleBack = () => {
    if (step === 'month') {
      setStep('year');
    } else if (step === 'day') {
      setStep('month');
    }
  };

  const displayValue = value || 'Seleccionar fecha';

  const daysInSelectedMonth = selectedMonth && selectedYear
    ? getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear))
    : 31;
  const days = Array.from({ length: daysInSelectedMonth }, (_, i) => (i + 1).toString());

  const getStepTitle = () => {
    switch (step) {
      case 'year':
        return 'Seleccionar Año';
      case 'month':
        return 'Seleccionar Mes';
      case 'day':
        return 'Seleccionar Día';
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={handleOpen}
        className={`w-full px-4 py-3 text-left border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue}
        </span>
        <Calendar className="h-5 w-5 text-gray-400" />
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={handleClose}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scaleIn overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 flex items-center relative">
              {step !== 'year' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="absolute left-4 p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <h3 className="text-lg font-semibold text-gray-900 text-center flex-1">
                {getStepTitle()}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {step === 'year' && (
                <div className="grid grid-cols-3 gap-3">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearSelect(year.toString())}
                      className={`p-4 rounded-xl border-2 font-semibold text-lg transition-all touch-manipulation ${
                        year.toString() === selectedYear
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}

              {step === 'month' && (
                <div className="grid grid-cols-2 gap-3">
                  {months.map((month) => (
                    <button
                      key={month.num}
                      type="button"
                      onClick={() => handleMonthSelect(month.num)}
                      className={`p-4 rounded-xl border-2 font-semibold text-lg transition-all touch-manipulation ${
                        month.num === selectedMonth
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                      }`}
                    >
                      {month.name}
                    </button>
                  ))}
                </div>
              )}

              {step === 'day' && (
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDaySelect(day)}
                      className={`aspect-square p-3 rounded-xl border-2 font-semibold text-base transition-all touch-manipulation ${
                        day === selectedDay
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DatePicker;
