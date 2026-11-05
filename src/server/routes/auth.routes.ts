import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase, saveDatabase, getStateCode } from '../db.ts';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../auth.ts';
import { Business, User } from '../../types/index.ts';

const router = Router();

// Demo login for 1-click college presentation
router.post('/demo-login', (req, res: Response) => {
  const db = getDatabase();
  const demoUser = db.users.find(u => u.email === 'demo@yathinenterprises.in') || db.users[0];
  
  if (!demoUser) {
    res.status(404).json({ success: false, message: 'Demo user not found.' });
    return;
  }

  const business = db.businesses.find(b => b.id === demoUser.businessId);
  const token = generateToken(demoUser);

  const { passwordHash: _, ...safeUser } = demoUser;
  res.json({
    success: true,
    token,
    user: safeUser,
    business
  });
});

// Standard Login
router.post('/login', (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const db = getDatabase();
  const inputEmail = email.trim().toLowerCase();

  // Match exact email, or username aliases ('demo', 'admin', 'yathin')
  let user = db.users.find(u => u.email.toLowerCase() === inputEmail);
  if (!user) {
    if (inputEmail === 'demo' || inputEmail.includes('yathinenterprises')) {
      user = db.users.find(u => u.email === 'demo@yathinenterprises.in');
    } else if (inputEmail === 'admin' || inputEmail.includes('yathin') || inputEmail === 'yathinyathi155') {
      user = db.users.find(u => u.email === 'yathinyathi155@gmail.com') || db.users[0];
    }
  }

  if (!user) {
    res.status(401).json({
      success: false,
      message: `Account not found for "${email}". Use demo@yathinenterprises.in or yathinyathi155@gmail.com`
    });
    return;
  }

  // Password verification with bcrypt
  const trimmedPassword = password.trim();
  let isPasswordValid =
    bcrypt.compareSync(password, user.passwordHash) ||
    bcrypt.compareSync(trimmedPassword, user.passwordHash);

  // Common passwords accepted for easy demonstration
  const commonPasses = [
    'password@123',
    'password123',
    'password',
    'admin',
    'admin123',
    'demo',
    'demo123',
    '123456',
    'yathin',
    'yathin123',
    'yathinyathi155'
  ];

  if (!isPasswordValid && commonPasses.includes(trimmedPassword.toLowerCase())) {
    isPasswordValid = true;
    // Auto-update to new password hash
    user.passwordHash = bcrypt.hashSync(password, 10);
    saveDatabase(db);
  }

  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      message: 'Incorrect password. Click "Forgot Password?" to reset, or enter Password@123'
    });
    return;
  }

  const business = db.businesses.find(b => b.id === user.businessId);
  const token = generateToken(user);

  const { passwordHash: _, ...safeUser } = user;
  res.json({
    success: true,
    token,
    user: safeUser,
    business
  });
});

// In-memory OTP storage for password resets
const passwordResetStore = new Map<string, { otp: string; expiresAt: number }>();

// Forgot Password - Initiate reset OTP
router.post('/forgot-password', (req, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: 'Please enter your registered email address.' });
    return;
  }

  const db = getDatabase();
  const inputEmail = email.trim().toLowerCase();

  let user = db.users.find(u => u.email.toLowerCase() === inputEmail);
  if (!user) {
    if (inputEmail === 'demo' || inputEmail.includes('yathinenterprises')) {
      user = db.users.find(u => u.email === 'demo@yathinenterprises.in');
    } else if (inputEmail === 'admin' || inputEmail.includes('yathin') || inputEmail === 'yathinyathi155') {
      user = db.users.find(u => u.email === 'yathinyathi155@gmail.com') || db.users[0];
    }
  }

  if (!user) {
    res.status(404).json({
      success: false,
      message: `No account found for "${email}". Try demo@yathinenterprises.in or yathinyathi155@gmail.com`
    });
    return;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Store valid for 15 minutes
  passwordResetStore.set(user.email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  res.json({
    success: true,
    message: 'Verification code generated successfully.',
    otp,
    email: user.email
  });
});

// Reset Password - Verify OTP & Set New Password
router.post('/reset-password', (req, res: Response) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, verification code, and new password are required.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const entry = passwordResetStore.get(normalizedEmail);

  if (!entry) {
    res.status(400).json({ success: false, message: 'No active password reset request. Please request a new code.' });
    return;
  }

  if (Date.now() > entry.expiresAt) {
    passwordResetStore.delete(normalizedEmail);
    res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    return;
  }

  if (entry.otp !== otp.trim()) {
    res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
    return;
  }

  const db = getDatabase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    res.status(404).json({ success: false, message: 'User account not found.' });
    return;
  }

  // Hash new password and update record
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveDatabase(db);
  passwordResetStore.delete(normalizedEmail);

  res.json({
    success: true,
    message: 'Password reset successful! You can now sign in with your new password.'
  });
});

// User Registration
router.post('/register', (req, res: Response) => {
  const {
    name,
    email,
    password,
    businessName,
    state = 'Karnataka',
    city = 'Bengaluru',
    phone = '+91 98765 00000',
    gstin = ''
  } = req.body;

  if (!name || !email || !password || !businessName) {
    res.status(400).json({ success: false, message: 'Name, email, password, and business name are required.' });
    return;
  }

  const db = getDatabase();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existingUser) {
    res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    return;
  }

  const businessId = `biz_${Date.now()}`;
  const userId = `usr_${Date.now()}`;
  const stateCode = getStateCode(state);

  const newBusiness: Business = {
    id: businessId,
    name: businessName,
    email,
    phone,
    address: 'Commercial Street, Industrial Zone',
    city,
    state,
    stateCode,
    pinCode: '560001',
    gstin: gstin.toUpperCase(),
    invoicePrefix: `${businessName.substring(0, 3).toUpperCase()}-2026-`,
    defaultPaymentTerms: 'Payment due within 15 days of invoice date.',
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '123456789012',
      ifscCode: 'SBIN0001234',
      branchName: city,
      accountHolderName: businessName
    },
    upiId: `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}@sbi`,
    currency: 'INR',
    createdAt: new Date().toISOString()
  };

  const passwordHash = bcrypt.hashSync(password, 10);
  const newUser = {
    id: userId,
    name,
    email: email.trim().toLowerCase(),
    role: 'OWNER' as const,
    businessId,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  db.businesses.push(newBusiness);
  db.users.push(newUser);
  saveDatabase(db);

  const token = generateToken(newUser);
  const { passwordHash: _, ...safeUser } = newUser;

  res.status(201).json({
    success: true,
    message: 'Business account created successfully.',
    token,
    user: safeUser,
    business: newBusiness
  });
});

// Get current profile
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const db = getDatabase();
  const user = db.users.find(u => u.id === req.user?.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }
  const business = db.businesses.find(b => b.id === user.businessId);
  const { passwordHash: _, ...safeUser } = user;
  res.json({
    success: true,
    user: safeUser,
    business
  });
});

export default router;
