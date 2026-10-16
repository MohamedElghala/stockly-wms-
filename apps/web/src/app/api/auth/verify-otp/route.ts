import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ensureServerAdminAuth } from '@/lib/server-admin-auth';

const OTP_SALT = process.env.OTP_SECRET_SALT || 'calm_wms_otp_salt_v2_2026_super_secure';

function hashOtp(email: string, otp: string): string {
  return crypto.createHash('sha256').update(`${email}:${otp}:${OTP_SALT}`).digest('hex');
}

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp) {
      return NextResponse.json({ error: 'البريد الإلكتروني ورمز التحقق مطلوبان' }, { status: 400 });
    }

    await ensureServerAdminAuth();

    const otpRef = doc(db, 'passwordResetOtps', cleanEmail);
    const otpSnap = await getDoc(otpRef);

    if (!otpSnap.exists()) {
      return NextResponse.json({ error: 'لم يتم العثور على رمز تحقق لهذا البريد.' }, { status: 404 });
    }

    const otpData = otpSnap.data();
    if (otpData?.used) {
      return NextResponse.json({ error: 'تم استخدام أو إبطال رمز التحقق هذا مسبقاً.' }, { status: 400 });
    }

    if (Date.now() > otpData?.expiresAt) {
      return NextResponse.json({ error: 'انتهت صلاحية رمز التحقق (أكثر من 10 دقائق).' }, { status: 400 });
    }

    // Brute-force protection: check failed attempts limit (max 5)
    const currentAttempts = otpData?.attempts || 0;
    if (currentAttempts >= 5) {
      await updateDoc(otpRef, { used: true, lockedAt: Date.now() });
      return NextResponse.json({
        error: 'تم قفل هذا الرمز لتجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات). يرجى طلب رمز جديد.'
      }, { status: 429 });
    }

    const submittedHash = hashOtp(cleanEmail, cleanOtp);
    const isValid = otpData?.otpHash ? (otpData.otpHash === submittedHash) : (otpData?.otp === cleanOtp);

    if (!isValid) {
      const newAttempts = currentAttempts + 1;
      const isNowLocked = newAttempts >= 5;
      await updateDoc(otpRef, {
        attempts: newAttempts,
        used: isNowLocked,
        lastFailedAt: Date.now()
      });

      if (isNowLocked) {
        return NextResponse.json({
          error: 'تم قفل هذا الرمز بعد 5 محاولات خاطئة متتالية. يرجى طلب رمز تحقق جديد.'
        }, { status: 429 });
      }

      return NextResponse.json({
        error: `رمز التحقق غير صحيح. تبقى لك ${5 - newAttempts} محاولات.`
      }, { status: 400 });
    }

    // Mark as successfully used
    await updateDoc(otpRef, {
      used: true,
      consumedAt: Date.now()
    });

    return NextResponse.json({
      success: true,
      message: 'تم التحقق من الرمز بنجاح.'
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: error.message || 'فشل التحقق من الرمز' }, { status: 500 });
  }
}
