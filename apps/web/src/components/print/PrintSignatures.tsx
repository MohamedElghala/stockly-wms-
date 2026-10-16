'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PrintSignaturesProps {
  preparedBy?: string;
  preparedRole?: string;
  requesterName?: string;
  supervisorName?: string;
  managementName?: string;
  adminName?: string;
  documentTitle?: string;
  footerNotice?: string;
}

export default function PrintSignatures({ 
  preparedBy, 
  preparedRole,
  requesterName,
  supervisorName,
  managementName,
  adminName,
  documentTitle,
  footerNotice
}: PrintSignaturesProps) {
  const { userData } = useAuth();
  const userName = requesterName || preparedBy || userData?.name || 'الفني / مقدم الطلب';
  const userJob = preparedRole || (userData?.jobTitle ? userData.jobTitle : 'المستلم / طالب الصرف');

  // Dynamic footer notice according to document type
  const dynamicNotice = footerNotice || (documentTitle 
    ? `Stockly WMS - مستند رسمي معتمد: ${documentTitle}`
    : 'Stockly WMS - مستند رسمي معتمد من منظومة ستوكلي لإدارة المستودعات والتشغيل الذكي');

  return (
    <div className="print-signatures-container" style={{ direction: 'rtl', marginTop: '2rem', pageBreakInside: 'avoid' }}>
      <div 
        className="print-signatures-grid" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          direction: 'rtl',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px 14px',
          background: '#f8fafc',
          gap: '12px'
        }}
      >
        
        {/* 1. الطرف الأول: الفني / المهندس المستلم / مقدم الطلب (أقصى اليمين) */}
        <div className="print-signature-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '85px' }}>
          <span className="print-sign-role" style={{ fontSize: '8.5pt', fontWeight: 800, color: '#099A75', marginBottom: '4px', display: 'block' }}>
            الفني / المستلم
          </span>
          <span className="print-sign-name" style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#1e293b' }}>
            {userName}
          </span>
          <span className="print-sign-title" style={{ fontSize: '7.5pt', color: '#64748b', marginBottom: '8px' }}>
            {userJob} {requesterName ? '- (تم الاستلام)' : ''}
          </span>
          <div className="print-sign-line" style={{ fontSize: '7.5pt', color: '#475569', fontStyle: 'italic', borderTop: '1px dotted #94a3b8', paddingTop: '4px' }}>
            التوقيع: ....................
          </div>
        </div>

        {/* 2. الطرف الثاني: المشرف المسؤول (الوسط الأيمن) */}
        <div className="print-signature-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '85px', borderRight: '1px dashed #cbd5e1', paddingRight: '10px' }}>
          <span className="print-sign-role" style={{ fontSize: '8.5pt', fontWeight: 800, color: '#099A75', marginBottom: '4px', display: 'block' }}>
            المشرف المسؤول
          </span>
          <span className="print-sign-name" style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#1e293b' }}>
            {supervisorName || '....................'}
          </span>
          <span className="print-sign-title" style={{ fontSize: '7.5pt', color: '#64748b', marginBottom: '8px' }}>
            {supervisorName ? '(تم الاعتماد الفني)' : ''}
          </span>
          <div className="print-sign-line" style={{ fontSize: '7.5pt', color: '#475569', fontStyle: 'italic', borderTop: '1px dotted #94a3b8', paddingTop: '4px' }}>
            التوقيع: ....................
          </div>
        </div>

        {/* 3. الطرف الثالث: أمين المخزن (الوسط الأيسر) */}
        <div className="print-signature-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '85px', borderRight: '1px dashed #cbd5e1', paddingRight: '10px' }}>
          <span className="print-sign-role" style={{ fontSize: '8.5pt', fontWeight: 800, color: '#099A75', marginBottom: '4px', display: 'block' }}>
            أمين المخزن
          </span>
          <span className="print-sign-name" style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#1e293b' }}>
            {adminName || (userData?.role === 'admin' ? userData.name : '....................')}
          </span>
          <span className="print-sign-title" style={{ fontSize: '7.5pt', color: '#64748b', marginBottom: '8px' }}>
            {adminName || userData?.role === 'admin' ? '(مسؤول العهدة والصرف)' : ''}
          </span>
          <div className="print-sign-line" style={{ fontSize: '7.5pt', color: '#475569', fontStyle: 'italic', borderTop: '1px dotted #94a3b8', paddingTop: '4px' }}>
            التوقيع: ....................
          </div>
        </div>

        {/* 4. الطرف الرابع والأخير: المهندس المسؤول / مدير إدارة المرافق (أقصى اليسار) */}
        <div className="print-signature-box" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '85px', borderRight: '1px dashed #cbd5e1', paddingRight: '10px' }}>
          <span className="print-sign-role" style={{ fontSize: '8.5pt', fontWeight: 800, color: '#099A75', marginBottom: '4px', display: 'block' }}>
            المهندس المسؤول / الإدارة
          </span>
          <span className="print-sign-name" style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#1e293b' }}>
            {managementName || (userData?.role === 'management' ? userData.name : '....................')}
          </span>
          <span className="print-sign-title" style={{ fontSize: '7.5pt', color: '#64748b', marginBottom: '8px' }}>
            {managementName || userData?.role === 'management' ? '(الاعتماد النهائي)' : ''}
          </span>
          <div className="print-sign-line" style={{ fontSize: '7.5pt', color: '#475569', fontStyle: 'italic', borderTop: '1px dotted #94a3b8', paddingTop: '4px' }}>
            التوقيع: ....................
          </div>
        </div>

      </div>
      
      {/* Dynamic Official Footer Notice */}
      <div className="print-footer-notice" style={{ textAlign: 'center', fontSize: '7.5pt', color: '#64748b', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '6px', direction: 'rtl' }}>
        <span>{dynamicNotice}</span>
      </div>
    </div>
  );
}
