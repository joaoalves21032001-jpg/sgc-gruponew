import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Smartphone, CheckCircle2 } from 'lucide-react';
import logo from '@/assets/logo-grupo-new.png';

interface MfaSetupProps {
  onVerified: () => void;
}

const MfaSetup = ({ onVerified }: MfaSetupProps) => {
  const [step, setStep] = useState<'loading' | 'enroll' | 'verify'>('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error('Erro ao verificar MFA.');
      return;
    }
    const totp = data.totp;
    const verifiedFactor = totp.find(f => (f as any).status === 'verified');
    const unverifiedFactor = totp.find(f => (f as any).status === 'unverified');

    if (verifiedFactor) {
      // Already enrolled, need to verify
      setFactorId(verifiedFactor.id);
      setStep('verify');
    } else if (unverifiedFactor) {
      // Unenroll the unverified factor and start fresh
      await supabase.auth.mfa.unenroll({ factorId: unverifiedFactor.id });
      enrollMfa();
    } else {
      enrollMfa();
    }
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Google Authenticator',
    });
    if (error) {
      toast.error('Erro ao configurar MFA.');
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep('enroll');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Insira o código de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        toast.error('Código inválido. Tente novamente.');
        setCode('');
        setLoading(false);
        return;
      }

      // Trust device for 31 days if checked
      if (trustDevice) {
        const deviceHash = await generateDeviceHash();
        const trustedUntil = new Date();
        trustedUntil.setDate(trustedUntil.getDate() + 31);
        
        await supabase.from('mfa_trusted_devices').insert({
          user_id: (await supabase.auth.getUser()).data.user!.id,
          device_hash: deviceHash,
          trusted_until: trustedUntil.toISOString(),
        });
        
        localStorage.setItem('mfa_device_hash', deviceHash);
      }

      toast.success('Verificação concluída!');
      onVerified();
    } catch (err) {
      toast.error('Erro na verificação. Tente novamente.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logo} alt="Grupo New" className="h-10 mx-auto mb-6" />
          <div className="w-14 h-14 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-brand">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            {step === 'enroll' ? 'Configurar Autenticação' : 'Verificação de Segurança'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'enroll'
              ? 'Escaneie o QR Code com o Google Authenticator'
              : 'Insira o código do Google Authenticator'}
          </p>
        </div>

        {step === 'loading' && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {step === 'enroll' && (
          <div className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-5">
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-border/20">
              <Smartphone className="w-5 h-5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Abra o <strong className="text-foreground">Google Authenticator</strong> e escaneie o QR Code abaixo.
              </p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                Não consegue escanear? Use a chave manual
              </summary>
              <code className="block mt-2 p-3 bg-muted rounded-lg text-foreground font-mono text-[11px] break-all select-all">
                {secret}
              </code>
            </details>

            <form onSubmit={(e) => { e.preventDefault(); setStep('verify'); }} className="pt-2">
              <Button type="button" onClick={() => setStep('verify')} className="w-full h-12 font-semibold shadow-brand">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Já escaneei, continuar
              </Button>
            </form>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="bg-card rounded-xl border border-border/30 shadow-card p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Código de verificação
              </label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-14 text-center text-2xl font-mono tracking-[0.5em] bg-muted/50 border-border/60 focus:border-primary"
                autoFocus
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border border-border/20 cursor-pointer">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <p className="text-xs font-semibold text-foreground">Confiar neste navegador</p>
                <p className="text-[10px] text-muted-foreground">Não pedir MFA novamente por 31 dias</p>
              </div>
            </label>

            <Button type="submit" disabled={loading || code.length !== 6} className="w-full h-12 font-semibold shadow-brand">
              {loading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

async function generateDeviceHash(): Promise<string> {
  const nav = navigator;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export { generateDeviceHash };
export default MfaSetup;
