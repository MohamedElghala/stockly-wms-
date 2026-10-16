'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ClipboardCheck, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Wrench, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  PackageCheck,
  Building2,
  Calendar,
  X,
  UserCheck,
  Briefcase,
  ShieldCheck,
  Layers,
  FileText,
  Check,
  Eye,
  CheckSquare,
  MapPin,
  Tag,
  Sliders,
  Award,
  ScrollText,
  Stamp,
  BookOpen
} from 'lucide-react';
import { exportToExcel } from '@/lib/excelExport';
import toast from 'react-hot-toast';

interface DisbursementDoc {
  id: string;
  invoiceNo: string;
  date: string;
  department: string;
  destination: string;
  receiver: string;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  notes: string;
  category: string;
  createdAt: number;
}

interface SettlementItem {
  id: string;
  itemName: string;
  invoiceNo: string;
  issuedQty: number;
  installedQty: number;
  returnedQty: number;
  unit: string;
  location: string;
  usageType: string;
  notes: string;
}

interface CustodyItem {
  id: string;
  itemCode: string;
  itemName: string;
  qty: number;
  unit: string;
  condition: string;
  status: string;
  serialNo: string;
  recipient: string;
  departmentOrCompany: string;
  date: string;
  notes: string;
}

type MainTab = 'INSPECTION' | 'RECEIPT' | 'COMPLETION';
type ReceiptSubModel = 'COMPANY_CUSTODY' | 'TECH_CUSTODY' | 'TOOLS_ASSETS' | 'TECHNICAL_INSPECTION';
type FinalApproverRole = 'MAINTENANCE_MANAGER' | 'EXECUTIVE';

interface DepartmentInspectionConfig {
  key: string;
  label: string;
  defaultInspectorRole: string;
  defaultInspectorName: string;
  preamble: string;
  sampleItemsHint: string;
}

const DEPARTMENT_INSPECTION_CONFIGS: Record<string, DepartmentInspectionConfig> = {
  ELECTRICAL: {
    key: 'ELECTRICAL',
    label: 'قسم الكهرباء والإنارة',
    defaultInspectorRole: 'مشرف الكهرباء',
    defaultInspectorName: 'م / محمود متولي',
    preamble: 'تمت المعاينة الفنية والظاهرية لكافة المهمات ومستلزمات الإنارة والكابلات واللوحات والقواطع الموضحة بياناتها بالكشف أدناه، وثبتت مطابقتها التامة للمواصفات القياسية الهندسية للمشروع وأصول الصنعة وخلوها من أي عيوب تصنيع، وتم التصريح بإيداعها بمخازن المشروع.',
    sampleItemsHint: 'كشافات إنارة، كابلات سويدي، لوحات توزيع، قواطع، خلايا ضوئية، تمديدات...'
  },
  PLUMBING: {
    key: 'PLUMBING',
    label: 'قسم السباكة والشبكات',
    defaultInspectorRole: 'مشرف السباكة والشبكات',
    defaultInspectorName: 'مشرف السباكة المعتمد',
    preamble: 'تم فحص واختبار كافة مواسير وقطع البولي بروبلين والكاسل والكومر والمحابس ولوازم الشبكات الموضحة بياناتها بالكشف أدناه هيدروليكياً وفنياً، وتبين مطابقتها لضغوط التشغيل المعتمدة والمواصفات القياسية للمشروع، وتم اعتماد استلامها مخزنياً.',
    sampleItemsHint: 'مواسير بولي، كاسل، كومر، محابس بلي، مساليب، جلب، تيهات...'
  },
  IRRIGATION: {
    key: 'IRRIGATION',
    label: 'قسم الزراعة وشبكات الري',
    defaultInspectorRole: 'مشرف شبكات الري والزراعة',
    defaultInspectorName: 'مشرف الري المعتمد',
    preamble: 'تمت المعاينة الفنية لخامات وشبكات الري ومحابس السولينويد وخراطيم الـ GR ولوازم التشجير والحدائق الموضحة بالكشف أدناه، وثبتت جودتها وصلاحيتها الكاملة لأعمال التشغيل بالموقع العام، وصرح بإيداعها بالمخزن.',
    sampleItemsHint: 'خراطيم GR، رشاشات بوب اب، محابس سولينويد، بذور نجيل، أسمدة...'
  },
  CIVIL: {
    key: 'CIVIL',
    label: 'قسم الأعمال المدنية ومواد البناء',
    defaultInspectorRole: 'مهندس الإشراف والتنفيذ المدني',
    defaultInspectorName: 'مهندس التنفيذ المدني',
    preamble: 'تمت المعاينة والفحص الميداني لمواد البناء والعزل والتشطيبات والرخام الموضحة بياناتها أدناه، وثبتت مطابقتها لمواصفات البند والاعتمادات الهندسية للمشروع، وتم التصريح بإضافتها للأرصدة.',
    sampleItemsHint: 'أسمنت، رمل، سيراميك، رخام، دهانات، مواد عزل، طوب...'
  },
  HVAC: {
    key: 'HVAC',
    label: 'قسم التكييف والتبريد (HVAC)',
    defaultInspectorRole: 'مهندس التكييف والتبريد',
    defaultInspectorName: 'مهندس التكييف المختص',
    preamble: 'تم فحص وحدات التكييف ولوازم التبريد ومواسير النحاس وغاز الفريون الموضحة بالكشف أدناه، والتأكد من مطابقة السعات التبريدية والبيانات الفنية واللوحات الاسمية (Nameplate) والضمان، وصرح بالتوريد المخزني.',
    sampleItemsHint: 'وحدات تكييف، فريون R410/R22، مواسير نحاس، عزل أرمفلكس، فلاتر...'
  },
  EQUIPMENT: {
    key: 'EQUIPMENT',
    label: 'قسم العدد والمعدات والأصول',
    defaultInspectorRole: 'مهندس المعدات والأصول',
    defaultInspectorName: 'مسؤول المعدات والأصول',
    preamble: 'تمت المعاينة التشغيلية واختبار القدرة الكهربائية والميكانيكية للعدد والمعدات الموضحة بالكشف أدناه، والتأكد من سلامة كافة أجزائها وجاهزيتها للتشغيل الميداني التام وخلوها من أي أعطال.',
    sampleItemsHint: 'دريلات هلتي، ماكينات لحام، كمبروسر، مواتير مياه، صاروخ قطعية...'
  },
  GENERAL: {
    key: 'GENERAL',
    label: 'قسم مستلزمات النظافة ومهمات الوقاية (PPE)',
    defaultInspectorRole: 'مسؤول النظافة والسلامة المهنية',
    defaultInspectorName: 'مشرف النظافة والأمن الصناعي',
    preamble: 'تمت المعاينة والفحص الظاهري لكافة مستلزمات النظافة والمطهرات والورقيات ومهمات السلامة والصحة المهنية (PPE) الموضحة بالكشف أدناه، وثبتت جودتها ومطابقتها للمواصفات القياسية وصلاحيتها التامة للاستخدام بالمشروع.',
    sampleItemsHint: 'معطر فريدة، مناديل ورقية، باسكت قمامة، كمامات، قفازات، مهمات وقاية...'
  }
};

const USAGE_PURPOSE_OPTIONS = [
  'إصلاح كسر',
  'تطوير',
  'استخدام موقع عام',
  'نظافة موقع',
  'صيانة دورية',
  'تركيبات وتمديدات'
];

export default function CompletionRecordsPage() {
  const { userData } = useAuth();
  const { t, language } = useLanguage();

  // Active Main Tab - Default to Technical Inspection so it is immediately visible
  const [activeTab, setActiveTab] = useState<MainTab>('INSPECTION');

  // Tab 2: Sub-Model Selection - Default to Technical Inspection
  const [receiptModel, setReceiptModel] = useState<ReceiptSubModel>('TECHNICAL_INSPECTION');

  // Raw Firestore Data
  const [disbursements, setDisbursements] = useState<DisbursementDoc[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------
  // TAB 1: WORK COMPLETION FILTERS & STATE (NO DUMMY DATA)
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState<string>(''); // For work order or location
  const [selectedDept, setSelectedDept] = useState<string>('all'); // Department / Supply destination
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // Month filter

  // Table rows for settlement
  const [settlementRows, setSettlementRows] = useState<SettlementItem[]>([]);

  // Bulk Apply Controls
  const [bulkLocationInput, setBulkLocationInput] = useState<string>('');

  // Print Setup (Configured inside Print Modal - Clean placeholders)
  const [workOrderRef, setWorkOrderRef] = useState<string>('');
  const [operationTypeTitle, setOperationTypeTitle] = useState<string>('');
  const [engineerName, setEngineerName] = useState<string>(userData?.name || '');
  const [storekeeperName, setStorekeeperName] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [finalApproverRole, setFinalApproverRole] = useState<FinalApproverRole>('MAINTENANCE_MANAGER');
  const [finalApproverName, setFinalApproverName] = useState<string>('');

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCustodyPrintModalOpen, setIsCustodyPrintModalOpen] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: CUSTODY / HANDOVER STATE (REAL ITEMS)
  // -------------------------------------------------------------
  const [custodySearch, setCustodySearch] = useState<string>('');
  const [custodyStatusFilter, setCustodyStatusFilter] = useState<string>('ALL');
  const [custodyRows, setCustodyRows] = useState<CustodyItem[]>([]);

  // Common Custody Details
  const [custodyDocNo, setCustodyDocNo] = useState<string>(`CUST-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`);
  const [custodyDate, setCustodyDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [custodyStorekeeper, setCustodyStorekeeper] = useState<string>(userData?.name || '');
  const [showAddCustodyModal, setShowAddCustodyModal] = useState<boolean>(false);

  // Model 1: Company / Contractor Custody Fields
  const [contractorCompany, setContractorCompany] = useState<string>('');
  const [contractorRepName, setContractorRepName] = useState<string>('');
  const [contractorRepId, setContractorRepId] = useState<string>('');
  const [contractorProject, setContractorProject] = useState<string>('');
  const [contractorPoRef, setContractorPoRef] = useState<string>('');
  const [contractorPhone, setContractorPhone] = useState<string>('');

  // Model 2: Technician Custody Fields
  const [techName, setTechName] = useState<string>('');
  const [techEmpId, setTechEmpId] = useState<string>('');
  const [techDept, setTechDept] = useState<string>('الصيانة والتشغيل');
  const [techJobTitle, setTechJobTitle] = useState<string>('فني صيانة وتشغيل');
  const [techNationalId, setTechNationalId] = useState<string>('');
  const [techSupervisor, setTechSupervisor] = useState<string>('');

  // Model 3: Tools & Assets Handover Fields
  const [assetsDeliveringParty, setAssetsDeliveringParty] = useState<string>(userData?.name || '');
  const [assetsReceivingParty, setAssetsReceivingParty] = useState<string>('');
  const [assetsLocation, setAssetsLocation] = useState<string>('');
  const [assetsCategory, setAssetsCategory] = useState<string>('أصول ومعدات استراتيجية');
  const [assetsEngineer, setAssetsEngineer] = useState<string>('');

  // Model 4: Technical Inspection Fields (Rule 3 Approved)
  const [inspectionDeptKey, setInspectionDeptKey] = useState<string>('ELECTRICAL');
  const [inspectorRole, setInspectorRole] = useState<string>('مشرف الكهرباء');
  const [inspectorName, setInspectorName] = useState<string>('م / محمود متولي');
  const [inspectionPreamble, setInspectionPreamble] = useState<string>(DEPARTMENT_INSPECTION_CONFIGS.ELECTRICAL.preamble);
  const [inspectionSupplier, setInspectionSupplier] = useState<string>('شركة جودة الكتريك');
  const [inspectionDeliveryRef, setInspectionDeliveryRef] = useState<string>('أذون إضافة رقم [ 268 ، 269 ، 270 ]');
  const [inspectionProject, setInspectionProject] = useState<string>('موقع ستون رزيدنس - التجمع الخامس');
  const [inspectionProjectManager, setInspectionProjectManager] = useState<string>('م / محمد عدوي');

  const handleDepartmentChange = (newDeptKey: string) => {
    setInspectionDeptKey(newDeptKey);
    const cfg = DEPARTMENT_INSPECTION_CONFIGS[newDeptKey];
    if (cfg) {
      setInspectorRole(cfg.defaultInspectorRole);
      setInspectorName(cfg.defaultInspectorName);
      setInspectionPreamble(cfg.preamble);
    }
  };

    // Inline Quick Search & Add Bar State
  const [inlineSearchText, setInlineSearchText] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [selectedDbItem, setSelectedDbItem] = useState<any | null>(null);
  const [inlineQty, setInlineQty] = useState<number>(1);
  const [inlineUnit, setInlineUnit] = useState<string>('عدد');
  const [inlineSerial, setInlineSerial] = useState<string>('');
  const [inlineCondition, setInlineCondition] = useState<string>('سليم وجديد');
  const [inlineNotes, setInlineNotes] = useState<string>('');

  // Filter items for live autocomplete
  const matchingDbItems = useMemo(() => {
    if (!inlineSearchText.trim()) return [];
    const q = inlineSearchText.trim().toLowerCase();
    return inventoryItems.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && String(item.code).toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [inventoryItems, inlineSearchText]);

  const handleSelectDbItem = (item: any) => {
    setSelectedDbItem(item);
    setInlineSearchText(item.name);
    setInlineUnit(item.unit || 'عدد');
    setIsDropdownOpen(false);
  };

  const handleAddInlineItem = () => {
    const nameToUse = selectedDbItem ? selectedDbItem.name : inlineSearchText.trim();
    if (!nameToUse) {
      toast.error('يرجى كتابة أو اختيار اسم الصنف أو المعدة للبحث والإدراج');
      return;
    }

    let defaultRecipient = '';
    let defaultEntity = '';
    if (receiptModel === 'COMPANY_CUSTODY') {
      defaultRecipient = contractorRepName || 'ممثل المقاول';
      defaultEntity = contractorCompany || 'شركة مقاولات';
    } else if (receiptModel === 'TECH_CUSTODY') {
      defaultRecipient = techName || 'فني الصيانة';
      defaultEntity = techDept || 'الصيانة والتشغيل';
    } else {
      defaultRecipient = assetsReceivingParty || 'المستلم';
      defaultEntity = assetsLocation || 'الموقع العام';
    }

    const newItem: CustodyItem = {
      id: `custody-${Date.now()}`,
      itemCode: selectedDbItem?.code || '—',
      itemName: nameToUse,
      qty: Math.max(1, Number(inlineQty) || 1),
      unit: inlineUnit || selectedDbItem?.unit || 'عدد',
      condition: inlineCondition,
      status: 'سارية ومستمرة',
      serialNo: inlineSerial.trim() || '—',
      recipient: defaultRecipient,
      departmentOrCompany: defaultEntity,
      date: custodyDate,
      notes: inlineNotes.trim()
    };

    setCustodyRows(prev => [newItem, ...prev]);
    toast.success(`تم إدراج "${newItem.itemName}" في كشف المحضر بنجاح`);

    // Reset inputs
    setInlineSearchText('');
    setSelectedDbItem(null);
    setInlineQty(1);
    setInlineUnit('عدد');
    setInlineSerial('');
    setInlineCondition('سليم وجديد');
    setInlineNotes('');
    setIsDropdownOpen(false);
  };

  // New Custody Item Input State
  const [newCustodyItem, setNewCustodyItem] = useState<{
    selectedItemId: string;
    customName: string;
    qty: number;
    unit: string;
    serialNo: string;
    condition: string;
    recipient: string;
    notes: string;
  }>({
    selectedItemId: '',
    customName: '',
    qty: 1,
    unit: 'عدد',
    serialNo: '',
    condition: 'سليم وجديد',
    recipient: '',
    notes: ''
  });

  // -------------------------------------------------------------
  // Real-time Firestore Listeners
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Listen to Disbursements
    const unsubDisb = onSnapshot(collection(db, 'disbursements'), (snap) => {
      const list: DisbursementDoc[] = snap.docs.map(doc => {
        const d = doc.data();
        let dateStr = d.date || '';
        if (!dateStr && d.createdAt) {
          dateStr = new Date(d.createdAt).toISOString().split('T')[0];
        }
        if (!dateStr) dateStr = '2026-01-01';

        let rawInv = String(d.invoiceNo || d.reportNo || '').trim();
        if (rawInv.startsWith('#')) rawInv = rawInv.slice(1);

        return {
          id: doc.id,
          invoiceNo: rawInv || '—',
          date: dateStr,
          department: String(d.department || d.reason || 'عام').trim(),
          destination: (() => {
            const dest = String(d.destination || '').trim();
            return (dest && dest !== 'فني الصيانة' && dest !== '—') ? dest : '';
          })(),
          receiver: String(d.receiver || '').trim(),
          itemCode: String(d.itemCode || d.code || '').trim(),
          itemName: String(d.itemName || d.name || 'صنف غير محدد').trim(),
          unit: String(d.unit || 'عدد').trim(),
          qty: Number(d.qty || d.quantity || 0),
          notes: String(d.notes || '').trim(),
          category: String(d.category || 'عام').trim(),
          createdAt: typeof d.createdAt === 'number' ? d.createdAt : new Date(dateStr).getTime()
        };
      });

      setDisbursements(list);
      setLoading(false);
    }, (err) => {
      console.error("Disbursements onSnapshot error:", err);
      setLoading(false);
    });

    // 2. Listen to Inventory Items (For Real Custody & Tools)
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const itemsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter((item: any) => item.name && item.name.trim() !== '');
      setInventoryItems(itemsList);
    }, (err) => {
      console.error("Items onSnapshot error:", err);
    });

    return () => {
      unsubDisb();
      unsubItems();
    };
  }, []);

  // Listen to ?tab= query param for direct navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'inspection') {
        setActiveTab('INSPECTION');
        setReceiptModel('TECHNICAL_INSPECTION');
      } else if (tabParam === 'completion') {
        setActiveTab('COMPLETION');
      } else if (tabParam === 'receipt' || tabParam === 'custody') {
        setActiveTab('RECEIPT');
        if (receiptModel === 'TECHNICAL_INSPECTION') {
          setReceiptModel('COMPANY_CUSTODY');
        }
      }
    }
  }, []);

  // Compute Unique Real Departments / Supply Entities
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    disbursements.forEach(d => {
      if (d.department && d.department !== 'عام' && d.department !== 'غير محدد') {
        depts.add(d.department);
      }
    });
    return Array.from(depts).sort();
  }, [disbursements]);

  // Compute Available Months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    disbursements.forEach(d => {
      if (d.date && d.date.length >= 7) {
        months.add(d.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [disbursements]);

  // Filter Data and Populate Settlement Table Rows (Real Data Only!)
  useEffect(() => {
    if (disbursements.length === 0) {
      setSettlementRows([]);
      return;
    }

    let filtered = disbursements;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(d => 
        d.destination.toLowerCase().includes(q) ||
        d.itemName.toLowerCase().includes(q) ||
        d.invoiceNo.toLowerCase().includes(q) ||
        d.notes.toLowerCase().includes(q) ||
        d.receiver.toLowerCase().includes(q)
      );
    }

    if (selectedDept !== 'all') {
      filtered = filtered.filter(d => d.department === selectedDept);
    }

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(d => d.date.startsWith(selectedMonth));
    }

    const rows: SettlementItem[] = filtered.slice(0, 200).map((d, index) => {
      let detectedLocation = '';
      if (d.destination && d.destination !== '—' && d.destination !== 'الموقع العام') {
        detectedLocation = d.destination;
      } else if (d.notes && (d.notes.includes('عمارة') || d.notes.includes('محطة') || d.notes.includes('شارع') || d.notes.includes('كرفان') || d.notes.includes('خط') || d.notes.includes('فيلا') || d.notes.includes('مبنى') || d.notes.includes('زون') || d.notes.includes('منطقة'))) {
        detectedLocation = d.notes;
      }

      let detectedUsage = 'إصلاح كسر';
      const nLower = (d.notes || '').toLowerCase();
      if (nLower.includes('تطوير') || nLower.includes('إحلال') || nLower.includes('تجديد')) {
        detectedUsage = 'تطوير';
      } else if (nLower.includes('كسر') || nLower.includes('صيانة') || nLower.includes('عطل')) {
        detectedUsage = 'إصلاح كسر';
      } else if (nLower.includes('نظافة')) {
        detectedUsage = 'نظافة موقع';
      } else if (nLower.includes('موقع عام') || nLower.includes('عام') || nLower.includes('تغذية')) {
        detectedUsage = 'استخدام موقع عام';
      } else if (nLower.includes('تركيب') || nLower.includes('تمديد')) {
        detectedUsage = 'تركيبات وتمديدات';
      } else if (nLower.includes('دورية') || nLower.includes('متابعة')) {
        detectedUsage = 'صيانة دورية';
      }

      return {
        id: d.id || `row-${index}`,
        itemName: d.itemName,
        invoiceNo: d.invoiceNo ? `#${d.invoiceNo}` : '—',
        issuedQty: d.qty,
        installedQty: d.qty,
        returnedQty: 0,
        unit: d.unit,
        location: detectedLocation,
        usageType: detectedUsage,
        notes: d.notes || ''
      };
    });

    setSettlementRows(rows);
  }, [disbursements, searchQuery, selectedDept, selectedMonth]);

  // Handle Installed Quantity Change & Automatic Return Calculation
  const handleInstalledQtyChange = (id: string, value: number) => {
    setSettlementRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const validVal = isNaN(value) ? 0 : Math.max(0, Math.min(row.issuedQty, value));
      const returned = Math.max(0, row.issuedQty - validVal);
      return {
        ...row,
        installedQty: validVal,
        returnedQty: Number(returned.toFixed(2))
      };
    }));
  };

  // Handle row field change
  const handleRowFieldChange = (id: string, field: keyof SettlementItem, value: any) => {
    setSettlementRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      return { ...row, [field]: value };
    }));
  };

  // Bulk Apply Usage Purpose to ALL Rows
  const handleBulkApplyUsage = (val: string) => {
    if (!val) return;
    setSettlementRows(prev => prev.map(r => ({ ...r, usageType: val })));
    toast.success(`تم تطبيق بيان الاستخدام "${val}" على كافة البنود`);
  };

  // Bulk Apply Location to ALL Rows
  const handleBulkApplyLocation = () => {
    if (!bulkLocationInput.trim()) {
      toast.error('يرجى كتابة مكان التركيب أولاً لتطبيقه على البنود');
      return;
    }
    const val = bulkLocationInput.trim();
    setSettlementRows(prev => prev.map(r => ({ ...r, location: val })));
    toast.success(`تم تعيين مكان التركيب "${val}" لجميع بنود الكشف`);
  };

  // Add Manual Row to Work Completion
  const handleAddCustomRow = () => {
    const newRow: SettlementItem = {
      id: `manual-${Date.now()}`,
      itemName: '',
      invoiceNo: '—',
      issuedQty: 1,
      installedQty: 1,
      returnedQty: 0,
      unit: 'عدد',
      location: searchQuery.trim() || '',
      usageType: 'إصلاح كسر',
      notes: ''
    };
    setSettlementRows(prev => [newRow, ...prev]);
    toast.success('تمت إضافة بند جديد للكشف');
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setSettlementRows(prev => prev.filter(r => r.id !== id));
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('all');
    setSelectedMonth('all');
    setBulkLocationInput('');
  };

  // Totals calculations for Work Completion
  const totals = useMemo(() => {
    let issued = 0;
    let installed = 0;
    let returned = 0;
    settlementRows.forEach(r => {
      issued += r.issuedQty || 0;
      installed += r.installedQty || 0;
      returned += r.returnedQty || 0;
    });
    return {
      itemsCount: settlementRows.length,
      issued: issued.toFixed(1),
      installed: installed.toFixed(1),
      returned: returned.toFixed(1)
    };
  }, [settlementRows]);

  // -------------------------------------------------------------
  // TAB 1: EXCEL EXPORT (WORK COMPLETION)
  // -------------------------------------------------------------
  const handleExportCompletionExcel = async () => {
    if (settlementRows.length === 0) {
      toast.error('لا توجد بيانات متاحة للتصدير');
      return;
    }
    try {
      const exportCols = [
        { header: 'م', key: 'seq', width: 6 },
        { header: 'اسم الصنف والوصف تفصيلياً', key: 'itemName', width: 34 },
        { header: 'رقم إذن الصرف', key: 'invoiceNo', width: 15 },
        { header: 'العدد المنصرف', key: 'issuedQty', width: 14 },
        { header: 'العدد المركب فعلياً', key: 'installedQty', width: 16 },
        { header: 'المرتجع للمخزن', key: 'returnedQty', width: 14 },
        { header: 'الوحدة', key: 'unit', width: 10 },
        { header: 'مكان التركيب', key: 'location', width: 28 },
        { header: 'بيان الاستخدام', key: 'usageType', width: 26 },
        { header: 'ملاحظات', key: 'notes', width: 20 }
      ];

      const exportRows = settlementRows.map((row, idx) => ({
        seq: idx + 1,
        itemName: row.itemName,
        invoiceNo: row.invoiceNo,
        issuedQty: row.issuedQty,
        installedQty: row.installedQty,
        returnedQty: row.returnedQty,
        unit: row.unit,
        location: row.location || '—',
        usageType: row.usageType,
        notes: row.notes
      }));

      const fileName = `محضر_إنهاء_أعمال_وتسوية_خامات_${searchQuery ? searchQuery.replace(/\s+/g, '_') : 'عام'}_${new Date().toISOString().split('T')[0]}`;

      await exportToExcel(
        `منظومة Stockly لإدارة المستودعات • محضر إنهاء وتسوية الخامات`,
        'تسوية_الخامات',
        exportCols,
        exportRows,
        fileName
      );
      toast.success('تم تصدير ملف الإكسيل لمحضر إنهاء الأعمال بنجاح');
    } catch (e) {
      console.error("Export Excel error:", e);
      toast.error('حدث خطأ أثناء تصدير ملف الإكسيل');
    }
  };

  // -------------------------------------------------------------
  // TAB 2: CUSTODY OPERATIONS & EXCEL EXPORT
  // -------------------------------------------------------------
  const filteredCustodyRows = useMemo(() => {
    let list = custodyRows;
    if (custodySearch.trim() !== '') {
      const q = custodySearch.trim().toLowerCase();
      list = list.filter(r => 
        r.itemName.toLowerCase().includes(q) ||
        r.itemCode.toLowerCase().includes(q) ||
        r.recipient.toLowerCase().includes(q) ||
        r.serialNo.toLowerCase().includes(q) ||
        r.departmentOrCompany.toLowerCase().includes(q)
      );
    }
    if (custodyStatusFilter !== 'ALL') {
      list = list.filter(r => r.status === custodyStatusFilter);
    }
    return list;
  }, [custodyRows, custodySearch, custodyStatusFilter]);

  const custodyTotals = useMemo(() => {
    const totalItems = custodyRows.length;
    const activeCount = custodyRows.filter(r => r.status === 'سارية ومستمرة').length;
    const returnedCount = custodyRows.filter(r => r.status === 'تم إرجاعها للمخزن').length;
    const maintenanceCount = custodyRows.filter(r => r.status === 'قيد الفحص والصيانة').length;
    return { totalItems, activeCount, returnedCount, maintenanceCount };
  }, [custodyRows]);

  const handleAddCustodyItem = () => {
    let itemName = newCustodyItem.customName.trim();
    let itemCode = '—';
    let unit = newCustodyItem.unit;

    if (newCustodyItem.selectedItemId) {
      const dbItem = inventoryItems.find(i => i.id === newCustodyItem.selectedItemId);
      if (dbItem) {
        itemName = dbItem.name;
        itemCode = dbItem.code || '—';
        unit = dbItem.unit || 'عدد';
      }
    }

    if (!itemName) {
      toast.error('يرجى تحديد اسم الصنف أو المعدة المسلمة كعهدة');
      return;
    }

    // Determine default recipient and entity based on current active model
    let defaultRecipient = '';
    let defaultEntity = '';
    if (receiptModel === 'COMPANY_CUSTODY') {
      defaultRecipient = contractorRepName || 'ممثل المقاول';
      defaultEntity = contractorCompany || 'شركة مقاولات';
    } else if (receiptModel === 'TECH_CUSTODY') {
      defaultRecipient = techName || 'فني الصيانة';
      defaultEntity = techDept || 'الصيانة والتشغيل';
    } else {
      defaultRecipient = assetsReceivingParty || 'المستلم';
      defaultEntity = assetsLocation || 'الموقع العام';
    }

    const newItem: CustodyItem = {
      id: `custody-${Date.now()}`,
      itemCode,
      itemName,
      qty: Number(newCustodyItem.qty) || 1,
      unit,
      condition: newCustodyItem.condition || 'سليم وجديد',
      status: 'سارية ومستمرة',
      serialNo: newCustodyItem.serialNo.trim() || '—',
      recipient: newCustodyItem.recipient.trim() || defaultRecipient,
      departmentOrCompany: defaultEntity,
      date: custodyDate,
      notes: newCustodyItem.notes.trim()
    };

    setCustodyRows(prev => [newItem, ...prev]);
    setShowAddCustodyModal(false);
    setNewCustodyItem({
      selectedItemId: '',
      customName: '',
      qty: 1,
      unit: 'عدد',
      serialNo: '',
      condition: 'سليم وجديد',
      recipient: '',
      notes: ''
    });
    toast.success('تمت إضافة الصنف إلى محضر الاستلام والعهدة بنجاح');
  };

  const handleDeleteCustodyRow = (id: string) => {
    setCustodyRows(prev => prev.filter(r => r.id !== id));
  };

  const handleChangeCustodyStatus = (id: string, status: string) => {
    setCustodyRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleExportCustodyExcel = async () => {
    if (custodyRows.length === 0) {
      toast.error('لا توجد بنود عهدة مسجلة للتصدير');
      return;
    }
    try {
      const exportCols = [
        { header: 'م', key: 'seq', width: 6 },
        { header: 'كود الصنف / الأصل', key: 'itemCode', width: 16 },
        { header: 'اسم الأداة / العهدة / المعدة', key: 'itemName', width: 34 },
        { header: 'الكمية المسلمة', key: 'qty', width: 14 },
        { header: 'الوحدة', key: 'unit', width: 10 },
        { header: 'الرقم التسلسلي / السيريال', key: 'serialNo', width: 22 },
        { header: 'اسم المستلم (الفني / المسؤول)', key: 'recipient', width: 24 },
        { header: 'الجهة / الشركة / القسم', key: 'departmentOrCompany', width: 22 },
        { header: 'تاريخ الاستلام', key: 'date', width: 14 },
        { header: 'حالة الصنف عند التسليم', key: 'condition', width: 18 },
        { header: 'حالة القيد / العهدة', key: 'status', width: 18 },
        { header: 'ملاحظات', key: 'notes', width: 22 }
      ];

      const exportRows = custodyRows.map((r, idx) => ({
        seq: idx + 1,
        itemCode: r.itemCode,
        itemName: r.itemName,
        qty: r.qty,
        unit: r.unit,
        serialNo: r.serialNo,
        recipient: r.recipient,
        departmentOrCompany: r.departmentOrCompany,
        date: r.date,
        condition: r.condition,
        status: r.status,
        notes: r.notes
      }));

      const modelLabel = receiptModel === 'COMPANY_CUSTODY' ? 'عهدة_شركة' : (receiptModel === 'TECH_CUSTODY' ? 'عهدة_فني' : (receiptModel === 'TECHNICAL_INSPECTION' ? 'فحص_فني' : 'أدوات_وأصول'));
      const fileName = `سجل_محاضر_استلام_${modelLabel}_${new Date().toISOString().split('T')[0]}`;

      await exportToExcel(
        `منظومة Stockly لإدارة المستودعات • سجل ومحاضر استلام العهد والأصول`,
        'محاضر_الاستلام_والعهدة',
        exportCols,
        exportRows,
        fileName
      );
      toast.success('تم تصدير ملف الإكسيل لمحاضر الاستلام بنجاح');
    } catch (e) {
      console.error("Export Custody Excel error:", e);
      toast.error('حدث خطأ أثناء تصدير ملف الإكسيل');
    }
  };

  // Helper labels for active receipt model
  const activeModelMeta = useMemo(() => {
    switch (receiptModel) {
      case 'COMPANY_CUSTODY':
        return {
          title: 'محضر استلام عهدة لشركة / مقاول باطن',
          subTitle: 'تسليم معدات وعدد تشغيل لمقاولي الباطن والشركات الخارجية مع إقرار قانوني ملزم',
          badgeColor: '#d97706',
          badgeBg: 'rgba(217, 119, 6, 0.15)',
          borderColor: '#d97706'
        };
      case 'TECH_CUSTODY':
        return {
          title: 'محضر استلام عهدة شخصية لفني / موظف',
          subTitle: 'تسليم عدد يدوية وأجهزة فحص وأدوات عمل شخصية وفق لائحة العمل والجزاءات',
          badgeColor: '#2563eb',
          badgeBg: 'rgba(37, 99, 235, 0.15)',
          borderColor: '#2563eb'
        };
      case 'TOOLS_ASSETS':
        return {
          title: 'محضر استلام وتسليم أدوات وأصول عامة ومعدات تشغيل',
          subTitle: 'حصر ونقل الحيازة والمسؤولية التشغيلية للأصول الاستراتيجية والمحطات والمضخات',
          badgeColor: '#059669',
          badgeBg: 'rgba(5, 150, 105, 0.15)',
          borderColor: '#059669'
        };
      case 'TECHNICAL_INSPECTION':
        return {
          title: 'محضر فحص فني ومطابقة مواصفات وتوريد مخزني',
          subTitle: 'معاينة فنية للمهمات والتوريدات ومطابقتها لأصول الصنعة وطلبات الشراء واعتماد إيداعها بالمخزن',
          badgeColor: '#0284c7',
          badgeBg: 'rgba(2, 132, 199, 0.15)',
          borderColor: '#0284c7'
        };
    }
  }, [receiptModel]);

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className={isPrintModalOpen || isCustodyPrintModalOpen ? 'hide-on-print' : undefined}>
        {/* ──── 1. PAGE HEADER & GLOBAL ACTIONS ──── */}
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(9, 154, 117, 0.12)', color: '#099A75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="heading-xl" style={{ margin: 0, fontWeight: 800 }}>
                محاضر الفحص الفني والاستلام وتسوية الأعمال
              </h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(0, 223, 143, 0.15)', color: '#00DF8F' }}>
                Stockly WMS
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              منظومة إعداد محاضر الفحص الفني ومطابقة المواصفات، ونماذج استلام وتسليم العهد، وكشوف تسوية الخامات المعتمدة
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {activeTab === 'COMPLETION' ? (
            <>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                disabled={settlementRows.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={17} />
                <span>نموذج الطباعة الرسمي (A4)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCompletionExcel}
                disabled={settlementRows.length === 0}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', color: '#099A75', borderColor: '#099A75', fontWeight: 700, cursor: 'pointer' }}
                title="تصدير كشف التسوية إلى إكسيل"
              >
                <FileSpreadsheet size={17} />
                <span>تصدير إكسيل</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsCustodyPrintModalOpen(true)}
                disabled={custodyRows.length === 0}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 700, background: activeModelMeta.badgeColor, borderColor: activeModelMeta.badgeColor, cursor: 'pointer' }}
              >
                <Printer size={17} />
                <span>طباعة المحضر المعتمد (A4)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCustodyExcel}
                disabled={custodyRows.length === 0}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', color: activeModelMeta.badgeColor, borderColor: activeModelMeta.badgeColor, fontWeight: 700, cursor: 'pointer' }}
                title="تصدير محضر الاستلام والعهدة إلى إكسيل"
              >
                <FileSpreadsheet size={17} />
                <span>تصدير إكسيل</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ──── 2. MAIN TABS NAVIGATION (الفحص الفني / استلام العهد / إنهاء الأعمال) ──── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.85rem', flexWrap: 'wrap' }}>
        
        {/* Tab 1: محضر فحص فني ومطابقة مواصفات */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('INSPECTION');
            setReceiptModel('TECHNICAL_INSPECTION');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'INSPECTION' ? '#0284c7' : 'var(--bg-secondary)',
            color: activeTab === 'INSPECTION' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'INSPECTION' ? '1px solid #0284c7' : '1px solid var(--border-light)',
            boxShadow: activeTab === 'INSPECTION' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none'
          }}
        >
          <ClipboardCheck size={18} />
          <span>محضر فحص فني ومطابقة مواصفات (توريد مخزني)</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '8px',
            fontWeight: 800,
            background: activeTab === 'INSPECTION' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
            color: activeTab === 'INSPECTION' ? '#ffffff' : 'var(--text-muted)'
          }}>
            ديباجات الأقسام ⚡
          </span>
        </button>

        {/* Tab 2: محاضر استلام العهد والأصول */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('RECEIPT');
            if (receiptModel === 'TECHNICAL_INSPECTION') {
              setReceiptModel('COMPANY_CUSTODY');
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'RECEIPT' ? '#d97706' : 'var(--bg-secondary)',
            color: activeTab === 'RECEIPT' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'RECEIPT' ? '1px solid #d97706' : '1px solid var(--border-light)',
            boxShadow: activeTab === 'RECEIPT' ? '0 4px 14px rgba(217, 119, 6, 0.35)' : 'none'
          }}
        >
          <PackageCheck size={18} />
          <span>محاضر استلام وتسليم العهد والأصول</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '8px',
            fontWeight: 800,
            background: activeTab === 'RECEIPT' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
            color: activeTab === 'RECEIPT' ? '#ffffff' : 'var(--text-muted)'
          }}>
            3 نماذج عهدة
          </span>
        </button>

        {/* Tab 3: محاضر إنهاء وتسوية الأعمال */}
        <button
          type="button"
          onClick={() => setActiveTab('COMPLETION')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'COMPLETION' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'COMPLETION' ? '#ffffff' : 'var(--text-secondary)',
            border: activeTab === 'COMPLETION' ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)',
            boxShadow: activeTab === 'COMPLETION' ? '0 4px 14px rgba(9, 154, 117, 0.35)' : 'none'
          }}
        >
          <Wrench size={18} />
          <span>محاضر إنهاء الأعمال وتسوية الخامات</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '8px',
            fontWeight: 800,
            background: activeTab === 'COMPLETION' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
            color: activeTab === 'COMPLETION' ? '#ffffff' : 'var(--text-muted)'
          }}>
            {settlementRows.length} بند
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WORK COMPLETION & MATERIALS SETTLEMENT (STABLE & APPROVED) */}
      {/* ========================================================================= */}
      {activeTab === 'COMPLETION' && (
        <div className="animate-fade-in">
          
          {/* KPI SUMMARY CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            
            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي الأصناف</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totals.itemsCount} صنف</div>
              </div>
            </div>

            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>المنصرف من المخزن</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{totals.issued}</div>
              </div>
            </div>

            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>المركب فعلياً بالموقع</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{totals.installed}</div>
              </div>
            </div>

            <div className="enterprise-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>المرتجع للمخزن</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>{totals.returned}</div>
              </div>
            </div>
          </div>

          {/* SMART FILTER TOOLBAR */}
          <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  بحث بأمر الشغل / المكان (عمارة كذا):
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="مثلاً: عمارة 50، خط رئيسي، أو أمر شغل..."
                    className="input-field"
                    style={{ paddingRight: '2.4rem', width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  القسم / جهة التوريد:
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="input-field"
                    style={{ paddingRight: '2.4rem', width: '100%', cursor: 'pointer' }}
                  >
                    <option value="all">-- كل الأقسام وجهات التوريد --</option>
                    {availableDepartments.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  الشهر / الفترة:
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input-field"
                    style={{ paddingRight: '2.4rem', width: '100%', cursor: 'pointer' }}
                  >
                    <option value="all">-- جميع الأشهر --</option>
                    {availableMonths.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-outline"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem' }}
                  title="إعادة ضبط الفلاتر"
                >
                  <RotateCcw size={15} />
                  <span>إعادة ضبط</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomRow}
                  className="btn btn-primary"
                  style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem' }}
                  title="إضافة سطر خامات يدوي"
                >
                  <Plus size={16} />
                  <span>إضافة بند يدوي</span>
                </button>
              </div>
            </div>
          </div>

          {/* BULK ASSIGNMENT TOOLBAR & MATERIALS TABLE */}
          <div className="enterprise-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
            
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>كشف حصر الخامات المنصرفة والمطابقة الميدانية</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                المرتجع يُحسب تلقائياً بطرح المركب من المنصرف
              </span>
            </div>

            {/* Bulk Tool Ribbon */}
            <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  <Tag size={15} style={{ color: '#099A75' }} />
                  <span>تطبيق بيان الاستخدام على كل البنود:</span>
                </div>
                <select
                  onChange={(e) => handleBulkApplyUsage(e.target.value)}
                  className="input-field"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  defaultValue=""
                >
                  <option value="" disabled>-- اختر العملية لتطبيقها على الجدول --</option>
                  {USAGE_PURPOSE_OPTIONS.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 800 }}>
                  <MapPin size={15} style={{ color: '#3b82f6' }} />
                  <span>تعيين مكان التركيب للكل:</span>
                </div>
                <input
                  type="text"
                  value={bulkLocationInput}
                  onChange={(e) => setBulkLocationInput(e.target.value)}
                  placeholder="مثلاً: عمارة 50 أو المحطة..."
                  className="input-field"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', width: '180px' }}
                />
                <button
                  type="button"
                  onClick={handleBulkApplyLocation}
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                >
                  تطبيق
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="table-container" style={{ margin: 0 }}>
              <table className="wms-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '45px' }}>م</th>
                    <th style={{ textAlign: 'right', minWidth: '220px' }}>اسم الصنف والوصف تفصيلياً</th>
                    <th style={{ textAlign: 'center', width: '90px' }}>رقم الإذن</th>
                    <th style={{ textAlign: 'center', width: '85px' }}>المنصرف</th>
                    <th style={{ textAlign: 'center', width: '100px', background: 'rgba(16, 185, 129, 0.08)', color: '#059669' }}>المركب فعلياً</th>
                    <th style={{ textAlign: 'center', width: '85px', background: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed' }}>المرتجع</th>
                    <th style={{ textAlign: 'center', minWidth: '160px' }}>مكان التركيب (العمارة / المحطة)</th>
                    <th style={{ textAlign: 'center', minWidth: '160px' }}>بيان الاستخدام (تطوير / كسر...)</th>
                    <th style={{ textAlign: 'center', width: '50px' }}>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        {loading ? 'جاري تحميل البيانات الحقيقية من المخزن...' : 'لا توجد بيانات مطابقة لخيارات البحث المحددة'}
                      </td>
                    </tr>
                  ) : (
                    settlementRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="text"
                            value={row.itemName}
                            onChange={(e) => handleRowFieldChange(row.id, 'itemName', e.target.value)}
                            placeholder="اسم الصنف..."
                            style={{ width: '100%', background: 'transparent', border: 'none', fontWeight: 700, color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', fontWeight: 800, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {row.invoiceNo}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {row.issuedQty} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{row.unit}</span>
                        </td>
                        <td style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              max={row.issuedQty}
                              step="any"
                              value={row.installedQty}
                              onChange={(e) => handleInstalledQtyChange(row.id, parseFloat(e.target.value))}
                              style={{
                                width: '68px',
                                height: '32px',
                                textAlign: 'center',
                                fontWeight: 900,
                                fontSize: '0.9rem',
                                color: '#059669',
                                background: 'var(--bg-secondary)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '8px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', background: 'rgba(139, 92, 246, 0.04)' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontWeight: 900,
                            fontSize: '0.85rem',
                            background: row.returnedQty > 0 ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                            color: row.returnedQty > 0 ? '#7c3aed' : 'var(--text-muted)'
                          }}>
                            {row.returnedQty} {row.unit}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="text"
                            value={row.location}
                            onChange={(e) => handleRowFieldChange(row.id, 'location', e.target.value)}
                            placeholder="المكان (عمارة/محطة)..."
                            className="input-field"
                            style={{ width: '100%', textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, padding: '0.35rem 0.5rem', borderRadius: '8px' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            value={row.usageType}
                            onChange={(e) => handleRowFieldChange(row.id, 'usageType', e.target.value)}
                            className="input-field"
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              padding: '0.35rem 0.5rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {USAGE_PURPOSE_OPTIONS.map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                            {!USAGE_PURPOSE_OPTIONS.includes(row.usageType) && row.usageType && (
                              <option value={row.usageType}>{row.usageType}</option>
                            )}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem' }}
                            title="حذف البند"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 & 3: INSPECTION AND RECEIPT CERTIFICATES */}
      {/* ========================================================================= */}
      {(activeTab === 'INSPECTION' || activeTab === 'RECEIPT') && (
        <div className="animate-fade-in">
          
          {/* A. If Tab is INSPECTION: Show 7-Departments Quick Switcher Banner */}
          {activeTab === 'INSPECTION' && (
            <div className="enterprise-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '2px solid #0284c7', background: 'rgba(2, 132, 199, 0.05)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.2)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardCheck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0284c7' }}>
                      اختر القسم الفني المختص (توليد الديباجة والفاحص المعتمد تلقائياً):
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      يتم ضبط نص المعاينة الفنية وصفة واسم الفاحص المعتمد تلقائياً وفق لائحة المشروع، مع إمكانية التعديل المباشر
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '5px 12px', borderRadius: '8px', background: '#0284c7', color: '#ffffff' }}>
                  القسم النشط: {DEPARTMENT_INSPECTION_CONFIGS[inspectionDeptKey]?.label || 'عام'}
                </span>
              </div>

              {/* 7 Department Selector Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
                {Object.values(DEPARTMENT_INSPECTION_CONFIGS).map((dept) => {
                  const isSelected = inspectionDeptKey === dept.key;
                  return (
                    <button
                      key={dept.key}
                      type="button"
                      onClick={() => handleDepartmentChange(dept.key)}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid var(--border-light)',
                        background: isSelected ? '#0284c7' : 'var(--bg-secondary)',
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none'
                      }}
                    >
                      <span>{dept.label}</span>
                      <span style={{ fontSize: '0.7rem', opacity: isSelected ? 0.9 : 0.65, fontWeight: 600 }}>
                        {dept.defaultInspectorRole}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. If Tab is RECEIPT: Show Sub-Models Selection Header */}
          {activeTab === 'RECEIPT' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              
              {/* Model 1: Company / Contractor Custody */}
              <div
                onClick={() => setReceiptModel('COMPANY_CUSTODY')}
                className="enterprise-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: receiptModel === 'COMPANY_CUSTODY' ? '2px solid #d97706' : '1px solid var(--border-light)',
                  background: receiptModel === 'COMPANY_CUSTODY' ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-secondary)',
                  boxShadow: receiptModel === 'COMPANY_CUSTODY' ? '0 4px 15px rgba(217, 119, 6, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={22} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', background: 'rgba(217, 119, 6, 0.15)', color: '#d97706' }}>
                    نموذج 1: شركات ومقاولين
                  </span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>محضر استلام عهدة شركة / مقاول</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  تسليم معدات وعدد تشغيل لمقاولي الباطن والشركات الخارجية مع إقرار قانوني ملزم
                </p>
              </div>

              {/* Model 2: Technician Custody */}
              <div
                onClick={() => setReceiptModel('TECH_CUSTODY')}
                className="enterprise-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: receiptModel === 'TECH_CUSTODY' ? '2px solid #2563eb' : '1px solid var(--border-light)',
                  background: receiptModel === 'TECH_CUSTODY' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)',
                  boxShadow: receiptModel === 'TECH_CUSTODY' ? '0 4px 15px rgba(37, 99, 235, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={22} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' }}>
                    نموذج 2: فنيين وموظفين
                  </span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>محضر استلام عهدة فني / موظف</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  تسليم عدد يدوية وأجهزة فحص وأدوات عمل شخصية وفق لائحة العمل والجزاءات
                </p>
              </div>

              {/* Model 3: Tools & Assets */}
              <div
                onClick={() => setReceiptModel('TOOLS_ASSETS')}
                className="enterprise-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: receiptModel === 'TOOLS_ASSETS' ? '2px solid #059669' : '1px solid var(--border-light)',
                  background: receiptModel === 'TOOLS_ASSETS' ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-secondary)',
                  boxShadow: receiptModel === 'TOOLS_ASSETS' ? '0 4px 15px rgba(5, 150, 105, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.15)', color: '#059669' }}>
                    نموذج 3: أدوات وأصول
                  </span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>محضر تسليم وتسلم أدوات وأصول</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  حصر ونقل الحيازة والمسؤولية التشغيلية للأصول الاستراتيجية والمحطات والمضخات
                </p>
              </div>

              {/* Model 4: Technical Inspection & Quality */}
              <div
                onClick={() => setReceiptModel('TECHNICAL_INSPECTION')}
                className="enterprise-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: receiptModel === 'TECHNICAL_INSPECTION' ? '2px solid #0284c7' : '1px solid var(--border-light)',
                  background: receiptModel === 'TECHNICAL_INSPECTION' ? 'rgba(2, 132, 199, 0.08)' : 'var(--bg-secondary)',
                  boxShadow: receiptModel === 'TECHNICAL_INSPECTION' ? '0 4px 15px rgba(2, 132, 199, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardCheck size={22} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 9px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7' }}>
                    نموذج 4: فحص فني وتوريد
                  </span>
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>محضر فحص فني ومطابقة مواصفات</h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  معاينة هندسية للتوريدات والمهمات ومطابقتها لأصول الصنعة واعتماد إيداعها بالمخازن
                </p>
              </div>
            </div>
          )}

          {/* Custody Actions & Filter Toolbar */}
          <div className="enterprise-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
              
              <button
                type="button"
                onClick={() => setShowAddCustodyModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', background: activeModelMeta.badgeColor, borderColor: activeModelMeta.badgeColor, fontWeight: 800 }}
              >
                <Plus size={17} />
                <span>إدراج صنف أو معدة في المحضر</span>
              </button>

              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={custodySearch}
                  onChange={(e) => setCustodySearch(e.target.value)}
                  placeholder="بحث سريع في بنود العهدة..."
                  className="input-field"
                  style={{ paddingRight: '2.4rem', width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ width: '180px' }}>
                <select
                  value={custodyStatusFilter}
                  onChange={(e) => setCustodyStatusFilter(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  <option value="ALL">-- كافة حالات العهد --</option>
                  <option value="سارية ومستمرة">سارية ومستمرة</option>
                  <option value="تم إرجاعها للمخزن">تم إرجاعها للمخزن</option>
                  <option value="قيد الفحص والصيانة">قيد الفحص والصيانة</option>
                  <option value="تالفة / مفقودة">تالفة / مفقودة</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>إجمالي البنود:</span>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: activeModelMeta.badgeColor }}>{custodyRows.length} بند</span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* THE MASTER DOCUMENT TEMPLATE CANVAS (EXPERT STYLED FORM ON SCREEN) */}
          {/* ===================================================================== */}
          <div className="enterprise-card" style={{
            padding: '2rem',
            background: 'var(--bg-secondary)',
            border: `2px solid ${activeModelMeta.borderColor}`,
            borderRadius: '16px',
            marginBottom: '2.5rem',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.15)'
          }}>
            
            {/* 1. DOCUMENT HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-light)', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: activeModelMeta.badgeBg, color: activeModelMeta.badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {receiptModel === 'TECHNICAL_INSPECTION'
                        ? 'منظومة ستوكلي لإدارة المستودعات وسلاسل الإمداد'
                        : 'منظومة Stockly لإدارة المشروعات والمستودعات'}
                    </h2>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {receiptModel === 'TECHNICAL_INSPECTION'
                        ? `الموضوع: محضر فحص فني ومطابقة مواصفات وتوريد مخزني (${DEPARTMENT_INSPECTION_CONFIGS[inspectionDeptKey]?.label || 'عام'})`
                        : 'Stockly Intelligent Warehouse Management • إدارة المستودعات واللوجستيات'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Title & Doc Number Box */}
              <div style={{ textAlign: 'center', padding: '0.65rem 1.5rem', borderRadius: '12px', background: activeModelMeta.badgeBg, border: `1px solid ${activeModelMeta.borderColor}` }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: activeModelMeta.badgeColor }}>
                  {activeModelMeta.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>رقم المحضر:</span>
                  <input
                    type="text"
                    value={custodyDocNo}
                    onChange={(e) => setCustodyDocNo(e.target.value)}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed var(--text-muted)', fontSize: '0.85rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', width: '130px', textAlign: 'center', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* 2. SPECIFIC MODEL METADATA FIELDS (EDITABLE IN TEMPLATE) */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-light)' }}>
              
              {/* MODEL 1: CONTRACTOR FIELDS */}
              {receiptModel === 'COMPANY_CUSTODY' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      اسم الشركة / المقاول المستلم:
                    </label>
                    <input
                      type="text"
                      value={contractorCompany}
                      onChange={(e) => setContractorCompany(e.target.value)}
                      placeholder="مثلاً: شركة أوراسكوم / المقاول العام..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      اسم الممثل المفوض بالاستلام:
                    </label>
                    <input
                      type="text"
                      value={contractorRepName}
                      onChange={(e) => setContractorRepName(e.target.value)}
                      placeholder="اسم المفوض رسمياً..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      الرقم القومي / إثبات الشخصية:
                    </label>
                    <input
                      type="text"
                      value={contractorRepId}
                      onChange={(e) => setContractorRepId(e.target.value)}
                      placeholder="الرقم القومي (14 رقم)..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      المشروع / الموقع المسند:
                    </label>
                    <input
                      type="text"
                      value={contractorProject}
                      onChange={(e) => setContractorProject(e.target.value)}
                      placeholder="مثلاً: مشروع محطة المعالجة / زون A..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      رقم أمر الإسناد / العقد:
                    </label>
                    <input
                      type="text"
                      value={contractorPoRef}
                      onChange={(e) => setContractorPoRef(e.target.value)}
                      placeholder="PO-2026-..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      تاريخ الاستلام الفعلي:
                    </label>
                    <input
                      type="date"
                      value={custodyDate}
                      onChange={(e) => setCustodyDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}

              {/* MODEL 2: TECHNICIAN FIELDS */}
              {receiptModel === 'TECH_CUSTODY' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      اسم الفني / الموظف المستلم:
                    </label>
                    <input
                      type="text"
                      value={techName}
                      onChange={(e) => setTechName(e.target.value)}
                      placeholder="اسم الموظف ثلاثياً..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      الرقم الوظيفي (ID):
                    </label>
                    <input
                      type="text"
                      value={techEmpId}
                      onChange={(e) => setTechEmpId(e.target.value)}
                      placeholder="مثلاً: EMP-1045"
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      الإدارة / القسم التابع له:
                    </label>
                    <input
                      type="text"
                      value={techDept}
                      onChange={(e) => setTechDept(e.target.value)}
                      placeholder="مثلاً: قسم صيانة الشبكات والري..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      المسمى الوظيفي:
                    </label>
                    <input
                      type="text"
                      value={techJobTitle}
                      onChange={(e) => setTechJobTitle(e.target.value)}
                      placeholder="مثلاً: فني ميكانيكا أول / كهربائي..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      المشرف المباشر:
                    </label>
                    <input
                      type="text"
                      value={techSupervisor}
                      onChange={(e) => setTechSupervisor(e.target.value)}
                      placeholder="اسم المشرف أو رئيس القسم..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      تاريخ تسليم العهدة:
                    </label>
                    <input
                      type="date"
                      value={custodyDate}
                      onChange={(e) => setCustodyDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}

              {/* MODEL 3: TOOLS & ASSETS FIELDS */}
              {receiptModel === 'TOOLS_ASSETS' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      الطرف الأول (المسلّم / القائم بالتسليم):
                    </label>
                    <input
                      type="text"
                      value={assetsDeliveringParty}
                      onChange={(e) => setAssetsDeliveringParty(e.target.value)}
                      placeholder="اسم المسلّم / أمين المخازن..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      الطرف الثاني (المستلم / المنقول إليه):
                    </label>
                    <input
                      type="text"
                      value={assetsReceivingParty}
                      onChange={(e) => setAssetsReceivingParty(e.target.value)}
                      placeholder="اسم المستلم / المهندس المنقول إليه..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      الموقع / المحطة / المنشأة:
                    </label>
                    <input
                      type="text"
                      value={assetsLocation}
                      onChange={(e) => setAssetsLocation(e.target.value)}
                      placeholder="مثلاً: محطة الرفع الرئيسية رقم 2..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      تصنيف الأصل والمعدات:
                    </label>
                    <input
                      type="text"
                      value={assetsCategory}
                      onChange={(e) => setAssetsCategory(e.target.value)}
                      placeholder="طلمبات غاطسة / لوحات تحكم PLC..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      مهندس الصيانة المسؤول:
                    </label>
                    <input
                      type="text"
                      value={assetsEngineer}
                      onChange={(e) => setAssetsEngineer(e.target.value)}
                      placeholder="اسم مهندس الصيانة والتشغيل..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      تاريخ إجراء المعاينة والتسليم:
                    </label>
                    <input
                      type="date"
                      value={custodyDate}
                      onChange={(e) => setCustodyDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}

              {/* MODEL 4: TECHNICAL INSPECTION FIELDS */}
              {receiptModel === 'TECHNICAL_INSPECTION' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 800, display: 'block', marginBottom: '0.25rem' }}>
                      القسم الهندسي المختص بالفحص:
                    </label>
                    <select
                      value={inspectionDeptKey}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 800, borderColor: '#0284c7', background: 'rgba(2, 132, 199, 0.05)' }}
                    >
                      {Object.values(DEPARTMENT_INSPECTION_CONFIGS).map(cfg => (
                        <option key={cfg.key} value={cfg.key}>{cfg.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      صفة ومسمى الفاحص الفني:
                    </label>
                    <input
                      type="text"
                      value={inspectorRole}
                      onChange={(e) => setInspectorRole(e.target.value)}
                      placeholder="مشرف الكهرباء / مهندس التنفيذ..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      اسم المهندس / المشرف الفاحص:
                    </label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      placeholder="م / محمود متولي..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      المورد / الشركة الموردة:
                    </label>
                    <input
                      type="text"
                      value={inspectionSupplier}
                      onChange={(e) => setInspectionSupplier(e.target.value)}
                      placeholder="شركة جودة الكتريك / المورد..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      أذون الإضافة / أمر التوريد:
                    </label>
                    <input
                      type="text"
                      value={inspectionDeliveryRef}
                      onChange={(e) => setInspectionDeliveryRef(e.target.value)}
                      placeholder="أذون إضافة رقم [ 268 ، 269 ، 270 ]..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      أمين المخازن المختص:
                    </label>
                    <input
                      type="text"
                      value={custodyStorekeeper}
                      onChange={(e) => setCustodyStorekeeper(e.target.value)}
                      placeholder="أ / محمد حلمي..."
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                      تاريخ الفحص والتوريد:
                    </label>
                    <input
                      type="date"
                      value={custodyDate}
                      onChange={(e) => setCustodyDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. OFFICIAL PREAMBLE BOX (الديباجة الرسمية المعتمدة) */}
            <div style={{
              background: activeModelMeta.badgeBg,
              borderRight: `4px solid ${activeModelMeta.borderColor}`,
              padding: '1rem 1.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              lineHeight: 1.7,
              color: 'var(--text-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: activeModelMeta.badgeColor, marginBottom: '0.35rem' }}>
                <BookOpen size={17} />
                <span>الديباجة الرسمية المعتمدة للمحضر:</span>
              </div>
              <div>
                {receiptModel === 'COMPANY_CUSTODY' && (
                  <span>
                    بناءً على أمر الإسناد / التعاقد رقم (<strong>{contractorPoRef || '................'}</strong>) الخاص بمشروع (<strong>{contractorProject || 'الموقع المحدد'}</strong>)، تم بموجب هذا المحضر في تاريخ (<strong>{custodyDate}</strong>) تسليم الأصناف والعدد والمعدات الموضحة بياناتها بالكشف أدناه إلى ممثل شركة (<strong>{contractorCompany || 'المقاول المذكور'}</strong>)، وذلك لاستخدامها حصراً في تنفيذ الأعمال المتفق عليها، بحالة تشغيلية ممتازة وخالية من أي عيوب فنية أو ظاهرة، ووفقاً للبنود والإقرار القانوني الموضح بنهاية المحضر.
                  </span>
                )}
                {receiptModel === 'TECH_CUSTODY' && (
                  <span>
                    تم بموجب هذا المحضر في تاريخ (<strong>{custodyDate}</strong>) تسليم الأصناف والأدوات وأجهزة الفحص والقياس المبينة بالكشف أدناه إلى السيد/ (<strong>{techName || 'الموظف المذكور'}</strong>)، العامل بإدارة (<strong>{techDept || 'الصيانة والتشغيل'}</strong>)، بوظيفة (<strong>{techJobTitle || 'فني صيانة'}</strong>)، وذلك كعهدة شخصية طرفه لمباشرة الأعمال والمهام الوظيفية الموكلة إليه، وقد تمت المعاينة والتأكد من سلامتها وجودتها للعمل.
                  </span>
                )}
                {receiptModel === 'TOOLS_ASSETS' && (
                  <span>
                    تم بموجب هذا المحضر في تاريخ (<strong>{custodyDate}</strong>) بموقع (<strong>{assetsLocation || 'الموقع العام'}</strong>)، معاينة وفحص وتسليم الأصول والمعدات الاستراتيجية المبينة بالكشف أدناه فنياً وظاهرياً، بحضور الطرفين المسلّم والمستلم، وقد تبين مطابقتها التامة للمواصفات الفنية وجاهزيتها التشغيلية، وبناءً عليه انتقلت الحيازة والمسؤولية الإشرافية والتشغيلية للأصل من الطرف الأول (<strong>{assetsDeliveringParty || 'المسلّم'}</strong>) إلى الطرف الثاني (<strong>{assetsReceivingParty || 'المستلم'}</strong>).
                  </span>
                )}
                {receiptModel === 'TECHNICAL_INSPECTION' && (
                  <div>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 800, color: '#0284c7' }}>
                        ديباجة الفحص الفني المعتمدة لقسم ({DEPARTMENT_INSPECTION_CONFIGS[inspectionDeptKey]?.label}):
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        (يمكنك التعديل والإضافة المباشرة على نص الديباجة بحرية)
                      </span>
                    </div>
                    <textarea
                      value={inspectionPreamble}
                      onChange={(e) => setInspectionPreamble(e.target.value)}
                      rows={3}
                      className="input-field"
                      style={{
                        width: '100%',
                        fontSize: '0.88rem',
                        lineHeight: 1.6,
                        padding: '0.75rem',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1.5px solid rgba(2, 132, 199, 0.4)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 4. SMART INLINE ITEM SEARCH & ADD BAR */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: `1.5px solid ${activeModelMeta.borderColor}`,
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: activeModelMeta.badgeColor, fontWeight: 900, fontSize: '0.95rem' }}>
                  <Search size={18} />
                  <span>البحث في أصناف ومعدات المخزن وإدراجها مباشرة بالعهدة:</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  يمكنك كتابة اسم أو كود الصنف للاختيار من المخزن، أو كتابة صنف مخصص يدويًا
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
                
                {/* 1. Search with Live Autocomplete */}
                <div style={{ gridColumn: 'span 2', position: 'relative', minWidth: '260px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    اسم أو كود الصنف / المعدة (بحث من المخزن):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={inlineSearchText}
                      onChange={(e) => {
                        setInlineSearchText(e.target.value);
                        setSelectedDbItem(null);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="ابحث بالاسم أو الكود (مثل: دريل، طلمبة، كابل، محبس...)"
                      className="input-field"
                      style={{ width: '100%', paddingLeft: selectedDbItem ? '5rem' : '1rem', fontWeight: 700, borderColor: selectedDbItem ? activeModelMeta.borderColor : 'var(--border-light)' }}
                    />
                    {selectedDbItem && (
                      <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 800, background: activeModelMeta.badgeBg, color: activeModelMeta.badgeColor, padding: '2px 6px', borderRadius: '4px' }}>
                        [{selectedDbItem.code || 'مخزن'}]
                      </span>
                    )}
                  </div>

                  {/* Autocomplete dropdown floating menu */}
                  {isDropdownOpen && matchingDbItems.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      left: 0,
                      zIndex: 1000,
                      background: 'var(--bg-secondary)',
                      border: `1.5px solid ${activeModelMeta.borderColor}`,
                      borderRadius: '10px',
                      marginTop: '4px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.25)'
                    }}>
                      {matchingDbItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectDbItem(item)}
                          style={{
                            padding: '0.65rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = activeModelMeta.badgeBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{item.name}</span>
                            <span style={{ marginRight: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace', color: activeModelMeta.badgeColor, fontWeight: 700 }}>
                              [{item.code || '—'}]
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 7px', borderRadius: '6px' }}>
                            رصيد: {item.stock || 0} {item.unit || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Quantity */}
                <div style={{ minWidth: '75px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    الكمية:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inlineQty}
                    onChange={(e) => setInlineQty(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', textAlign: 'center', fontWeight: 800 }}
                  />
                </div>

                {/* 3. Unit */}
                <div style={{ minWidth: '75px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    الوحدة:
                  </label>
                  <input
                    type="text"
                    value={inlineUnit}
                    onChange={(e) => setInlineUnit(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>

                {/* 4. Serial Number */}
                <div style={{ minWidth: '130px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    الرقم التسلسلي (S/N):
                  </label>
                  <input
                    type="text"
                    value={inlineSerial}
                    onChange={(e) => setInlineSerial(e.target.value)}
                    placeholder="سيريال إن وجد..."
                    className="input-field"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.82rem' }}
                  />
                </div>

                {/* 5. Condition */}
                <div style={{ minWidth: '130px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    حالة التسليم:
                  </label>
                  <select
                    value={inlineCondition}
                    onChange={(e) => setInlineCondition(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <option value="سليم وجديد">سليم وجديد</option>
                    <option value="صالح للعمل ومستعمل">صالح للعمل ومستعمل</option>
                    <option value="يحتاج صيانة طفيفة">يحتاج صيانة طفيفة</option>
                  </select>
                </div>

                {/* 6. Notes */}
                <div style={{ minWidth: '130px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    ملاحظات فحص:
                  </label>
                  <input
                    type="text"
                    value={inlineNotes}
                    onChange={(e) => setInlineNotes(e.target.value)}
                    placeholder="ملاحظات..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>

                {/* 7. Action Button */}
                <div style={{ minWidth: '140px' }}>
                  <button
                    type="button"
                    onClick={handleAddInlineItem}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1rem',
                      background: activeModelMeta.badgeColor,
                      borderColor: activeModelMeta.badgeColor,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} />
                    <span>+ إدراج بالعهدة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. ITEMS & EQUIPMENT TABLE */}
            <div style={{ marginBottom: '1.5rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
              <table className="wms-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '45px' }}>م</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>كود الأصل/العهدة</th>
                    <th style={{ textAlign: 'right', minWidth: '240px' }}>اسم الصنف / الأداة / المعدة</th>
                    <th style={{ textAlign: 'center', width: '95px' }}>الكمية</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>الرقم التسلسلي (S/N)</th>
                    <th style={{ textAlign: 'center', width: '140px' }}>حالة التسليم</th>
                    <th style={{ textAlign: 'center', width: '150px' }}>حالة العهدة</th>
                    <th style={{ textAlign: 'center', minWidth: '150px' }}>ملاحظات الفحص الفني</th>
                    <th style={{ textAlign: 'center', width: '50px' }}>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustodyRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                        لم تقم بإدراج أي أصناف بعد في هذا المحضر. استخدم شريط البحث الموضح أعلاه لاختيار الصنف من المخزن وإدراجه مباشرة في الجدول.
                      </td>
                    </tr>
                  ) : (
                    filteredCustodyRows.map((row, idx) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: activeModelMeta.badgeColor }}>{row.itemCode}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.itemName}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>{row.qty} {row.unit}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{row.serialNo}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                            {row.condition}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            value={row.status}
                            onChange={(e) => handleChangeCustodyStatus(row.id, e.target.value)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              background: row.status === 'مطابق للمواصفات' || row.status === 'سارية ومستمرة' ? 'rgba(16, 185, 129, 0.15)' : (row.status === 'به ملاحظات فنية' || row.status === 'تم إرجاعها للمخزن' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                              color: row.status === 'مطابق للمواصفات' || row.status === 'سارية ومستمرة' ? '#059669' : (row.status === 'به ملاحظات فنية' || row.status === 'تم إرجاعها للمخزن' ? '#d97706' : '#dc2626'),
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {receiptModel === 'TECHNICAL_INSPECTION' ? (
                              <>
                                <option value="مطابق للمواصفات">مطابق للمواصفات ✅</option>
                                <option value="به ملاحظات فنية">به ملاحظات فنية ⚠️</option>
                                <option value="مرفوض وغير مطابق">مرفوض وغير مطابق ❌</option>
                              </>
                            ) : (
                              <>
                                <option value="سارية ومستمرة">سارية ومستمرة</option>
                                <option value="تم إرجاعها للمخزن">تم إرجاعها للمخزن</option>
                                <option value="قيد الفحص والصيانة">قيد الفحص والصيانة</option>
                                <option value="تالفة / مفقودة">تالفة / مفقودة</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {row.notes || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustodyRow(row.id)}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem' }}
                            title="حذف البند"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. OFFICIAL LEGAL CLAUSES & UNDERTAKING (البنود والإقرار القانوني) */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '2rem',
              fontSize: '0.86rem',
              lineHeight: 1.75,
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.92rem' }}>
                <ScrollText size={18} style={{ color: activeModelMeta.badgeColor }} />
                <span>البنود والشروط والإقرار القانوني الملزم:</span>
              </div>
              
              {receiptModel === 'COMPANY_CUSTODY' && (
                <div>
                  <strong>• إقرار وتعهد قانوني ملزم (شركة / مقاول باطن):</strong> أقر أنا الموقع أدناه، بصفتي الممثل القانوني والمفوض رسمياً عن شركة (<strong>{contractorCompany || 'المقاول المذكور'}</strong>)، بأننا استلمنا الأصناف والمعدات المبينة بياناتها وأعدادها وأرقامها التسلسلية بالكشف أعلاه بحالة تشغيلية سليمة وصالحة للعمل تماماً، ونتعهد بالمحافظة التامة عليها وتشغيلها بمعرفة فنيين متخصصين وحصراً في أعمال المشروع، وإجراء الصيانة الوقائية اللازمة لها، كما نتحمل المسؤولية القانونية والمالية والتعويضية الكاملة عن أي تلف أو فقد أو هلاك ناتج عن سوء التشغيل أو الإهمال، ونتعهد بردها فور انتهاء الأعمال أو عند طلب إدارة المنشأة بحالتها التي استلمت عليها.
                </div>
              )}

              {receiptModel === 'TECH_CUSTODY' && (
                <div>
                  <strong>• إقرار وتعهد باستلام عهدة شخصية (وفقاً للائحة العمل):</strong> أقر أنا الموقع أدناه بأنني استلمت كافة الأدوات والمعدات والأجهزة الموضحة بياناتها وأرقامها التسلسلية أعلاه كعهدة شخصية طرفي، بحالة جيدة وصالحة للتشغيل، وأتعهد بالمحافظة التامة عليها واستخدامها فقط في تنفيذ الأعمال المكلف بها رسمياً من قبل الإدارة وعدم إعارتها أو إخراجها خارج نطاق العمل، كما أتعهد بردها فوراً للمخازن عند طلبها أو عند إخلاء الطرف أو إنهاء خدمتي، وأوافق صراحة على قيام إدارة الشركة باتخاذ الإجراءات الإدارية وخصم قيمتها الإجمالية من مستحقاتي وراتبي في حال الفقد أو التلف العمدي أو الإهمال الجسيم وفقاً للائحة العمل المنظمة.
                </div>
              )}

              {receiptModel === 'TOOLS_ASSETS' && (
                <div>
                  <strong>• إقرار انتقال الحيازة والمسؤولية التشغيلية:</strong> يقر الطرف الثاني (المستلم) بأنه عاين الأصول والمعدات والأدوات المذكورة بالكشف أعلاه معاينة فنية نافية للجهالة، وتأكد من سلامتها التشغيلية ومطابقة بياناتها ولوحاتها الاسمية (Nameplate) وسيريال التشغيل، ويتعهد بتحمل المسؤولية الكاملة عن تشغيلها وصيانتها وحمايتها في الموقع المحدد، ولا يجوز نقلها أو تعديل مسارها التشغيلي إلا بموافقة كتابية مسبقة من الإدارة الهندسية والمستودعات.
                </div>
              )}

              {receiptModel === 'TECHNICAL_INSPECTION' && (
                <div>
                  <strong>• إقرار الفحص والمعاينة الفنية والمطابقة ({inspectorRole} : {inspectorName}): </strong>
                  تمت المعاينة الفنية والظاهرية لكافة المهمات ومستلزمات المشروع الموضحة بياناتها وأعدادها بالكشف أعلاه على الطبيعة، وثبتت مطابقتها التامة للمواصفات الفنية القياسية المعتمدة وأصول الصنعة وخلوها من أي عيوب تصنيع، وتم التصريح بإيداعها بمخازن المشروع وإضافتها إلكترونياً بالمنظومة.
                  <br/><br/>
                  <strong>• إقرار الاستلام والتوريد المخزني (أمين المخازن : {custodyStorekeeper || 'مسؤول المستودع المعتمد'}): </strong>
                  تم استلام الأصناف الواردة بالكشف أعلاه فعلياً بالعدد والوزن، وتسكينها بمخازن المشروع وإضافتها إلكترونياً بالمنظومة بموجب أذون الإضافة الموضحة أعلاه، والأرصدة مطابقة دفترياً وميدانياً.
                </div>
              )}
            </div>

            {/* 6. THE OFFICIAL SIGNATURE MATRIX (سلسلة الاعتمادات والتوقيعات والأختام) */}
            <div style={{ borderTop: '2px solid var(--border-light)', paddingTop: '1.25rem' }}>
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Stamp size={18} style={{ color: activeModelMeta.badgeColor }} />
                <span>سلسلة الاعتمادات والتوقيعات والأختام الرسمية المعتمدة (Official Approval Matrix)</span>
              </div>

              {/* MODEL 1 SIGNATURES */}
              {receiptModel === 'COMPANY_CUSTODY' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>المستلم (المفوض عن المقاول)</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>{contractorRepName || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع والختم: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>المسلّم (أمين المخازن)</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: '0.35rem 0', fontWeight: 700 }}>{custodyStorekeeper || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>مهندس الإشراف والموقع</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>إشراف فني</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: `1px solid ${activeModelMeta.borderColor}`, padding: '0.85rem', borderRadius: '10px', background: activeModelMeta.badgeBg }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: activeModelMeta.badgeColor }}>مدير المشروع / الإدارة التنفيذية</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>اعتماد نهائي</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>الختم والتوقيع: ....................</div>
                  </div>
                </div>
              )}

              {/* MODEL 2 SIGNATURES */}
              {receiptModel === 'TECH_CUSTODY' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>الفني المستلم (المتعهد)</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>{techName || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع والبصمة: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>المسلّم (أمين المخازن)</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: '0.35rem 0', fontWeight: 700 }}>{custodyStorekeeper || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>المشرف المباشر / رئيس القسم</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>{techSupervisor || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: `1px solid ${activeModelMeta.borderColor}`, padding: '0.85rem', borderRadius: '10px', background: activeModelMeta.badgeBg }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: activeModelMeta.badgeColor }}>الشؤون الإدارية والموارد البشرية</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>قيد بالملف الوظيفي</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>الختم والاعتماد: ....................</div>
                  </div>
                </div>
              )}

              {/* MODEL 3 SIGNATURES */}
              {receiptModel === 'TOOLS_ASSETS' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>الطرف الأول (المسلّم)</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>{assetsDeliveringParty || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>الطرف الثاني (المستلم)</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>{assetsReceivingParty || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '0.85rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>مهندس الصيانة والتشغيل</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.35rem 0' }}>{assetsEngineer || 'معاينة فنية'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: `1px solid ${activeModelMeta.borderColor}`, padding: '0.85rem', borderRadius: '10px', background: activeModelMeta.badgeBg }}>
                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: activeModelMeta.badgeColor }}>اعتماد مدير الإدارة الهندسية</div>
                    <div style={{ fontSize: '0.78rem', color: activeModelMeta.badgeColor, margin: '0.35rem 0', fontWeight: 700 }}>سجل الأصول الثابتة</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>الختم والاعتماد: ....................</div>
                  </div>
                </div>
              )}

              {/* MODEL 4 SIGNATURES (Rule 3 Approved 3-Party Matrix) */}
              {receiptModel === 'TECHNICAL_INSPECTION' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', textAlign: 'center' }}>
                  <div style={{ border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#0284c7' }}>المعاين والفاحص الفني</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: '0.45rem 0', fontWeight: 800 }}>
                      {inspectorRole} : {inspectorName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '10px', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>أمين المخزن</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: '0.45rem 0', fontWeight: 800 }}>
                      امين المخازن : {custodyStorekeeper || 'أ / محمد حلمي'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>التوقيع: ....................</div>
                  </div>

                  <div style={{ border: `1.5px solid ${activeModelMeta.borderColor}`, padding: '1rem', borderRadius: '10px', background: activeModelMeta.badgeBg }}>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: activeModelMeta.badgeColor }}>يعتمد / قائد الفريق والمشرف المعتمد</div>
                    <div style={{ fontSize: '0.82rem', color: activeModelMeta.badgeColor, margin: '0.45rem 0', fontWeight: 800 }}>
                      قائد فريق المرافق (Team Leader) / المشرف المسؤول (Supervisor)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>الختم والاعتماد: ....................</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: ADD REAL ITEM TO CUSTODY */}
      {/* ========================================================================= */}
      {showAddCustodyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="enterprise-card animate-fade-in" style={{ maxWidth: '550px', width: '100%', background: 'var(--bg-secondary)', border: `2px solid ${activeModelMeta.borderColor}`, padding: '1.5rem', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: activeModelMeta.badgeColor, fontWeight: 800 }}>
                <Plus size={20} />
                <span>إضافة صنف أو معدة إلى محضر الاستلام والعهدة</span>
              </div>
              <button onClick={() => setShowAddCustodyModal(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Option A: Select from Inventory Items */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  اختر من أصناف ومعدات المخزن الفعلية:
                </label>
                <select
                  value={newCustodyItem.selectedItemId}
                  onChange={(e) => setNewCustodyItem({ ...newCustodyItem, selectedItemId: e.target.value, customName: '' })}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">-- أو كتابة صنف مخصص بالأسفل --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.code || '—'}] {item.name} - (الرصيد: {item.stock || 0} {item.unit || ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Option B: Custom item name if not in stock */}
              {!newCustodyItem.selectedItemId && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    اسم الأداة / المعدة (صنف يدوي أو أصل ثابت):
                  </label>
                  <input
                    type="text"
                    value={newCustodyItem.customName}
                    onChange={(e) => setNewCustodyItem({ ...newCustodyItem, customName: e.target.value })}
                    placeholder="مثلاً: دريل هلتي كهربائي، ماكينة لحام، جهاز أفوميتر..."
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {/* Qty & Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    الكمية المسلمة:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCustodyItem.qty}
                    onChange={(e) => setNewCustodyItem({ ...newCustodyItem, qty: Number(e.target.value) })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    الوحدة:
                  </label>
                  <input
                    type="text"
                    value={newCustodyItem.unit}
                    onChange={(e) => setNewCustodyItem({ ...newCustodyItem, unit: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Serial & Condition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    الرقم التسلسلي / السيريال (إن وجد):
                  </label>
                  <input
                    type="text"
                    value={newCustodyItem.serialNo}
                    onChange={(e) => setNewCustodyItem({ ...newCustodyItem, serialNo: e.target.value })}
                    placeholder="S/N: ..."
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    حالة الصنف عند التسليم:
                  </label>
                  <select
                    value={newCustodyItem.condition}
                    onChange={(e) => setNewCustodyItem({ ...newCustodyItem, condition: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="سليم وجديد">سليم وجديد</option>
                    <option value="صالح للعمل ومستعمل">صالح للعمل ومستعمل</option>
                    <option value="يحتاج صيانة طفيفة">يحتاج صيانة طفيفة</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  ملاحظات إضافية:
                </label>
                <input
                  type="text"
                  value={newCustodyItem.notes}
                  onChange={(e) => setNewCustodyItem({ ...newCustodyItem, notes: e.target.value })}
                  placeholder="أي ملحقات إضافية أو ملاحظات فحص..."
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleAddCustodyItem}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.65rem', background: activeModelMeta.badgeColor, borderColor: activeModelMeta.badgeColor, fontWeight: 800 }}
                >
                  حفظ وإدراج في الكشف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustodyModal(false)}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* 6. OFFICIAL A4 PRINT MODAL: WORK COMPLETION */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="modal-backdrop-print-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content-print-wrapper" style={{ maxWidth: '900px', width: '100%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#0f172a', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div className="hide-on-print" style={{ padding: '1rem 1.5rem', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Printer size={18} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>معاينة وطباعة محضر إنهاء وتسوية الأعمال (A4 الرسمي)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  <Printer size={15} />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="hide-on-print" style={{ padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.75rem' }}>رقم أمر الشغل بالوثيقة:</span>
                <input
                  type="text"
                  value={workOrderRef}
                  onChange={(e) => setWorkOrderRef(e.target.value)}
                  placeholder="مثلاً: WO-2026-..."
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.75rem' }}>المهندس المسؤول عن التنفيذ:</span>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  placeholder="اسم المهندس المسؤول..."
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.75rem' }}>أمين المخازن المختص:</span>
                <input
                  type="text"
                  value={storekeeperName}
                  onChange={(e) => setStorekeeperName(e.target.value)}
                  placeholder="اسم أمين المخزن..."
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.75rem' }}>الاعتماد النهائي:</span>
                <select
                  value={finalApproverRole}
                  onChange={(e) => setFinalApproverRole(e.target.value as FinalApproverRole)}
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <option value="MAINTENANCE_MANAGER">مدير إدارة الصيانة والتشغيل</option>
                  <option value="EXECUTIVE">المدير التنفيذي (CEO)</option>
                </select>
              </div>
            </div>

            <div className="printable-modal-paper" style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#ffffff', fontFamily: 'Tajawal, sans-serif' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>منظومة Stockly لإدارة المشروعات والمستودعات</h2>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>إدارة التشغيل والصيانة والشبكات • منظومة WMS</p>
                </div>

                <div style={{ textAlign: 'center', padding: '0.5rem 1.25rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#099A75' }}>محضر إنهاء وتسوية أعمال</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                    {workOrderRef ? `أمر شغل: ${workOrderRef}` : `تاريخ: ${new Date().toLocaleDateString('ar-EG')}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div><strong>الموقع / العمارة:</strong> {searchQuery || 'الموقع العام'}</div>
                <div><strong>جهة التوريد / القسم:</strong> {selectedDept !== 'all' ? selectedDept : 'كافة الأقسام'}</div>
                <div><strong>تاريخ التقرير:</strong> {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              <table style={{ width: '100%', maxWidth: '100%', minWidth: 0, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '1rem', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#0f172a' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '4%', textAlign: 'center' }}>م</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '32%', textAlign: 'right' }}>اسم الصنف والوصف تفصيلياً</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '10%', textAlign: 'center' }}>رقم الإذن</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '9%', textAlign: 'center' }}>المنصرف</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '9%', textAlign: 'center', background: '#ecfdf5', color: '#047857' }}>المركب</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '9%', textAlign: 'center', background: '#f5f3ff', color: '#6d28d9' }}>المرتجع</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '13%', textAlign: 'center' }}>مكان التركيب</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '14%', textAlign: 'center' }}>بيان الاستخدام</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'right', fontWeight: 700 }}>{r.itemName}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontFamily: 'monospace' }}>{r.invoiceNo}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 700 }}>{r.issuedQty} {r.unit}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 900, color: '#047857', background: '#ecfdf5' }}>{r.installedQty} {r.unit}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 900, color: '#6d28d9', background: '#f5f3ff' }}>{r.returnedQty} {r.unit}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center' }}>{r.location || '—'}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 700 }}>{r.usageType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', marginBottom: '1.25rem' }}>
                <strong>• إقرار تسوية المرتجع:</strong> تم توريد واستلام الكميات المرتجعة الموضحة أعلاه بالمخزن وإثباتها بدفاتر وأرصدة المخزن، وتطابق الأعداد والمنصرف مع ما ركب على أرض الواقع.
              </div>

              <div style={{ borderTop: '2px solid #0f172a', paddingTop: '0.75rem' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.75rem' }}>
                  سلسلة الاعتمادات والتسوية الرسمية (Official Approval Matrix)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>المهندس المسؤول / المنفذ</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{engineerName || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>أمين المخازن المختص</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{storekeeperName || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>مهندس الإشراف الفني</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{supervisorName || '..............................'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                  </div>

                  <div style={{ border: '1px solid #93c5fd', padding: '0.6rem', borderRadius: '6px', background: '#eff6ff' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e40af' }}>
                      {finalApproverRole === 'MAINTENANCE_MANAGER' ? 'مدير إدارة الصيانة والتشغيل' : 'المدير التنفيذي (CEO)'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', margin: '0.2rem 0' }}>اعتماد نهائي</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>الختم والتوقيع: ......................</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. OFFICIAL A4 PRINT MODAL: CUSTODY / HANDOVER (TAILORED TO ACTIVE MODEL) */}
      {/* ========================================================================= */}
      {isCustodyPrintModalOpen && (
        <div className="modal-backdrop-print-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="modal-content-print-wrapper" style={{ maxWidth: '900px', width: '100%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#0f172a', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div className="hide-on-print" style={{ padding: '1rem 1.5rem', background: activeModelMeta.badgeColor, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Printer size={18} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>معاينة وطباعة {activeModelMeta.title} (A4 الرسمي)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, background: '#0f172a', borderColor: '#0f172a' }}
                >
                  <Printer size={15} />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setIsCustodyPrintModalOpen(false)}
                  style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="printable-modal-paper" style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#ffffff', fontFamily: 'Tajawal, sans-serif' }}>
              
              {/* Document Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${activeModelMeta.badgeColor}`, paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {receiptModel === 'TECHNICAL_INSPECTION'
                      ? 'منظومة ستوكلي لإدارة المستودعات وسلاسل الإمداد'
                      : 'منظومة Stockly لإدارة المشروعات والمستودعات'}
                  </h2>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
                    {receiptModel === 'TECHNICAL_INSPECTION'
                      ? `الموضوع: محضر فحص فني ومطابقة مواصفات وتوريد مخزني (${DEPARTMENT_INSPECTION_CONFIGS[inspectionDeptKey]?.label || 'عام'})`
                      : 'Stockly Intelligent Warehouse Management • إدارة المستودعات وسجل الأصول'}
                  </p>
                </div>

                <div style={{ textAlign: 'center', padding: '0.5rem 1.25rem', borderRadius: '10px', background: '#f8fafc', border: `1px solid ${activeModelMeta.badgeColor}` }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: activeModelMeta.badgeColor }}>
                    {activeModelMeta.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                    رقم المحضر: {custodyDocNo}
                  </div>
                </div>
              </div>

              {/* Handover Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {receiptModel === 'COMPANY_CUSTODY' && (
                  <>
                    <div><strong>الشركة المستلمة:</strong> {contractorCompany || '..............................'}</div>
                    <div><strong>اسم المفوض:</strong> {contractorRepName || '..............................'}</div>
                    <div><strong>الرقم القومي:</strong> {contractorRepId || '..............................'}</div>
                    <div><strong>المشروع / الموقع:</strong> {contractorProject || '..............................'}</div>
                    <div><strong>رقم العقد / الإسناد:</strong> {contractorPoRef || '..............................'}</div>
                    <div><strong>تاريخ الاستلام:</strong> {custodyDate}</div>
                  </>
                )}
                {receiptModel === 'TECH_CUSTODY' && (
                  <>
                    <div><strong>اسم الفني المستلم:</strong> {techName || '..............................'}</div>
                    <div><strong>الرقم الوظيفي:</strong> {techEmpId || '..............................'}</div>
                    <div><strong>القسم / الإدارة:</strong> {techDept || 'الصيانة والتشغيل'}</div>
                    <div><strong>المسمى الوظيفي:</strong> {techJobTitle || 'فني صيانة'}</div>
                    <div><strong>المشرف المسؤول:</strong> {techSupervisor || '..............................'}</div>
                    <div><strong>تاريخ الاستلام:</strong> {custodyDate}</div>
                  </>
                )}
                {receiptModel === 'TOOLS_ASSETS' && (
                  <>
                    <div><strong>الطرف الأول (المسلّم):</strong> {assetsDeliveringParty || '..............................'}</div>
                    <div><strong>الطرف الثاني (المستلم):</strong> {assetsReceivingParty || '..............................'}</div>
                    <div><strong>الموقع / المحطة:</strong> {assetsLocation || '..............................'}</div>
                    <div><strong>تصنيف الأصول:</strong> {assetsCategory || 'أصول ومعدات'}</div>
                    <div><strong>مهندس الصيانة:</strong> {assetsEngineer || '..............................'}</div>
                    <div><strong>تاريخ الاستلام:</strong> {custodyDate}</div>
                  </>
                )}
                {receiptModel === 'TECHNICAL_INSPECTION' && (
                  <>
                    <div><strong>الجهة الموردة / الشركة:</strong> {inspectionSupplier || 'شركة جودة الكتريك للتوريدات'}</div>
                    <div><strong>القسم الفني الفاحص:</strong> {DEPARTMENT_INSPECTION_CONFIGS[inspectionDeptKey]?.label || 'عام'}</div>
                    <div><strong>رقم أذون الإضافة / الفاتورة:</strong> {inspectionDeliveryRef || '..............................'}</div>
                    <div><strong>المشروع / الموقع:</strong> {inspectionProject}</div>
                    <div><strong>أمين المخزن المستلم:</strong> {custodyStorekeeper || 'أ / محمد حلمي'}</div>
                    <div><strong>تاريخ الفحص والاستلام:</strong> {custodyDate}</div>
                  </>
                )}
              </div>

              {/* Printable Preamble */}
              <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRight: `3px solid ${activeModelMeta.badgeColor}`, borderRadius: '6px', fontSize: '0.82rem', color: '#1e293b', marginBottom: '1rem', lineHeight: 1.6 }}>
                <strong>• الديباجة الرسمية: </strong>
                {receiptModel === 'COMPANY_CUSTODY' && (
                  <span>بناءً على أمر الإسناد رقم ({contractorPoRef || '—'}) لمشروع ({contractorProject || 'الموقع'})، تم تسليم الأصناف والعدد والمعدات الموضحة أدناه إلى ممثل شركة ({contractorCompany || 'المقاول'}) بحالة سليمة للتشغيل في أعمال المشروع وفقاً للشروط أدناه.</span>
                )}
                {receiptModel === 'TECH_CUSTODY' && (
                  <span>تم تسليم الأصناف والأدوات المبينة أدناه إلى السيد/ ({techName || 'الموظف'}) بإدارة ({techDept}) كعهدة شخصية طرفه لمباشرة أعماله، وقد تمت المعاينة والتأكد من صلاحيتها للعمل.</span>
                )}
                {receiptModel === 'TOOLS_ASSETS' && (
                  <span>تم بموقع ({assetsLocation || 'الموقع'}) معاينة وفحص وتسليم الأصول والمعدات الاستراتيجية المبينة أدناه بحضور الطرفين، وانتقلت الحيازة والمسؤولية التشغيلية للطرف المستلم اعتباراً من تاريخه.</span>
                )}
                {receiptModel === 'TECHNICAL_INSPECTION' && (
                  <span>{inspectionPreamble}</span>
                )}
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', maxWidth: '100%', minWidth: 0, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '1rem', border: '1px solid #cbd5e1' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#0f172a' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '4%', textAlign: 'center' }}>م</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '12%', textAlign: 'center' }}>كود الصنف</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '30%', textAlign: 'right' }}>
                      {receiptModel === 'TECHNICAL_INSPECTION' ? 'اسم الصنف / الخامة الموردة' : 'اسم الأداة / العهدة / المعدة'}
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '8%', textAlign: 'center' }}>الكمية</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '14%', textAlign: 'center' }}>
                      {receiptModel === 'TECHNICAL_INSPECTION' ? 'رقم الإذن / السيريال' : 'الرقم التسلسلي'}
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '14%', textAlign: 'center' }}>
                      {receiptModel === 'TECHNICAL_INSPECTION' ? 'الحالة الفنية والمطابقة' : 'حالة التسليم'}
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '0.4rem', width: '18%', textAlign: 'center' }}>
                      {receiptModel === 'TECHNICAL_INSPECTION' ? 'تقرير الفحص والملاحظات' : 'ملاحظات الفحص'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {custodyRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontFamily: 'monospace' }}>{r.itemCode}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'right', fontWeight: 700 }}>{r.itemName}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: 700 }}>{r.qty} {r.unit}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontFamily: 'monospace' }}>{r.serialNo || '—'}</td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center', fontWeight: receiptModel === 'TECHNICAL_INSPECTION' ? 700 : 'normal' }}>
                        {receiptModel === 'TECHNICAL_INSPECTION' ? (r.status || 'مطابق للمواصفات ✅') : r.condition}
                      </td>
                      <td style={{ border: '1px solid #cbd5e1', padding: '0.35rem', textAlign: 'center' }}>{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legal Undertaking Declaration */}
              <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.82rem', color: '#78350f', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {receiptModel === 'COMPANY_CUSTODY' && (
                  <span>
                    <strong>• إقرار وتعهد قانوني ملزم (شركة / مقاول باطن):</strong> أقر أنا الموقع أدناه، بصفتي الممثل القانوني والمفوض عن شركة ({contractorCompany || 'المقاول'}), بأننا استلمنا الأصناف والعدد والمعدات الموضحة بالكشف أعلاه بحالة تشغيلية سليمة تماماً، ونتعهد بالمحافظة التامة عليها وتشغيلها بمعرفة فنيين متخصصين وحصراً في أعمال المشروع، وإجراء الصيانة الوقائية لها، ونتحمل المسؤولية المالية والقانونية والتعويضية الكاملة عن أي تلف أو فقد ناتج عن سوء الاستخدام أو الإهمال، مع التعهد بردها فور انتهاء الأعمال أو بطلب إدارة المنشأة بحالتها التي استلمت عليها.
                  </span>
                )}
                {receiptModel === 'TECH_CUSTODY' && (
                  <span>
                    <strong>• إقرار وتعهد باستلام عهدة شخصية (لائحة العمل):</strong> أقر أنا الموقع أدناه بأنني استلمت كافة الأدوات والمعدات الموضحة أعلاه كعهدة شخصية طرفي بحالة صالحة للتشغيل، وأتعهد بالمحافظة عليها واستخدامها فقط في تنفيذ الأعمال المكلف بها رسمياً من قبل الإدارة، وردها فور طلبها أو عند إخلاء الطرف، وأوافق صراحة على خصم قيمتها من مستحقاتي وراتبي في حال الفقد أو التلف العمدي أو الإهمال وفقاً للائحة العمل.
                  </span>
                )}
                {receiptModel === 'TOOLS_ASSETS' && (
                  <span>
                    <strong>• إقرار انتقال الحيازة والمسؤولية التشغيلية:</strong> يقر الطرف المستلم بأنه عاين وفحص الأصول والمعدات والأدوات المذكورة بالكشف أعلاه معاينة فنية نافية للجهالة، وتأكد من سلامتها التشغيلية ومطابقة لوحاتها الاسمية وسيريال التشغيل، ويتعهد بتحمل المسؤولية الكاملة عن تشغيلها وصيانتها وحمايتها في الموقع المحدد تحت إشراف الإدارة الهندسية والمستودعات.
                  </span>
                )}
                {receiptModel === 'TECHNICAL_INSPECTION' && (
                  <span>
                    <strong>• إقرار وتوصية لجنة الفحص الفني والمطابقة:</strong> اجتمعت لجنة الفحص المشكّلة من الفاحص الفني المختص وأمين المخزن، وتمت المعاينة والفحص الظاهري والمخبري لكافة الأصناف والخامات الموضحة أعلاه، وثبت مطابقتها التامة للأصول والمواصفات الفنية المعتمدة وجودتها وصلاحيتها للتشغيل بمشروع ({inspectionProject}) وخلوها من أي عيوب تصنيع، ويوصى بقبولها وإضافتها لعهدة المخزن وسجلات الأرصدة.
                  </span>
                )}
              </div>

              {/* Signature Blocks */}
              <div style={{ borderTop: '2px solid #0f172a', paddingTop: '0.75rem' }}>
                {receiptModel === 'COMPANY_CUSTODY' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>المستلم (المفوض عن المقاول)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{contractorRepName || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع والختم: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>المسلّم (أمين المخازن)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{custodyStorekeeper || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>مهندس الإشراف والموقع</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>إشراف فني</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #fde68a', padding: '0.6rem', borderRadius: '6px', background: '#fffbeb' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#b45309' }}>مدير المشروع / الإدارة التنفيذية</div>
                      <div style={{ fontSize: '0.75rem', color: '#d97706', margin: '0.2rem 0' }}>اعتماد نهائي</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>الختم والتوقيع: ......................</div>
                    </div>
                  </div>
                )}

                {receiptModel === 'TECH_CUSTODY' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>الفني المستلم (المتعهد)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{techName || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع والبصمة: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>المسلّم (أمين المخازن)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{custodyStorekeeper || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>المشرف المباشر / رئيس القسم</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{techSupervisor || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #bfdbfe', padding: '0.6rem', borderRadius: '6px', background: '#eff6ff' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e40af' }}>الشؤون الإدارية والموارد البشرية</div>
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', margin: '0.2rem 0' }}>قيد بالملف الوظيفي</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>الختم والاعتماد: ......................</div>
                    </div>
                  </div>
                )}

                {receiptModel === 'TOOLS_ASSETS' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>الطرف الأول (المسلّم)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{assetsDeliveringParty || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>الطرف الثاني (المستلم)</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{assetsReceivingParty || '..............................'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.6rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0f172a' }}>مهندس الصيانة والتشغيل</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0' }}>{assetsEngineer || 'معاينة فنية'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #a7f3d0', padding: '0.6rem', borderRadius: '6px', background: '#ecfdf5' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#065f46' }}>اعتماد مدير الإدارة الهندسية</div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', margin: '0.2rem 0' }}>سجل الأصول الثابتة</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.25rem' }}>الختم والاعتماد: ......................</div>
                    </div>
                  </div>
                )}

                {receiptModel === 'TECHNICAL_INSPECTION' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0284c7' }}>المعاين والفاحص الفني</div>
                      <div style={{ fontSize: '0.8rem', color: '#0f172a', margin: '0.35rem 0', fontWeight: 800 }}>
                        {inspectorRole} : {inspectorName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1px solid #cbd5e1', padding: '0.75rem', borderRadius: '6px', background: '#f8fafc' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>أمين المخزن</div>
                      <div style={{ fontSize: '0.8rem', color: '#0f172a', margin: '0.35rem 0', fontWeight: 800 }}>
                        أمين المخازن : {custodyStorekeeper || 'أ / محمد حلمي'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem' }}>التوقيع: ......................</div>
                    </div>

                    <div style={{ border: '1.5px solid #0284c7', padding: '0.75rem', borderRadius: '6px', background: '#f0f9ff' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0284c7' }}>يعتمد / قائد الفريق والمشرف المعتمد</div>
                      <div style={{ fontSize: '0.8rem', color: '#0369a1', margin: '0.35rem 0', fontWeight: 800 }}>
                        قائد فريق المرافق (Team Leader) / المشرف المسؤول (Supervisor)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '1.5rem' }}>الختم والاعتماد: ......................</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
