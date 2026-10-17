// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as apiAuth } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bmv_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bmv_token'));
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    const curToken = localStorage.getItem('bmv_token');
    if (!curToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiAuth.me();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('bmv_user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.warn('[auth] Failed to restore session:', err.message);
      localStorage.removeItem('bmv_token');
      localStorage.removeItem('bmv_user');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthChange = () => {
      setToken(localStorage.getItem('bmv_token'));
      fetchCurrentUser();
    };

    window.addEventListener('bmv_auth_change', handleAuthChange);
    return () => window.removeEventListener('bmv_auth_change', handleAuthChange);
  }, [fetchCurrentUser]);

  const storeSession = (res, label) => {
    if (res?.token && res?.user) {
      localStorage.setItem('bmv_token', res.token);
      localStorage.setItem('bmv_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(`Invalid response from ${label} server`);
  };

  const login = async (email, password) => {
    const res = await apiAuth.login({ email, password });
    return storeSession(res, 'login');
  };

  // Single-step signup (only works if the backend has OTP_REQUIRED=false)
  const signup = async (payload) => {
    const res = await apiAuth.signup(payload);
    return storeSession(res, 'signup');
  };

  // OTP signup: step 1 sends the code, step 2 verifies it and logs the user in
  const requestSignupOtp = (payload) => apiAuth.signupRequest(payload);
  const resendSignupOtp = (email) => apiAuth.signupResend(email);
  const verifySignupOtp = async (email, otp) => {
    const res = await apiAuth.signupVerify({ email, otp });
    return storeSession(res, 'verification');
  };

  const logout = () => {
    apiAuth.logout();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    role: user?.role || 'guest',
    isBlockHead: !!user?.is_block_head,
    blockId: user?.block_id || null,
    isAdmin: user?.role === 'admin',
    isFaculty: user?.role === 'faculty',
    isStudent: user?.role === 'student',
    login,
    signup,
    requestSignupOtp,
    resendSignupOtp,
    verifySignupOtp,
    logout,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}