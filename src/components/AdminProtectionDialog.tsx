import { useState } from 'react';
import { Shield, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AdminProtectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user successfully authenticates */
  onUnlocked: () => void;
  targetName?: string;
  customProtection?: {
    passwordHash?: string | null;
    mfaSecret?: string | null;
  };
}

/**
 * Dialog that requires the user to re-confirm their password + MFA TOTP
 * before editing a protected resource (cargo, perfil de segurança, usuário).
 *
 * Uses Supabase reauthentication + MFA challenge flow.
 */
export function AdminProtectionDialog({ open, onOpenChange, onUnlocked, targetName, customProtection }: AdminProtectionDialogProps) {
  const [step, setStep] = useState<'password' | 'mfa'>('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');

  const reset = () => {
    setStep('password');
    setPassword('');
    setCode('');
    setLoading(false);
  };

  const base32ToBytes = (base32: string) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let i = 0; i < base32.length; i++) {
        const val = alphabet.indexOf(base32[i].toUpperCase());
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    return new Uint8Array(bytes);
  };

  const validateTOTP = async (secret: string, code: string) => {
    try {
      const keyBytes = base32ToBytes(secret);
      const counter = Math.floor(Date.now() / 1000 / 30);
      const counterBytes = new Uint8Array(8);
      let tempCounter = BigInt(counter);
      for (let i = 7; i >= 0; i--) {
        counterBytes[i] = Number(tempCounter & 0xffn);
        tempCounter >>= 8n;
      }

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
      const hmac = new Uint8Array(signature);
      const offset = hmac[hmac.length - 1] & 0xf;
      const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const otp = (binary % 1000000).toString().padStart(6, '0');
      return otp === code;
    } catch (e) {
      console.error('TOTP Validation Error:', e);
      return false;
    }
  };

  const handlePasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error('Informe sua senha.'); return; }
    setLoading(true);
    try {
      if (customProtection?.passwordHash) {
        // Validate against custom password hash (SHA-256)
        if (!crypto?.subtle) {
          toast.error('Contexto não seguro: não é possível validar a senha. Use HTTPS.');
          setLoading(false);
          return;
        }
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex !== customProtection.passwordHash) {
          throw new Error('Senha de proteção incorreta.');
        }

        // If password matches, check if we also need MFA
        if (customProtection.mfaSecret) {
          setStep('mfa');
          setLoading(false);
          return;
        }

        toast.success('Acesso autorizado!');
        onUnlocked();
        onOpenChange(false);
        reset();
        return;
      }

      // Default behavior: Re-authenticate with current user's email + password
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) throw new Error('Usuário não identificado.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password,
      });
      if (signInError) throw new Error('Senha incorreta.');

      // Check if user has an MFA factor enrolled
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f: any) => f.status === 'verified');

      if (!totpFactor) {
        // No MFA factor — password alone is enough
        toast.success('Identidade confirmada!');
        onUnlocked();
        onOpenChange(false);
        reset();
        return;
      }

      // Create MFA challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw new Error('Erro ao iniciar verificação MFA.');

      setFactorId(totpFactor.id);
      setChallengeId(challenge.id);
      setStep('mfa');
    } catch (err: any) {
      toast.error(err.message || 'Erro de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Código deve ter 6 dígitos.'); return; }
    if (loading) return;
    setLoading(true);
    try {
      if (customProtection?.mfaSecret) {
        const isValid = await validateTOTP(customProtection.mfaSecret, code);
        if (!isValid) throw new Error('Código MFA incorreto.');
        toast.success('Perfil desbloqueado!');
        onUnlocked();
        onOpenChange(false);
        reset();
        return;
      }

      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw new Error('Código MFA inválido.');
      
      // Fix for Race Condition: Wait for the session to be refreshed with the new AAL2 claim
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw new Error('Erro ao sincronizar sessão após MFA.');
      
      toast.success('Identidade confirmada!');
      onUnlocked();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast.error(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle className="font-display text-lg">Recurso Protegido</DialogTitle>
          </div>
          <DialogDescription>
            {targetName
              ? <>O recurso <strong>"{targetName}"</strong> está protegido. Confirme sua identidade para continuar.</>
              : <>Este recurso está protegido. Confirme sua identidade para continuar.</>}
          </DialogDescription>
        </DialogHeader>

        {step === 'password' ? (
          <form onSubmit={handlePasswordConfirm} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-pwd" className="text-sm font-semibold">Sua Senha de Acesso</Label>
              <div className="relative">
                <Input
                  id="admin-pwd"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-10 border-border/40"
                  autoFocus
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="gap-1.5">
                <Shield className="w-4 h-4" /> {loading ? 'Verificando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleMfaVerify} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-mfa" className="text-sm font-semibold">Código MFA (Google Authenticator)</Label>
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  id="admin-mfa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="h-11 tracking-[0.4em] text-center font-mono text-lg border-border/40"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">Abra o Google Authenticator e insira o código de 6 dígitos.</p>
            </div>
            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setStep('password')}>Voltar</Button>
              <Button type="submit" disabled={loading || code.length !== 6} className="gap-1.5">
                <KeyRound className="w-4 h-4" /> {loading ? 'Verificando...' : 'Desbloquear'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
