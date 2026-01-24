/**
 * FaceTrust TypeScript Definitions
 * Secure Biometric Authentication System
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebAuthnCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  device_name: string;
  last_used: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  message: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  role?: 'admin' | 'client';
}

export interface LivenessCheckResult {
  isLive: boolean;
  confidence: number;
  checks: {
    faceDetected: boolean;
    eyeBlinkDetected?: boolean;
    headMovement?: boolean;
    multiple_faces: boolean;
  };
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: string;
    alg: number;
  }>;
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    authenticatorAttachment?: string;
    requireResidentKey: boolean;
    residentKey: string;
    userVerification: string;
  };
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  rpId: string;
  timeout: number;
  userVerification: string;
  allowCredentials: Array<{
    type: string;
    id: string;
    transports?: string[];
  }>;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, any>;
}
