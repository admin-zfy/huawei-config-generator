import { useState } from 'react';
import { Copy, Download, FileText, FileArchive, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export default function ExportButtons({ config, onToast }) {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!config) return;
    try {
      setCopying(true);
      await navigator.clipboard.writeText(config);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = config;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    onToast?.('已复制到剪贴板');
    setTimeout(() => setCopying(false), 1500);
  };

  const handleExportTxt = () => {
    if (!config) return;
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const filename = `huawei-config-${ts}.txt`;

    // Add BOM for proper Chinese encoding in Notepad
    const bom = '﻿';
    const blob = new Blob([bom + config], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename);
    onToast?.('TXT 文件已导出');
  };

  const handleExportPdf = () => {
    if (!config) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFont('Courier', 'normal');

    // Title
    doc.setFontSize(13);
    doc.setTextColor(0, 180, 216);
    doc.text('Huawei Network Configuration', 10, 14);

    // Separator
    doc.setDrawColor(0, 180, 216);
    doc.setLineWidth(0.3);
    doc.line(10, 17, 200, 17);

    // Config content
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);

    const lines = config.split('\n');
    let y = 24;
    const lineHeight = 3.5;
    const pageHeight = 282;
    const maxWidth = 190;

    for (const line of lines) {
      if (y > pageHeight) {
        doc.addPage();
        y = 14;
      }
      // Wrap long lines
      const display = line.length > 100 ? line.substring(0, 97) + '...' : line;
      doc.text(display, 10, y, { maxWidth });
      y += lineHeight;
    }

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    const pageCount = doc.internal.getNumberOfPages();
    const dateStr = new Date().toLocaleString('zh-CN', { hour12: false });
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Huawei Config Generator | Page ${i}/${pageCount} | ${dateStr}`,
        10, 290
      );
    }

    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');
    doc.save(`huawei-config-${ts}.pdf`);
    onToast?.('PDF 文件已导出');
  };

  const btnCls = "flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a4a] rounded-md text-xs text-gray-400 hover:border-[#00b4d8] hover:text-[#00b4d8] transition-all disabled:opacity-40";

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={handleCopy} disabled={copying || !config} className={btnCls} title="复制配置到剪贴板">
        {copying ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        <span>{copying ? '已复制' : '复制'}</span>
      </button>
      <button onClick={handleExportTxt} disabled={!config} className={btnCls} title="导出为 TXT 文件">
        <FileText size={13} />
        <span>TXT</span>
      </button>
      <button onClick={handleExportPdf} disabled={!config} className={btnCls} title="导出为 PDF 文件">
        <FileArchive size={13} />
        <span>PDF</span>
      </button>
    </div>
  );
}
