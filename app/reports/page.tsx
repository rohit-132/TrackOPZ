'use client';
import React, { useState, useEffect } from 'react';
import { Menu, Download, ChevronDown } from 'lucide-react';
import Sidebar from '../../components/sidebarm';

// Type definitions
type ReportType = 'Date Wise' | 'Weekly' | 'Monthly' | 'Process Wise' | 'Date-wise All Machines';

interface RecentDownload {
  id: number;
  reportName: string;
  downloadedAt: string;
}

interface CustomDropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('Date Wise');
  const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState<boolean>(false);
  
  // Date state for different report types
  const [dateWiseStartDate, setDateWiseStartDate] = useState<string>('');
  const [dateWiseEndDate, setDateWiseEndDate] = useState<string>('');
  const [weeklyDate, setWeeklyDate] = useState<string>('');
  const [monthlyDate, setMonthlyDate] = useState<string>('');
  
  // Recent downloads state
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState<boolean>(false);

  // Add 'Process Wise' to the reportTypes array
  const reportTypes: ReportType[] = ['Date Wise', 'Weekly', 'Monthly', 'Process Wise', 'Date-wise All Machines'];

  // Add state for process-wise selection
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [processList, setProcessList] = useState<string[]>([]);
  const [processStartDate, setProcessStartDate] = useState<string>('');
  const [processEndDate, setProcessEndDate] = useState<string>('');

  // Add state for date-wise all machines report
  const [dateWiseAllMachinesDate, setDateWiseAllMachinesDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Fetch available operation types for dropdown (on mount)
  useEffect(() => {
    async function fetchMachines() {
      try {
        const res = await fetch('/api/machines');
        if (res.ok) {
          const data = await res.json();
          // Use all machine names directly, but only the base name before any #, and unique
          const opTypes = Array.from(new Set((data.machines || []).map((machine: any) => machine.name.split('#')[0].trim()))) as string[];
          setProcessList(opTypes);
        }
      } catch {}
    }
    fetchMachines();
  }, []);

  // Fetch recent downloads
  const fetchRecentDownloads = async (): Promise<void> => {
    try {
      setLoadingDownloads(true);
      const response = await fetch('/api/reports/history?limit=5');
      if (response.ok) {
        const data = await response.json();
        setRecentDownloads(data.downloads);
      } else {
        console.error('Failed to fetch recent downloads');
      }
    } catch (error) {
      console.error('Error fetching recent downloads:', error);
    } finally {
      setLoadingDownloads(false);
    }
  };

  // Fetch recent downloads on component mount
  useEffect(() => {
    fetchRecentDownloads();
  }, []);

  const handleMenuClick = (): void => {
    setSidebarOpen(true);
  };

  const handleDownload = async (): Promise<void> => {
    try {
      // Validate date selections based on report type
      switch (selectedReportType) {
        case 'Date Wise':
          if (!dateWiseStartDate || !dateWiseEndDate) {
            alert('Please select both start and end dates for Date Wise report');
            return;
          }
          break;
        case 'Weekly':
          if (!weeklyDate) {
            alert('Please select a week for Weekly report');
            return;
          }
          break;
        case 'Monthly':
          if (!monthlyDate) {
            alert('Please select a month for Monthly report');
            return;
          }
          break;
        case 'Process Wise':
          if (!selectedProcess || !processStartDate || !processEndDate) {
            alert('Please select process and date range for Process Wise report');
            return;
          }
          break;
        case 'Date-wise All Machines':
          if (!dateWiseAllMachinesDate) {
            alert('Please select a date for Date-wise All Machines report');
            return;
          }
          break;
      }

      // Map frontend report types to API report types
      let reportType: string;
      switch (selectedReportType) {
        case 'Date Wise':
          reportType = 'daily';
          break;
        case 'Weekly':
          reportType = 'weekly';
          break;
        case 'Monthly':
          reportType = 'monthly';
          break;
        case 'Process Wise':
          reportType = 'processWise';
          break;
        case 'Date-wise All Machines':
          reportType = 'dateWiseAllMachines';
          break;
        default:
          reportType = 'daily';
      }

      // Create download URL with date parameters
      let downloadUrl = `/api/reports/download?reportType=${reportType}`;
      
      // Add date parameters based on report type
      switch (selectedReportType) {
        case 'Date Wise':
          downloadUrl += `&startDate=${dateWiseStartDate}&endDate=${dateWiseEndDate}`;
          break;
        case 'Weekly':
          if (weeklyDate) {
            const [year, week] = weeklyDate.split('-W');
            const firstDayOfYear = new Date(Number(year), 0, 1);
            const dayOfWeek = firstDayOfYear.getDay();
            const firstMondayOffset = (dayOfWeek <= 1) ? (1 - dayOfWeek) : (8 - dayOfWeek);
            const weekStart = new Date(Number(year), 0, 1 + firstMondayOffset + (Number(week) - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            downloadUrl += `&startDate=${weekStart.toISOString().split('T')[0]}&endDate=${weekEnd.toISOString().split('T')[0]}`;
          }
          break;
        case 'Monthly':
          const monthStart = new Date(monthlyDate + '-01');
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
          downloadUrl += `&startDate=${monthStart.toISOString().split('T')[0]}&endDate=${monthEnd.toISOString().split('T')[0]}`;
          break;
        case 'Process Wise':
          downloadUrl += `&process=${encodeURIComponent(selectedProcess)}&startDate=${processStartDate}&endDate=${processEndDate}`;
          break;
        case 'Date-wise All Machines':
          downloadUrl += `&date=${dateWiseAllMachinesDate}`;
          break;
      }

      // Improved download logic: fetch first, check status, then download
      const response = await fetch(downloadUrl);
      if (response.status !== 200) {
        let errorMsg = 'Failed to download report.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) errorMsg = errorData.error;
        } catch {}
        alert(errorMsg);
        return;
      }
      const blob = await response.blob();
      // Get filename from Content-Disposition header if present
      let filename = `${selectedReportType} Report.xlsx`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Refresh recent downloads after successful download
      setTimeout(() => {
        fetchRecentDownloads();
      }, 1000);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Add handler for viewing process wise report
  // const handleViewProcessWiseReport = async () => {
  //   setProcessWiseLoading(true);
  //   setProcessWiseError(null);
  //   setProcessWiseData([]);
  //   try {
  //     if (!selectedProcess || !processStartDate || !processEndDate) {
  //       setProcessWiseError('Please select process and date range for Process Wise report');
  //       setProcessWiseLoading(false);
  //       return;
  //     }
  //     const url = `/api/reports/operation-wise-grouped?process=${encodeURIComponent(selectedProcess)}&startDate=${processStartDate}&endDate=${processEndDate}`;
  //     const res = await fetch(url);
  //     const json = await res.json();
  //     if (!json.success) {
  //       setProcessWiseError(json.error || 'Failed to fetch report');
  //       setProcessWiseLoading(false);
  //       return;
  //     }
  //     setProcessWiseData(json.data);
  //   } catch (err) {
  //     setProcessWiseError('Failed to fetch report');
  //   } finally {
  //     setProcessWiseLoading(false);
  //   }
  // };

  const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
    value, 
    options, 
    onChange, 
    isOpen, 
    setIsOpen 
  }) => {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        >
          <span className="text-gray-700 text-sm">{value}</span>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 text-gray-700 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderReportSection = () => {
    switch (selectedReportType) {
      case 'Date Wise':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input 
                type="date" 
                id="start-date"
                value={dateWiseStartDate}
                onChange={(e) => setDateWiseStartDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input 
                type="date" 
                id="end-date"
                value={dateWiseEndDate}
                onChange={(e) => setDateWiseEndDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        );
      case 'Weekly':
        return (
          <div>
            <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Week
            </label>
            <input 
              type="week" 
              id="week-select"
              value={weeklyDate}
              onChange={(e) => setWeeklyDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
      case 'Monthly':
        return (
          <div>
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <input 
              type="month" 
              id="month-select"
              value={monthlyDate}
              onChange={(e) => setMonthlyDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
      case 'Process Wise':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="process-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Operation/Machine
              </label>
              <select
                id="process-select"
                value={selectedProcess}
                onChange={e => setSelectedProcess(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select Operation/Machine --</option>
                {processList.map((proc) => (
                  <option key={proc} value={proc}>{proc}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="process-start-date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="process-start-date"
                value={processStartDate}
                onChange={e => setProcessStartDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="process-end-date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="process-end-date"
                value={processEndDate}
                onChange={e => setProcessEndDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 mt-4"
              onClick={() => {
                if (!selectedProcess || !processStartDate || !processEndDate) {
                  alert('Please select process and date range for Process Wise report');
                  return;
                }
                const url = `/api/reports/process-wise-export?process=${encodeURIComponent(selectedProcess)}&startDate=${processStartDate}&endDate=${processEndDate}`;
                window.location.href = url;
              }}
              disabled={!selectedProcess || !processStartDate || !processEndDate}
            >
              Download Process Wise Excel
            </button>
          </div>
        );
      case 'Date-wise All Machines':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="date-all-machines" className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                id="date-all-machines"
                value={dateWiseAllMachinesDate}
                onChange={(e) => setDateWiseAllMachinesDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 mt-4"
              onClick={() => {
                if (!dateWiseAllMachinesDate) {
                  alert('Please select a date for Date-wise All Machines report');
                  return;
                }
                const url = `/api/reports/download?reportType=dateWiseAllMachines&date=${dateWiseAllMachinesDate}`;
                window.location.href = url;
              }}
              disabled={!dateWiseAllMachinesDate}
            >
              Download Date-wise All Machines Report
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Component */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        username={null}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleMenuClick}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6 text-blue-700" />
          </button>
          <h1 className="text-lg font-semibold text-blue-700">Reports</h1>
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">A</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Download Reports Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <Download className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-900 uppercase tracking-wide">
                Download Reports
              </h2>
            </div>

            {/* Reports Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Report Selection</h3>
              
              <div className="space-y-4">
                <CustomDropdown
                  value={selectedReportType}
                  options={reportTypes}
                  onChange={(value: string) => setSelectedReportType(value as ReportType)}
                  isOpen={reportTypeDropdownOpen}
                  setIsOpen={setReportTypeDropdownOpen}
                />

                {renderReportSection()}

                {selectedReportType !== 'Process Wise' && selectedReportType !== 'Date-wise All Machines' && (
                  <button
                    onClick={handleDownload}
                    className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 mt-4"
                  >
                    Download Report
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Recent Downloads */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Downloads</h3>
            <div className="space-y-2">
              {loadingDownloads ? (
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-center">
                    <p className="text-sm text-gray-500">Loading recent downloads...</p>
                  </div>
                </div>
              ) : recentDownloads.length > 0 ? (
                recentDownloads.map((download) => (
                  <div key={download.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{download.reportName}</p>
                        <p className="text-xs text-gray-500">
                          Downloaded {new Date(download.downloadedAt).toLocaleString()}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-center">
                    <p className="text-sm text-gray-500">No recent downloads</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}