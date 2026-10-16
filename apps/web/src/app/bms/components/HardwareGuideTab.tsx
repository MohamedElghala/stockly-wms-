'use client';

import React, { useState } from 'react';
import { 
  Cpu, 
  Zap, 
  Wrench, 
  ShoppingBag, 
  CheckCircle2, 
  Layers, 
  Code2, 
  Copy, 
  Check, 
  Droplets,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

export default function HardwareGuideTab() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedPilot, setSelectedPilot] = useState<'lake' | 'building'>('lake');

  const sampleEsp32Code = `// ==============================================================
// كود ESP32 للربط الميداني مع نظام BMS لكمبوند ستون ريزيدنس
// يرسل قراءات الحساسات ويستقبل أوامر تشغيل وإيقاف الطلمبات عبر HTTP / MQTT
// ==============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* bmsServer = "http://YOUR_SERVER_IP:3000/api/bms/telemetry";

// Pins definition
#define RELAY_PUMP_1 18   // ريليه تشغيل طلمبة 1
#define RELAY_PUMP_2 19   // ريليه تشغيل طلمبة 2
#define TRIG_PIN 5        // حساس المنسوب التراسونيك
#define ECHO_PIN 18

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PUMP_1, OUTPUT);
  pinMode(RELAY_PUMP_2, OUTPUT);
  digitalWrite(RELAY_PUMP_1, HIGH); // Off (Active LOW)

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nConnected to WiFi!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    float waterLevel = readWaterLevelPercentage();
    
    HTTPClient http;
    http.begin(bmsServer);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["assetId"] = "lake-9";
    doc["waterLevelPct"] = waterLevel;
    doc["pump1Running"] = (digitalRead(RELAY_PUMP_1) == LOW);

    String requestBody;
    serializeJson(doc, requestBody);
    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      // لمعالجة أي أمر قادم من السيرفر (تشغيل/إيقاف فوري)
      Serial.println(response);
    }
    http.end();
  }
  delay(3000); // تحديث كل 3 ثواني
}

float readWaterLevelPercentage() {
  // كود قراءة حساس التراسونيك وتحويله إلى نسبة مئوية
  return 85.0; // مثال
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleEsp32Code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Pilot Switch Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench size={20} className="text-amber-500" />
            دليل التوصيل الميداني وقائمة المشتريات بأقل تكلفة (Hardware & Wiring Guide)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مخطط كهربي وقائمة قطع قياسية متوفرة في السوق المصري (باب اللوق وشركات الكهرباء) للبدء في تنفيذ التجربة الميدانية.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPilot('lake')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedPilot === 'lake'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Droplets size={14} />
            تجربة بحيرة (مثل بحيرة 9)
          </button>
          <button
            onClick={() => setSelectedPilot('building')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedPilot === 'building'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Building2 size={14} />
            تجربة عمارة سكنية واحدة
          </button>
        </div>
      </div>

      {/* Bill of Materials (BOM) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
          <ShoppingBag className="text-emerald-500" size={18} />
          قائمة المكونات والأسعار التقديرية في السوق المصري (EGP):
        </h3>

        {selectedPilot === 'lake' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="pb-2.5">المكون</th>
                  <th className="pb-2.5">الوظيفة</th>
                  <th className="pb-2.5">الموديل المقترح</th>
                  <th className="pb-2.5">السعر التقديري (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-2.5 font-bold">وحدة التحكم المركزية (Edge Controller)</td>
                  <td>الاتصال بالسيرفر والتحكم في الريليهات</td>
                  <td className="font-mono">ESP32-WROOM أو كارت Modbus Relay</td>
                  <td className="font-bold text-emerald-600">350 - 650 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold">حساس منسوب المياه المقاوم للماء</td>
                  <td>قياس مستوى ماء البحيرة بالسنتيمتر</td>
                  <td className="font-mono">JSN-SR04T Waterproof Ultrasonic</td>
                  <td className="font-bold text-emerald-600">450 - 700 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold">لوحة ريليه عزل (Optocoupler Relay)</td>
                  <td>عزل إشارة الكنترول عن جهد الكهرباء</td>
                  <td className="font-mono">4-Channel 5V/12V Relay Module</td>
                  <td className="font-bold text-emerald-600">180 - 300 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold">كونتاكتور تشغيل الطلمبات القائم</td>
                  <td>توصيل وفصل طلمبة 3-Phase / 1-Phase</td>
                  <td className="font-mono">موجود بالفعل في لوحة الكهرباء الحالية</td>
                  <td className="font-bold text-emerald-600">0 ج.م (يتم استخدام اللوحة الحالية)</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold">مزود طاقة ومحول (Power Supply)</td>
                  <td>تغذية وحدة التحكم والحساسات</td>
                  <td className="font-mono">12V / 2A Power Adapter / DIN Rail</td>
                  <td className="font-bold text-emerald-600">150 - 250 ج.م</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-900 dark:text-slate-100">
                  <td className="py-3" colSpan={3}>إجمالي تكلفة المكونات لتجهيز البحيرة بالكامل:</td>
                  <td className="py-3 text-sky-600 text-sm">~ 1,130 - 1,900 ج.م فقط!</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="pb-2.5">المكون</th>
                  <th className="pb-2.5">الوظيفة</th>
                  <th className="pb-2.5">الموديل المقترح</th>
                  <th className="pb-2.5">السعر التقديري (ج.م)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-2.5 font-bold">وحدة تحكم العمارة (Building Gateway)</td>
                  <td>مراقبة الخزان والتحكم في طلمبة الرفع والإنارة</td>
                  <td className="font-mono">ESP32 NodeMCU</td>
                  <td className="font-bold text-emerald-600">350 - 550 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold">حساس منسوب خزان السطح</td>
                  <td>مراقبة امتلاء الخزان العلوي</td>
                  <td className="font-mono">Liquid Float Sensor / Ultrasonic</td>
                  <td className="font-bold text-emerald-600">250 - 500 ج.م</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold">ريليه مضخة الرفع والإنارة</td>
                  <td>تشغيل الطلمبة والإنارة أوتوماتيكياً</td>
                  <td className="font-mono">2-Channel Relay Module</td>
                  <td className="font-bold text-emerald-600">120 - 200 ج.م</td>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-900 dark:text-slate-100">
                  <td className="py-3" colSpan={3}>إجمالي تكلفة المكونات لتجهيز العمارة بالكامل:</td>
                  <td className="py-3 text-emerald-600 text-sm">~ 850 - 1,450 ج.م فقط!</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Snippet & Wiring Scheme */}
      <div className="bg-slate-950 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-sky-400" />
            <span className="font-bold text-xs text-sky-300">كود المتحكم الميداني الجاهز للرفع على الـ ESP32:</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all border border-slate-700"
          >
            {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedCode ? 'تم النسخ!' : 'نسخ الكود'}
          </button>
        </div>

        <pre className="text-[11px] font-mono bg-slate-900 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-sky-200 max-h-[280px]">
          {sampleEsp32Code}
        </pre>
      </div>
    </div>
  );
}
