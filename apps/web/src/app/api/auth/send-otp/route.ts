import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ensureServerAdminAuth } from '@/lib/server-admin-auth';

const OTP_SALT = process.env.OTP_SECRET_SALT || 'calm_wms_otp_salt_v2_2026_super_secure';

function hashOtp(email: string, otp: string): string {
  return crypto.createHash('sha256').update(`${email}:${otp}:${OTP_SALT}`).digest('hex');
}

function createMailTransporter() {
  const user = process.env.GMAIL_USER || 'mohamedalghala@gmail.com';
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || 'zueutphfkhqaakya';

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

function generateOtpEmailHtml(email: string, otp: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>رمز التحقق لإعادة تعيين كلمة المرور</title>
</head>
<body style="font-family: 'Cairo', -apple-system, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; direction: rtl; text-align: right;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    
    <div style="background: linear-gradient(135deg, var(--accent-primary) 0%, #065F46 100%); padding: 24px 28px; text-align: center;">
      <div style="color: #ffffff; font-size: 20px; font-weight: 900;">منظومة إدارة المخازن الذكية | Stockly WMS</div>
      <div style="color: rgba(255, 255, 255, 0.85); font-size: 12px; margin-top: 4px;">منظومة التخزين وسلاسل الإمداد والتشغيل المتطورة</div>
    </div>

    <div style="padding: 28px;">
      <span style="display: inline-block; background-color: var(--accent-primary)15; color: var(--accent-primary); border: 1px solid var(--accent-primary)40; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
        رمز أمان OTP
      </span>

      <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 12px 0;">طلب استعادة كلمة المرور</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        استلمنا طلباً لاستعادة كلمة المرور لحسابك في نظام Stockly WMS. استخدم رمز التحقق التالي:
      </p>

      <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <div style="font-size: 12px; font-weight: bold; color: var(--accent-primary); margin-bottom: 6px;">رمز التحقق السري (صالح لمدة 10 دقائق)</div>
        <div style="font-size: 28px; font-weight: 900; letter-spacing: 6px; color: var(--accent-primary); font-family: monospace;">${otp}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; font-weight: 700; color: #475569; width: 35%; font-size: 13px; text-align: right;">البريد الإلكتروني</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600; font-size: 13px; text-align: right;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-weight: 700; color: #475569; font-size: 13px; text-align: right;">مدة الصلاحية</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600; font-size: 13px; text-align: right;">10 دقائق فقط</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 12px;">
        إذا لم تكن قد طلبت استعادة كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.
      </div>
    </div>

    <div style="background-color: #f8fafc; padding: 14px 28px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px;">
      جميع الحقوق محفوظة © ${new Date().getFullYear()} Stockly WMS. منظومة إدارة المستودعات وسلاسل الإمداد.
    </div>

  </div>
</body>
</html>
  `;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const cleanEmail = (email || '').toLowerCase().trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'بريد إلكتروني غير صحيح' }, { status: 400 });
    }

    await ensureServerAdminAuth();

    const otpRef = doc(db, 'passwordResetOtps', cleanEmail);
    const existingSnap = await getDoc(otpRef);
    const now = Date.now();
    let hourlyCount = 1;
    let hourlyWindowStart = now;

    if (existingSnap.exists()) {
      const existingData = existingSnap.data();

      // 1. Cooldown protection (60 seconds)
      if (existingData?.createdAt && (now - existingData.createdAt < 60 * 1000)) {
        const remainingSeconds = Math.ceil((60 * 1000 - (now - existingData.createdAt)) / 1000);
        return NextResponse.json({
          error: `يرجى الانتظار ${remainingSeconds} ثانية قبل طلب رمز تحقق جديد.`
        }, { status: 429 });
      }

      // 2. Hourly rate-limiting (maximum 5 requests per hour)
      const oneHourAgo = now - 60 * 60 * 1000;
      hourlyCount = existingData?.hourlyCount || 1;
      hourlyWindowStart = existingData?.hourlyWindowStart || existingData?.createdAt || now;

      if (hourlyWindowStart < oneHourAgo) {
        hourlyWindowStart = now;
        hourlyCount = 1;
      } else {
        hourlyCount += 1;
        if (hourlyCount > 5) {
          return NextResponse.json({
            error: 'تم تجاوز الحد الأقصى لطلب رموز التحقق (5 محاولات في الساعة). يرجى المحاولة لاحقاً.'
          }, { status: 429 });
        }
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + 10 * 60 * 1000;

    // Save hashed OTP with security metadata to Firestore
    await setDoc(otpRef, {
      email: cleanEmail,
      otpHash: hashOtp(cleanEmail, otp),
      expiresAt,
      used: false,
      attempts: 0,
      maxAttempts: 5,
      createdAt: now,
      hourlyCount,
      hourlyWindowStart
    });

    const transporter = createMailTransporter();
    const sender = process.env.GMAIL_USER || 'mohamedalghala@gmail.com';

    await transporter.sendMail({
      from: `"Stockly WMS" <${sender}>`,
      to: cleanEmail,
      subject: `رمز التحقق الخاص بك: ${otp} - Stockly WMS`,
      html: generateOtpEmailHtml(cleanEmail, otp)
    }).catch(err => {
      console.warn('Nodemailer SMTP warn:', err.message);
    });

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني بنجاح.'
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: error.message || 'فشل إرسال رمز التحقق' }, { status: 500 });
  }
}
