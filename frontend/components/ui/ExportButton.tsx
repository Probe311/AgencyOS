import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Presentation } from 'lucide-react';
import { Button } from './Button';
import { Dropdown } from './Dropdown';
import { exportToPDF, exportToCSV, exportToExcel, exportToPPT, ExportData } from '../../lib/utils/export';

interface ExportButtonProps {
  data: ExportData | any[];
  filename: string;
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onExport?: (format: 'pdf' | 'csv' | 'excel' | 'ppt') => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  columns?: string[] | Record<string, string>; // Pour CSV/Excel
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  label = 'Exporter',
  variant = 'outline',
  size = 'md',
  onExport,
  showToast,
  columns,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'csv' | 'excel' | 'ppt') => {
    setIsExporting(true);
    try {
      if (format === 'pdf' || format === 'ppt') {
        const exportData = Array.isArray(data) 
          ? { title: filename, data } 
          : data as ExportData;
        
        if (format === 'pdf') {
          await exportToPDF(exportData, `${filename}.pdf`);
        } else {
          await exportToPPT(exportData, `${filename}.pptx`);
        }
      } else {
        if (!Array.isArray(data)) {
          showToast?.('Les exports CSV/Excel nécessitent un tableau de données', 'error');
          return;
        }
        
        if (format === 'csv') {
          await exportToCSV(data, `${filename}.csv`, columns);
        } else {
          await exportToExcel(data, `${filename}.xlsx`, columns);
        }
      }
      
      showToast?.(`Export ${format.toUpperCase()} réussi`, 'success');
      onExport?.(format);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      showToast?.(`Erreur lors de l'export ${format.toUpperCase()}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    {
      label: 'PDF',
      icon: FileText,
      onClick: () => handleExport('pdf'),
    },
    {
      label: 'CSV',
      icon: FileSpreadsheet,
      onClick: () => handleExport('csv'),
    },
    {
      label: 'Excel',
      icon: FileSpreadsheet,
      onClick: () => handleExport('excel'),
    },
    {
      label: 'PowerPoint',
      icon: Presentation,
      onClick: () => handleExport('ppt'),
    },
  ];

  return (
    <Dropdown
      options={exportOptions.map(opt => ({
        value: opt.label.toLowerCase(),
        label: opt.label
      }))}
      onChange={(value) => {
        const option = exportOptions.find(opt => opt.label.toLowerCase() === value);
        option?.onClick();
      }}
      placeholder={label}
    />
  );
};

