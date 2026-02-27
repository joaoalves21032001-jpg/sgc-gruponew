import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronRight, ChevronLeft, Upload, AlertCircle, CalendarIcon, DollarSign,
  ShoppingCart, FileText, Plus, Trash2, Send,
  CheckCircle2, User, Building2, Users, Heart, Briefcase, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProfile, useSupervisorProfile } from '@/hooks/useProfile';
import { useCreateVenda, uploadVendaDocumento } from '@/hooks/useVendas';
import { useAuth } from '@/contexts/AuthContext';
import { useLogAction } from '@/hooks/useAuditLog';
import { supabase } from '@/integrations/supabase/client';
import { useCompanhias, useProdutos, useModalidades, useLeads } from '@/hooks/useInventario';
import { maskPhone, maskCurrency, unmaskCurrency } from '@/lib/masks';
import { notifyHierarchy } from '@/hooks/useNotifications';

/* ─── Shared ─── */
function FieldWithTooltip({ label, tooltip, required, children }: { label: string; tooltip: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</label>
        {required && <span className="text-destructive text-xs font-bold">*</span>}
        <Tooltip>
          <TooltipTrigger tabIndex={-1}>
            <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-primary transition-colors" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground font-display">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function DocUploadRow({ label, required, file, onUpload }: { label: string; required: boolean; file: File | null; onUpload: (f: File) => void }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3.5 rounded-lg border transition-colors",
      file ? "border-success/30 bg-success/5" : required ? "border-border/30 bg-muted/20" : "border-border/20 bg-muted/10"
    )}>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {required && <span className="text-xs text-destructive font-bold">*</span>}
          {!required && <Badge variant="outline" className="text-[9px]">Opcional</Badge>}
        </div>
        {file && <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {file.name}</p>}
      </div>
      <label className="cursor-pointer">
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" /> {file ? 'Trocar' : 'Upload'}
        </span>
      </label>
    </div>
  );
}

function MultiDocUploadRow({ label, required, maxFiles, files, onFilesChange }: { label: string; required: boolean; maxFiles: number; files: File[]; onFilesChange: (files: File[]) => void }) {
  const hasAny = files.length > 0;
  const addFile = (f: File) => {
    if (files.length < maxFiles) onFilesChange([...files, f]);
  };
  const removeFile = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };
  const replaceFile = (idx: number, f: File) => {
    const next = [...files];
    next[idx] = f;
    onFilesChange(next);
  };
  return (
    <div className={cn(
      "p-3.5 rounded-lg border transition-colors space-y-2",
      hasAny ? "border-success/30 bg-success/5" : required ? "border-border/30 bg-muted/20" : "border-border/20 bg-muted/10"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {required && <span className="text-xs text-destructive font-bold">*</span>}
          {!required && <Badge variant="outline" className="text-[9px]">Opcional</Badge>}
          <span className="text-[10px] text-muted-foreground">({files.length}/{maxFiles})</span>
        </div>
        {files.length < maxFiles && (
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) addFile(f); e.target.value = ''; }} />
            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border/40 bg-card text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Anexar
            </span>
          </label>
        )}
      </div>
      {files.map((file, idx) => (
        <div key={idx} className="flex items-center gap-2 pl-1">
          <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
          <span className="text-xs text-success flex-1 truncate">{file.name}</span>
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceFile(idx, f); e.target.value = ''; }} />
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border/30 text-[11px] font-medium hover:bg-muted transition-colors cursor-pointer">
              <Upload className="w-3 h-3" /> Trocar
            </span>
          </label>
          <button type="button" onClick={() => removeFile(idx)} className="inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/30 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Remover
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Types ─── */
type VendaModalidade = 'PF' | 'Familiar' | 'PME Multi' | 'Empresarial' | 'Adesão';

interface TitularData {
  nome: string;
  idade: string;
  produto_id: string;
}

interface DependenteData {
  nome: string;
  idade: string;
  produto_id: string;
  descricao: string;
  descricao_custom: string;
  is_conjuge: boolean;
}

const DESCRICAO_OPTIONS = ['Cônjuge', 'Filho(a)', 'Sobrinho(a)', 'Enteado(a)', 'Mãe/Pai', 'Outro'];

const STEPS = ['Formulário de Venda', 'Documentos', 'Revisão'];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1 shrink-0">
          <div className={cn(
            "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all",
            i === current ? 'bg-primary text-primary-foreground shadow-brand' :
              i < current ? 'bg-success text-success-foreground' :
                'bg-muted text-muted-foreground'
          )}>
            {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            <span className="hidden sm:inline">{step}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
        </div>
      ))}
    </div>
  );
}

export default function SalesWizard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: supervisor } = useSupervisorProfile(profile?.supervisor_id);
  const createVenda = useCreateVenda();
  const logAction = useLogAction();
  const location = useLocation();
  const navigate = useNavigate();

  // Edit mode: editing an existing venda from Minhas Ações
  const [editVendaId, setEditVendaId] = useState<string | null>(null);
  // Change request mode: solicitar alteração instead of direct edit
  const [isChangeRequest, setIsChangeRequest] = useState(false);
  const [originalVendaData, setOriginalVendaData] = useState<Record<string, any> | null>(null);
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  const [changeJustificativa, setChangeJustificativa] = useState('');

  // Inventário data
  const { data: companhias = [] } = useCompanhias();
  const { data: produtos = [] } = useProdutos();
  const { data: modalidades = [] } = useModalidades();
  const { data: leads = [] } = useLeads();

  // Wizard state
  const [step, setStep] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [vendaSaving, setVendaSaving] = useState(false);

  // Step 0 - Modalidade
  const [modalidade, setModalidade] = useState<VendaModalidade | ''>('');
  const [possuiAproveitamento, setPossuiAproveitamento] = useState(false);

  // Step 1 - Formulário
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [justificativa, setJustificativa] = useState('');
  const [companhiaId, setCompanhiaId] = useState('');
  const [dataVigencia, setDataVigencia] = useState<Date | undefined>();
  const [vendaDental, setVendaDental] = useState(false);
  const [qtdVidas, setQtdVidas] = useState('');
  const [qtdVidasEditavel, setQtdVidasEditavel] = useState(true);
  const [leadId, setLeadId] = useState('');
  const [coParticipacao, setCoParticipacao] = useState('sem');
  const [estagiarios, setEstagiarios] = useState(false);
  const [qtdEstagiarios, setQtdEstagiarios] = useState('');
  const [useResponsavelTitular, setUseResponsavelTitular] = useState(false);
  const [titulares, setTitulares] = useState<TitularData[]>([{ nome: '', idade: '', produto_id: '' }]);
  const [dependentes, setDependentes] = useState<DependenteData[]>([]);
  const [valorContrato, setValorContrato] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [obsLinhas, setObsLinhas] = useState<string[]>(['']);

  // Step 2 - Documentos
  const [titularDocs, setTitularDocs] = useState<Record<string, File | null>>({});
  const [aproveitamentoDocs, setAproveitamentoDocs] = useState<Record<string, File | null>>({});
  const [benefDocs, setBenefDocs] = useState<Record<string, Record<string, File | null>>>({});
  const [boletosFiles, setBoletosFiles] = useState<File[]>([]);
  const [loadingLeadDocs, setLoadingLeadDocs] = useState(false);

  // Helper: download a file from Supabase lead-documentos and create a File object
  const downloadLeadDoc = async (filePath: string, fileName?: string): Promise<File | null> => {
    if (!filePath || !filePath.trim()) return null;
    const name = fileName || filePath.split('/').pop() || 'documento';
    console.log('[SalesWizard] Downloading lead doc:', filePath);

    // Approach 1: createSignedUrl + fetch (most reliable)
    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('lead-documentos')
        .createSignedUrl(filePath, 120);
      if (!urlError && urlData?.signedUrl) {
        console.log('[SalesWizard] Got signed URL, fetching...');
        const resp = await fetch(urlData.signedUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
          console.log('[SalesWizard] Downloaded via signedUrl:', name, file.size, 'bytes');
          return file;
        }
        console.warn('[SalesWizard] Fetch from signedUrl failed:', resp.status);
      } else {
        console.warn('[SalesWizard] createSignedUrl error:', urlError?.message);
      }
    } catch (err) {
      console.warn('[SalesWizard] signedUrl approach failed:', err);
    }

    // Approach 2: direct download fallback
    try {
      const { data, error } = await supabase.storage.from('lead-documentos').download(filePath);
      if (error) { console.error('[SalesWizard] Direct download error:', error.message); return null; }
      if (!data) { console.warn('[SalesWizard] Direct download returned no data'); return null; }
      const file = new File([data], name, { type: data.type || 'application/octet-stream' });
      console.log('[SalesWizard] Downloaded via direct download:', name, file.size, 'bytes');
      return file;
    } catch (err) { console.error('[SalesWizard] Direct download exception:', err); return null; }
  };


  // Prefill from CRM lead
  useEffect(() => {
    const prefillLead = (location.state as any)?.prefillLead;
    if (prefillLead) {
      // Set modalidade from lead tipo
      const tipo = prefillLead.tipo as VendaModalidade;
      if (['PF', 'Familiar', 'PME Multi', 'Empresarial', 'Adesão'].includes(tipo)) {
        setModalidade(tipo);
        handleModalidadeChange(tipo);
      }
      // Set lead
      setLeadId(prefillLead.id);
      // Set titular from lead
      if (prefillLead.nome) {
        const produtoMatch = produtos.find(p => p.nome === prefillLead.produto);
        setTitulares([{
          nome: prefillLead.nome,
          idade: prefillLead.idade ? String(prefillLead.idade) : '',
          produto_id: produtoMatch?.id || '',
        }]);
      }
      // Set companhia from lead
      if (prefillLead.companhia_nome) {
        const comp = companhias.find(c => c.nome === prefillLead.companhia_nome);
        if (comp) setCompanhiaId(comp.id);
      }
      // Set quantidade vidas
      if (prefillLead.quantidade_vidas) {
        setQtdVidas(String(prefillLead.quantidade_vidas));
      }
      // Set valor
      if (prefillLead.valor) {
        setValorContrato(maskCurrency(String(Math.round(prefillLead.valor * 100))));
      }
      // Set aproveitamento carência
      if (prefillLead.plano_anterior) {
        setPossuiAproveitamento(true);
      }
      // Parse extended data from lead origem JSON
      let ext: any = {};
      try { if (prefillLead.origem) ext = JSON.parse(prefillLead.origem); } catch { /* not JSON */ }
      // Carry over vendaDental
      if (ext.vendaDental) setVendaDental(true);
      // Carry over coParticipacao
      if (ext.coParticipacao && ext.coParticipacao !== 'sem') setCoParticipacao(ext.coParticipacao);
      // Carry over estagiários
      if (ext.estagiarios) {
        setEstagiarios(true);
        if (ext.qtdEstagiarios) setQtdEstagiarios(ext.qtdEstagiarios);
      }
      // Carry over dataVigencia
      if (ext.dataVigencia) {
        setDataVigencia(new Date(ext.dataVigencia + 'T12:00:00'));
      }
      // Stay on step 0 (combined form)
      setStep(0);
      toast.info('Dados do lead pré-carregados do CRM!');
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Prefill from existing venda (edit mode from Minhas Ações)
  useEffect(() => {
    const editVenda = (location.state as any)?.editVenda;
    const changeReq = (location.state as any)?.isChangeRequest;
    if (editVenda) {
      setEditVendaId(editVenda.id);
      if (changeReq) {
        setIsChangeRequest(true);
        // Store original data for De/Para comparison
        setOriginalVendaData({
          nome_titular: editVenda.nome_titular || '',
          modalidade: editVenda.modalidade || '',
          vidas: editVenda.vidas || 0,
          valor: editVenda.valor || 0,
          observacoes: editVenda.observacoes || '',
          data_lancamento: editVenda.data_lancamento || '',
          justificativa_retroativo: editVenda.justificativa_retroativo || '',
        });
      }
      // Set modalidade
      const mod = editVenda.modalidade as VendaModalidade;
      if (['PF', 'Familiar', 'PME Multi', 'Empresarial', 'Adesão'].includes(mod)) {
        setModalidade(mod);
        handleModalidadeChange(mod);
      }

      // Parse extended data
      let ext: any = {};
      try { if (editVenda.dados_completos) ext = JSON.parse(editVenda.dados_completos); } catch { /* */ }

      // Set companhia
      if (ext.companhia_id) {
        setCompanhiaId(ext.companhia_id);
      } else if (ext.companhia_nome) {
        const comp = companhias.find(c => c.nome === ext.companhia_nome);
        if (comp) setCompanhiaId(comp.id);
      }
      // Set lead
      if (ext.lead_id) {
        setLeadId(ext.lead_id);
      }
      // Set vendaDental
      if (ext.venda_dental) setVendaDental(true);
      // Set coParticipacao
      if (ext.co_participacao && ext.co_participacao !== 'sem') setCoParticipacao(ext.co_participacao);
      // Set estagiarios
      if (ext.estagiarios) {
        setEstagiarios(true);
        if (ext.qtd_estagiarios) setQtdEstagiarios(ext.qtd_estagiarios);
      }
      // Set data vigencia
      if (ext.data_vigencia) {
        setDataVigencia(new Date(ext.data_vigencia + 'T12:00:00'));
      }
      // Set aproveitamento
      if (ext.possui_aproveitamento) setPossuiAproveitamento(true);
      // Set titulares with full data
      if (ext.titulares && ext.titulares.length > 0) {
        setTitulares(ext.titulares.map((t: any) => ({
          nome: t.nome || '',
          idade: t.idade || '',
          produto_id: t.produto_id || '',
        })));
      } else if (editVenda.nome_titular) {
        setTitulares([{ nome: editVenda.nome_titular, idade: '', produto_id: '' }]);
      }
      // Set dependentes
      if (ext.dependentes && ext.dependentes.length > 0) {
        setDependentes(ext.dependentes.map((d: any) => ({
          nome: d.nome || '',
          idade: d.idade || '',
          produto_id: d.produto_id || '',
          descricao: d.descricao || '',
        })));
      }
      // Set valor
      if (editVenda.valor) {
        setValorContrato(maskCurrency(String(Math.round(editVenda.valor * 100))));
      }
      // Set observacoes
      if (editVenda.observacoes) {
        setObsLinhas(editVenda.observacoes.split('\n'));
      }
      // Set data de lançamento
      if (editVenda.data_lancamento) {
        setDataLancamento(new Date(editVenda.data_lancamento + 'T12:00:00'));
      }
      // Set justificativa
      if (editVenda.justificativa_retroativo) {
        setJustificativa(editVenda.justificativa_retroativo);
      }
      // Set vidas
      if (editVenda.vidas) {
        setQtdVidas(String(editVenda.vidas));
      }
      setStep(0);
      toast.info(changeReq ? 'Altere os campos desejados e solicite a alteração.' : 'Editando venda — altere os campos desejados e reenvie.');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Computed
  const isRetroativo = !isToday(dataLancamento);
  const isEmpresa = modalidade === 'PME Multi' || modalidade === 'Empresarial';

  // Filter leads: only show leads that are on the KanbanBoard (have a stage_id)
  // and belong to current user or are free
  const filteredLeads = useMemo(() => {
    if (!user) return [];
    return leads.filter(l => l.stage_id && (l.created_by === user.id || l.livre));
  }, [leads, user]);

  // Selected lead
  const selectedLead = leads.find(l => l.id === leadId);

  // Modalidade from Inventário
  const selectedModalidade = modalidades.find(m => m.nome === modalidade);

  // Update qtdVidas when modalidade changes
  const handleModalidadeChange = (val: VendaModalidade) => {
    setModalidade(val);
    const mod = modalidades.find(m => m.nome === val);
    if (mod) {
      const isIndef = mod.quantidade_vidas.toLowerCase() === 'indefinido';
      setQtdVidasEditavel(isIndef);
      if (!isIndef) {
        setQtdVidas(mod.quantidade_vidas);
      } else {
        setQtdVidas('');
      }
    } else {
      setQtdVidasEditavel(true);
      setQtdVidas('');
    }
  };

  // Filtered products by companhia
  const filteredProdutos = useMemo(() => {
    if (!companhiaId) return produtos;
    return produtos.filter(p => p.companhia_id === companhiaId);
  }, [produtos, companhiaId]);

  const getProductName = (id: string) => produtos.find(p => p.id === id)?.nome || '—';
  const getCompanhiaNome = (id: string) => companhias.find(c => c.id === id)?.nome || '—';

  // Titular management
  const updateTitular = (idx: number, field: keyof TitularData, value: string) => {
    setTitulares(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };
  const addTitular = () => setTitulares(prev => [...prev, { nome: '', idade: '', produto_id: '' }]);
  const removeTitular = (idx: number) => { if (titulares.length > 1) setTitulares(prev => prev.filter((_, i) => i !== idx)); };

  // Dependente management
  const updateDependente = (idx: number, field: keyof DependenteData, value: string | boolean) => {
    setDependentes(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };
  const addDependente = () => setDependentes(prev => [...prev, { nome: '', idade: '', produto_id: '', descricao: 'Filho(a)', descricao_custom: '', is_conjuge: false }]);
  const removeDependente = (idx: number) => setDependentes(prev => prev.filter((_, i) => i !== idx));

  // Documents logic
  const getBenefDocs = (isConjuge: boolean) => {
    const docs: { label: string; required: boolean }[] = [
      { label: 'Documento com foto', required: true },
      { label: 'Comprovante de endereço', required: true },
    ];
    if (isConjuge) docs.push({ label: 'Certidão de casamento', required: true });
    if (modalidade === 'Empresarial') docs.push({ label: 'Comprovação de vínculo (FGTS/Holerite/CTPS)', required: true });
    return docs;
  };

  const aproveitamentoDefs = possuiAproveitamento ? [
    { label: 'Foto Carteirinha Anterior', required: true },
    { label: 'Carta de Permanência (PDF)', required: true },
  ] : [];

  // Validation - fixed to properly sync doc state
  const canNext = () => {
    if (step === 0) {
      // Combined Modalidade + Formulário step
      if (!modalidade) return false;
      if (!companhiaId || !dataVigencia) return false;
      if (!leadId) return false;
      if (!qtdVidas || parseInt(qtdVidas) < 1) return false;
      if (titulares.some(t => !t.nome || !t.idade || !t.produto_id)) return false;
      if (dependentes.some(d => !d.nome || !d.idade || !d.produto_id || !d.descricao)) return false;
      if (!valorContrato || unmaskCurrency(valorContrato) === 0) return false;
      if (isRetroativo && !justificativa.trim()) return false;
      return true;
    }
    if (step === 1) {
      // Documentos step
      if (possuiAproveitamento) {
        const aprovOk = aproveitamentoDefs.filter(d => d.required).every(d => aproveitamentoDocs[d.label]);
        if (!aprovOk) return false;
      }
      const allBenefs = [...titulares.map((_, i) => ({ key: `titular_${i}`, isConjuge: false })), ...dependentes.map((d, i) => ({ key: `dep_${i}`, isConjuge: d.is_conjuge || d.descricao === 'Cônjuge' }))];
      for (const b of allBenefs) {
        const bDocs = getBenefDocs(b.isConjuge);
        const requiredDocs = bDocs.filter(d => d.required);
        for (const rd of requiredDocs) {
          if (!benefDocs[b.key]?.[rd.label]) return false;
        }
      }
      return true;
    }
    return true;
  };

  // Compute change request fields for De/Para comparison
  const vendaChangeFields = useMemo(() => {
    if (!isChangeRequest || !originalVendaData) return [];
    const currentData = {
      nome_titular: titulares[0]?.nome || selectedLead?.nome || '',
      modalidade: modalidade as string,
      vidas: titulares.length + dependentes.length,
      valor: unmaskCurrency(valorContrato) || 0,
      observacoes: obsLinhas.filter(Boolean).join('\n') || '',
      data_lancamento: format(dataLancamento, 'yyyy-MM-dd'),
    };
    const fieldLabels: Record<string, string> = {
      nome_titular: 'Nome do Titular',
      modalidade: 'Modalidade',
      vidas: 'Vidas',
      valor: 'Valor (R$)',
      observacoes: 'Observações',
      data_lancamento: 'Data de Lançamento',
    };
    return Object.keys(fieldLabels).filter(key => {
      return String(currentData[key as keyof typeof currentData] ?? '') !== String(originalVendaData[key] ?? '');
    }).map(key => ({
      campo: key,
      label: fieldLabels[key],
      valorAntigo: originalVendaData[key],
      valorNovo: currentData[key as keyof typeof currentData],
    }));
  }, [isChangeRequest, originalVendaData, titulares, dependentes, modalidade, valorContrato, obsLinhas, dataLancamento, selectedLead]);

  // Submit change request for venda
  const submitVendaChangeRequest = async () => {
    if (!changeJustificativa.trim()) {
      toast.error('Informe a justificativa para a alteração.');
      return;
    }
    setVendaSaving(true);
    try {
      if (!user) throw new Error('Não autenticado');
      const structuredPayload = {
        registroId: editVendaId,
        statusAtual: (originalVendaData as any)?._status || 'pendente',
        justificativa: changeJustificativa.trim(),
        alteracoesPropostas: vendaChangeFields.map(a => ({
          campo: a.campo,
          valorAntigo: a.valorAntigo,
          valorNovo: a.valorNovo,
        })),
      };
      const { error } = await supabase.from('correction_requests').insert({
        user_id: user.id,
        tipo: 'venda',
        registro_id: editVendaId!,
        motivo: JSON.stringify(structuredPayload),
      } as any);
      if (error) throw error;
      toast.success('Solicitação de alteração enviada ao supervisor!');
      if (user) {
        notifyHierarchy(
          user.id,
          'Solicitação de Alteração de Venda',
          `${profile?.nome_completo || 'Consultor'} solicitou alteração na venda de ${titulares[0]?.nome || ''}`,
          'venda',
          '/aprovacoes'
        );
      }
      setShowChangeConfirm(false);
      navigate('/minhas-acoes');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setVendaSaving(false);
    }
  };

  const confirmVenda = async () => {
    // If in change request mode, show the change request dialog instead
    if (isChangeRequest) {
      if (vendaChangeFields.length === 0) {
        toast.info('Nenhum campo foi alterado. Modifique pelo menos um campo para solicitar alteração.');
        return;
      }
      setShowConfirm(false);
      setShowChangeConfirm(true);
      return;
    }

    setVendaSaving(true);
    try {
      const totalVidas = titulares.length + dependentes.length;

      // Build the full dados_completos JSON
      const selectedCompanhia = companhias.find(c => c.id === companhiaId);
      const dadosCompletos = JSON.stringify({
        companhia_id: companhiaId || null,
        companhia_nome: selectedCompanhia?.nome || null,
        lead_id: leadId || null,
        lead_nome: selectedLead?.nome || null,
        venda_dental: vendaDental,
        co_participacao: coParticipacao,
        estagiarios,
        qtd_estagiarios: qtdEstagiarios || null,
        data_vigencia: dataVigencia ? format(dataVigencia, 'yyyy-MM-dd') : null,
        possui_aproveitamento: possuiAproveitamento,
        titulares: titulares.map(t => ({
          nome: t.nome,
          idade: t.idade,
          produto_id: t.produto_id,
          produto_nome: produtos.find(p => p.id === t.produto_id)?.nome || null,
        })),
        dependentes: dependentes.map(d => ({
          nome: d.nome,
          idade: d.idade,
          produto_id: d.produto_id,
          descricao: d.descricao,
          produto_nome: produtos.find(p => p.id === d.produto_id)?.nome || null,
        })),
      });

      const vendaPayload = {
        nome_titular: titulares[0]?.nome || selectedLead?.nome || '',
        modalidade: modalidade as string,
        vidas: totalVidas,
        valor: unmaskCurrency(valorContrato) || undefined,
        observacoes: obsLinhas.filter(Boolean).join('\n') || undefined,
        data_lancamento: format(dataLancamento, 'yyyy-MM-dd'),
        justificativa_retroativo: isRetroativo ? justificativa : undefined,
        dados_completos: dadosCompletos,
      };

      let vendaId: string;

      if (editVendaId) {
        // Update existing venda and reset to 'analise'
        const { error } = await supabase.from('vendas').update({
          ...vendaPayload,
          status: 'analise',
        } as any).eq('id', editVendaId);
        if (error) throw error;
        vendaId = editVendaId;
      } else {
        // Create new venda
        const venda = await createVenda.mutateAsync(vendaPayload);
        vendaId = venda.id;
      }

      // Upload all documents
      if (user) {
        for (const [label, file] of Object.entries(titularDocs)) {
          if (file) await uploadVendaDocumento(vendaId, user.id, file, `Principal - ${label}`);
        }
        for (const [label, file] of Object.entries(aproveitamentoDocs)) {
          if (file) await uploadVendaDocumento(vendaId, user.id, file, `Aproveitamento - ${label}`);
        }
        for (let i = 0; i < boletosFiles.length; i++) {
          await uploadVendaDocumento(vendaId, user.id, boletosFiles[i], `Aproveitamento - Boleto ${i + 1}`);
        }
        for (const [key, docs] of Object.entries(benefDocs)) {
          for (const [label, file] of Object.entries(docs)) {
            if (file) await uploadVendaDocumento(vendaId, user.id, file, `${key} - ${label}`);
          }
        }
      }

      setShowConfirm(false);
      logAction(editVendaId ? 'editar_venda' : 'criar_venda', 'venda', vendaId, { nome_titular: titulares[0]?.nome, modalidade, valor: unmaskCurrency(valorContrato) });
      toast.success(editVendaId ? 'Venda atualizada e reenviada para análise!' : 'Venda enviada para análise!');

      // Notify hierarchy
      if (user) {
        notifyHierarchy(
          user.id,
          editVendaId ? 'Venda Alterada' : 'Nova Venda Registrada',
          `${profile?.nome_completo || 'Consultor'} ${editVendaId ? 'alterou' : 'registrou'} uma venda (${modalidade}) - R$ ${valorContrato}`,
          'venda',
          '/aprovacoes'
        );
      }

      // Reset
      setStep(0);
      setModalidade('');
      setPossuiAproveitamento(false);
      setCompanhiaId('');
      setLeadId('');
      setTitulares([{ nome: '', idade: '', produto_id: '' }]);
      setDependentes([]);
      setTitularDocs({});
      setAproveitamentoDocs({});
      setBoletosFiles([]);
      setBenefDocs({});
      setValorContrato('');
      setObsLinhas(['']);
      setDataLancamento(new Date());
      setJustificativa('');

      if (editVendaId) {
        setEditVendaId(null);
        navigate('/minhas-acoes');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar venda.');
    } finally {
      setVendaSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-card rounded-xl p-6 shadow-card border border-border/30">
        {/* ═══ STEP 0: FORMULÁRIO DE VENDA (includes Modalidade) ═══ */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Modalidade */}
            <div>
              <SectionHeader icon={ShoppingCart} title="Modalidade" subtitle="Cada modalidade possui documentação e regras específicas" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="Modalidade do Plano" tooltip="Escolha o tipo de plano para esta venda." required>
                  <Select value={modalidade} onValueChange={(v) => handleModalidadeChange(v as VendaModalidade)}>
                    <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Escolha a modalidade..." /></SelectTrigger>
                    <SelectContent>
                      {modalidades.map((m) => (
                        <SelectItem key={m.id} value={m.nome}>
                          {m.nome === 'PF' ? 'Pessoa Física (PF)' : m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>

                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20 self-end">
                  <Switch checked={possuiAproveitamento} onCheckedChange={setPossuiAproveitamento} />
                  <Label className="text-sm text-foreground">Plano anterior (Aproveitamento de Carência)?</Label>
                </div>
              </div>

            </div>

            <Separator className="bg-border/20" />

            {/* Dados do Consultor */}
            <div>
              <SectionHeader icon={User} title="Dados do Consultor" subtitle="Preenchidos automaticamente do seu perfil" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-muted/40 rounded-lg border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Repasse / Consultor</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.nome_completo || '—'}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Contato</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.celular || '—'}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-semibold">E-mail</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{profile?.email || '—'}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Data de Lançamento */}
            <FieldWithTooltip label="Data de Lançamento" tooltip="Datas anteriores exigem justificativa obrigatória." required>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal h-11 border-border/40")}>
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {format(dataLancamento, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataLancamento} onSelect={(d) => d && setDataLancamento(d)} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </FieldWithTooltip>

            {isRetroativo && (
              <div className="p-4 bg-warning/8 border border-warning/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-sm font-medium text-foreground">Lançamento retroativo detectado</p>
                </div>
                <p className="text-xs text-muted-foreground">A justificativa é obrigatória.</p>
                <Textarea placeholder="Justifique o motivo do lançamento fora da data correta..." value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={3} className="border-warning/30 focus:border-warning" />
              </div>
            )}

            <Separator className="bg-border/20" />

            {/* Dados da Companhia */}
            <div>
              <SectionHeader icon={Building2} title="Dados da Companhia" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label="Nome da Companhia" tooltip="Selecione a companhia do Inventário." required>
                  <Select value={companhiaId} onValueChange={setCompanhiaId}>
                    <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {companhias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>

                <FieldWithTooltip label="Data de Vigência" tooltip="Data de início da vigência do plano." required>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11 border-border/40", !dataVigencia && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {dataVigencia ? format(dataVigencia, "dd/MM/yyyy") : 'Selecione a data'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataVigencia} onSelect={setDataVigencia} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </FieldWithTooltip>

                <FieldWithTooltip label="Venda c/ Dental" tooltip="Marque se a venda inclui plano dental.">
                  <div className="flex items-center gap-2 h-11">
                    <Switch checked={vendaDental} onCheckedChange={setVendaDental} />
                    <span className="text-sm text-foreground">{vendaDental ? 'Sim' : 'Não'}</span>
                  </div>
                </FieldWithTooltip>

                <FieldWithTooltip label="Quantidade de Vidas" tooltip="Fixo pela modalidade ou editável se indefinido." required>
                  <Input
                    type="number" min={1}
                    value={qtdVidas}
                    onChange={(e) => setQtdVidas(e.target.value)}
                    disabled={!qtdVidasEditavel}
                    className={cn("h-11 border-border/40", !qtdVidasEditavel && "bg-muted/50")}
                  />
                </FieldWithTooltip>

                <FieldWithTooltip label="Redução de Carência" tooltip="Preenchido automaticamente com base no Aproveitamento de Carência.">
                  <div className="h-11 flex items-center px-3 rounded-md border border-border/40 bg-muted/50 text-sm font-medium text-foreground">
                    {possuiAproveitamento ? 'Sim' : 'Não'}
                  </div>
                </FieldWithTooltip>
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Lead / Responsável / Empresa */}
            <div>
              <SectionHeader icon={Users} title={isEmpresa ? 'Dados da Empresa' : 'Dados do Responsável'} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWithTooltip label={isEmpresa ? 'Nome da Empresa' : 'Nome do Responsável'} tooltip="Selecione do cadastro de Leads no Inventário." required>
                  <Select value={leadId} onValueChange={setLeadId}>
                    <SelectTrigger className="h-11 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {filteredLeads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWithTooltip>

                <FieldWithTooltip label={isEmpresa ? 'CNPJ' : 'CPF'} tooltip="Preenchido automaticamente do cadastro de Leads.">
                  <div className="h-11 flex items-center px-3 rounded-md border border-border/40 bg-muted/50 text-sm text-foreground">
                    {isEmpresa ? (selectedLead?.cnpj || '—') : (selectedLead?.cpf || '—')}
                  </div>
                </FieldWithTooltip>
              </div>

              {selectedLead && titulares.length > 0 && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/20">
                  <Switch
                    checked={useResponsavelTitular}
                    onCheckedChange={async (checked) => {
                      setUseResponsavelTitular(checked);
                      if (checked && selectedLead) {
                        updateTitular(0, 'nome', selectedLead.nome);
                        updateTitular(0, 'idade', selectedLead.idade != null ? String(selectedLead.idade) : '');
                        // Also copy produto if available from lead
                        if (selectedLead.produto) {
                          const produtoMatch = filteredProdutos.find(p => p.nome === selectedLead.produto);
                          if (produtoMatch) updateTitular(0, 'produto_id', produtoMatch.id);
                        }
                        // Auto-attach lead documents
                        const key = 'titular_0';
                        const docUpdates: Record<string, File | null> = {};
                        setLoadingLeadDocs(true);
                        console.log('[SalesWizard] Lead doc paths:', {
                          doc_foto_path: selectedLead.doc_foto_path,
                          comprovante_endereco_path: selectedLead.comprovante_endereco_path,
                        });
                        try {
                          if (selectedLead.doc_foto_path) {
                            const file = await downloadLeadDoc(selectedLead.doc_foto_path, 'documento_foto.jpg');
                            if (file) docUpdates['Documento com foto'] = file;
                            else console.warn('[SalesWizard] Failed to download doc_foto');
                          }
                          if (selectedLead.comprovante_endereco_path) {
                            const file = await downloadLeadDoc(selectedLead.comprovante_endereco_path, 'comprovante_endereco.jpg');
                            if (file) docUpdates['Comprovante de endereço'] = file;
                            else console.warn('[SalesWizard] Failed to download comprovante_endereco');
                          }
                          if (Object.keys(docUpdates).length > 0) {
                            setBenefDocs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), ...docUpdates } }));
                            toast.success(`Dados e ${Object.keys(docUpdates).length} documento(s) do responsável aplicados ao 1º titular!`);
                          } else {
                            if (selectedLead.doc_foto_path || selectedLead.comprovante_endereco_path) {
                              toast.warning('Dados aplicados, mas não foi possível baixar os documentos do responsável.');
                            } else {
                              toast.success('Dados do responsável aplicados ao 1º titular! (nenhum documento cadastrado no lead)');
                            }
                          }
                        } catch (err) {
                          console.error('[SalesWizard] Auto-attach error:', err);
                          toast.warning('Dados aplicados, mas houve erro ao baixar documentos do responsável.');
                        } finally {
                          setLoadingLeadDocs(false);
                        }
                      } else {
                        updateTitular(0, 'nome', '');
                        updateTitular(0, 'idade', '');
                        updateTitular(0, 'produto_id', '');
                        // Clear auto-attached docs
                        setBenefDocs(prev => {
                          const next = { ...prev };
                          delete next['titular_0'];
                          return next;
                        });
                      }
                    }}
                  />
                  <span className="text-sm text-foreground">{useResponsavelTitular ? 'Sim' : 'Não'}</span>
                  <Label className="text-sm text-foreground">Utilizar os dados do responsável para preenchimento do 1º Titular</Label>
                  {loadingLeadDocs && <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                </div>
              )}
            </div>

            <Separator className="bg-border/20" />

            {/* Co-participação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldWithTooltip label="Co-Participação" tooltip="Tipo de co-participação do plano." required>
                <Select value={coParticipacao} onValueChange={setCoParticipacao}>
                  <SelectTrigger className="h-11 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem">Sem Co-Participação</SelectItem>
                    <SelectItem value="parcial">Co-Participação Parcial</SelectItem>
                    <SelectItem value="completa">Co-Participação Completa</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWithTooltip>

              <FieldWithTooltip label="Estagiários" tooltip="Caso possua estagiários, informe a quantidade.">
                <div className="flex items-center gap-3">
                  <Switch checked={estagiarios} onCheckedChange={setEstagiarios} />
                  <span className="text-sm text-foreground">{estagiarios ? 'Sim' : 'Não'}</span>
                  {estagiarios && (
                    <Input type="number" min={1} value={qtdEstagiarios} onChange={(e) => setQtdEstagiarios(e.target.value)} placeholder="Quantos?" className="h-9 w-24 border-border/40" />
                  )}
                </div>
              </FieldWithTooltip>
            </div>

            <Separator className="bg-border/20" />

            {/* Titulares */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={User} title={`Titulares (${titulares.length})`} subtitle="Adicione os titulares do plano" />
                <Button variant="outline" size="sm" className="gap-1.5 border-border/40" onClick={addTitular}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {titulares.map((t, i) => (
                  <div key={i} className="p-4 border border-border/30 rounded-lg bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">Titular {i + 1}</Badge>
                      {titulares.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTitular(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground font-semibold">Nome do Beneficiário *</label>
                        <Input value={t.nome} onChange={(e) => updateTitular(i, 'nome', e.target.value)} className="h-9 border-border/40" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold">Idade *</label>
                        <Input type="number" min={0} value={t.idade} onChange={(e) => updateTitular(i, 'idade', e.target.value)} className="h-9 border-border/40" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold">Produto *</label>
                        <Select value={t.produto_id} onValueChange={(v) => updateTitular(i, 'produto_id', v)}>
                          <SelectTrigger className="h-9 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {filteredProdutos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground font-semibold">Descrição</label>
                        <div className="h-9 flex items-center px-3 rounded-md border border-border/40 bg-muted/50 text-sm text-foreground">
                          Titular
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Dependentes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={Heart} title={`Dependentes (${dependentes.length})`} subtitle="Adicione os dependentes, se houver" />
                <Button variant="outline" size="sm" className="gap-1.5 border-border/40" onClick={addDependente}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
              {dependentes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum dependente adicionado.</p>
              ) : (
                <div className="space-y-3">
                  {dependentes.map((d, i) => (
                    <div key={i} className="p-4 border border-border/30 rounded-lg bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">Dependente {i + 1}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeDependente(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] text-muted-foreground font-semibold">Nome do Beneficiário *</label>
                          <Input value={d.nome} onChange={(e) => updateDependente(i, 'nome', e.target.value)} className="h-9 border-border/40" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Idade *</label>
                          <Input type="number" min={0} value={d.idade} onChange={(e) => updateDependente(i, 'idade', e.target.value)} className="h-9 border-border/40" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Produto *</label>
                          <Select value={d.produto_id} onValueChange={(v) => updateDependente(i, 'produto_id', v)}>
                            <SelectTrigger className="h-9 border-border/40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {filteredProdutos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-semibold">Descrição *</label>
                          <div className="flex gap-2">
                            <Select value={d.descricao} onValueChange={(v) => {
                              updateDependente(i, 'descricao', v);
                              if (v === 'Cônjuge') updateDependente(i, 'is_conjuge', true);
                              else updateDependente(i, 'is_conjuge', false);
                              if (v !== 'Outro') updateDependente(i, 'descricao_custom', '');
                            }}>
                              <SelectTrigger className="h-9 border-border/40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DESCRICAO_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {d.descricao === 'Outro' && (
                              <Input className="h-9 border-border/40" placeholder="Especifique..." value={d.descricao_custom || ''} onChange={(e) => updateDependente(i, 'descricao_custom', e.target.value)} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-end pb-1">
                          {(d.is_conjuge || d.descricao === 'Cônjuge') && (
                            <Badge className="text-[9px] bg-warning/10 text-warning border-warning/20">Certidão obrigatória</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-border/20" />

            {/* Valor */}
            <div className="space-y-4">
              <FieldWithTooltip label="Valor (R$)" tooltip="Valor total do contrato." required>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary/50 font-medium">R$</span>
                  <Input value={valorContrato} onChange={(e) => setValorContrato(maskCurrency(e.target.value))} placeholder="0,00" className="pl-10 h-11 border-border/40" />
                </div>
              </FieldWithTooltip>
            </div>

            {/* Observações - abaixo do valor */}
            <FieldWithTooltip label="Observações" tooltip="Linhas de observação adicionais.">
              <div className="space-y-2">
                {obsLinhas.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={line} onChange={(e) => { const n = [...obsLinhas]; n[i] = e.target.value; setObsLinhas(n); }} className="h-9 border-border/40" placeholder={`Observação ${i + 1}`} />
                    {obsLinhas.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => setObsLinhas(prev => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setObsLinhas(prev => [...prev, ''])}>
                  <Plus className="w-3 h-3" /> Linha
                </Button>
              </div>
            </FieldWithTooltip>
          </div>
        )}

        {/* ═══ STEP 1: DOCUMENTOS ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <SectionHeader icon={FileText} title="Documentos" subtitle="Faça upload dos documentos obrigatórios e opcionais" />

            {selectedLead && (
              <div className="p-3 bg-accent/50 rounded-lg border border-border/30 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Documentos do {isEmpresa ? 'empresa' : 'responsável'} <strong>{selectedLead.nome}</strong> já cadastrados no Inventário serão automaticamente considerados.
                </p>
              </div>
            )}

            {/* Aproveitamento docs */}
            {possuiAproveitamento && (
              <div className="space-y-3 pt-4 border-t border-border/20">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-warning" /> Aproveitamento de Carência
                </h3>
                {aproveitamentoDefs.map(doc => (
                  <DocUploadRow key={doc.label} label={doc.label} required={doc.required} file={aproveitamentoDocs[doc.label] || null} onUpload={(f) => setAproveitamentoDocs(prev => ({ ...prev, [doc.label]: f }))} />
                ))}
                <MultiDocUploadRow label="Últimos 3 boletos pagos" required={false} maxFiles={3} files={boletosFiles} onFilesChange={setBoletosFiles} />
              </div>
            )}

            {/* Beneficiary docs */}
            {titulares.map((t, i) => {
              const key = `titular_${i}`;
              const bDocs = getBenefDocs(false);
              return (
                <div key={key} className="space-y-3 pt-4 border-t border-border/20">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> {t.nome || `Titular ${i + 1}`}
                  </h3>
                  {bDocs.map(doc => (
                    <DocUploadRow
                      key={doc.label}
                      label={doc.label}
                      required={doc.required}
                      file={benefDocs[key]?.[doc.label] || null}
                      onUpload={(f) => setBenefDocs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [doc.label]: f } }))}
                    />
                  ))}
                </div>
              );
            })}

            {dependentes.map((d, i) => {
              const key = `dep_${i}`;
              const bDocs = getBenefDocs(d.is_conjuge || d.descricao === 'Cônjuge');
              return (
                <div key={key} className="space-y-3 pt-4 border-t border-border/20">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> {d.nome || `Dependente ${i + 1}`} {d.is_conjuge ? '(Cônjuge)' : `(${d.descricao})`}
                  </h3>
                  {bDocs.map(doc => (
                    <DocUploadRow
                      key={doc.label}
                      label={doc.label}
                      required={doc.required}
                      file={benefDocs[key]?.[doc.label] || null}
                      onUpload={(f) => setBenefDocs(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [doc.label]: f } }))}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ STEP 2: REVISÃO ═══ */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionHeader icon={CheckCircle2} title="Revisão Final" subtitle="Confira todos os dados antes de enviar" />
            <div className="space-y-2 text-sm">
              {[
                ['Modalidade', modalidade || '—'],
                ['Aproveitamento de Carência', possuiAproveitamento ? 'Sim' : 'Não'],
                ['Companhia', companhiaId ? getCompanhiaNome(companhiaId) : '—'],
                ['Data de Vigência', dataVigencia ? format(dataVigencia, 'dd/MM/yyyy') : '—'],
                ['Dental', vendaDental ? 'Sim' : 'Não'],
                ['Quantidade de Vidas', qtdVidas || '—'],
                [isEmpresa ? 'Empresa' : 'Responsável', selectedLead?.nome || '—'],
                [isEmpresa ? 'CNPJ' : 'CPF', isEmpresa ? (selectedLead?.cnpj || '—') : (selectedLead?.cpf || '—')],
                ['Co-Participação', coParticipacao === 'sem' ? 'Sem' : coParticipacao === 'parcial' ? 'Parcial' : 'Completa'],
                ['Estagiários', estagiarios ? `Sim (${qtdEstagiarios || 0})` : 'Não'],
                ['Valor', valorContrato ? `R$ ${valorContrato}` : '—'],
                ['Data de Lançamento', format(dataLancamento, 'dd/MM/yyyy')],
                ...(isRetroativo ? [['Justificativa Retroativo', justificativa]] : []),
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Titulares ({titulares.length})</p>
              {titulares.map((t, i) => (
                <div key={i} className="p-2.5 bg-muted/30 rounded-lg text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <span className="font-medium text-foreground col-span-2">{t.nome || '—'}</span>
                  <span className="text-muted-foreground">{t.idade} anos</span>
                  <span className="text-muted-foreground">{getProductName(t.produto_id)}</span>
                </div>
              ))}
            </div>

            {dependentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Dependentes ({dependentes.length})</p>
                {dependentes.map((d, i) => (
                  <div key={i} className="p-2.5 bg-muted/30 rounded-lg text-sm grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <span className="font-medium text-foreground col-span-2">{d.nome || '—'}</span>
                    <span className="text-muted-foreground">{d.idade} anos</span>
                    <span className="text-muted-foreground">{getProductName(d.produto_id)}</span>
                    <span className="text-muted-foreground">{d.descricao === 'Outro' ? d.descricao_custom || 'Outro' : d.descricao}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Documentos Anexados</p>
              {possuiAproveitamento && (
                <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                  <span className="text-muted-foreground">Aproveitamento de Carência</span>
                  <span className="font-medium text-success">{Object.values(aproveitamentoDocs).filter(Boolean).length} doc(s)</span>
                </div>
              )}
              {Object.entries(benefDocs).map(([key, docs]) => (
                <div key={key} className="flex justify-between p-2.5 bg-muted/30 rounded-lg text-sm">
                  <span className="text-muted-foreground">{key.replace('_', ' ')}</span>
                  <span className="font-medium text-success">{Object.values(docs).filter(Boolean).length} doc(s)</span>
                </div>
              ))}
            </div>

            {obsLinhas.filter(Boolean).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Observações</p>
                {obsLinhas.filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs text-foreground p-2 bg-muted/30 rounded">{line}</p>
                ))}
              </div>
            )}

            <div className="p-3 bg-primary/[0.03] rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Notificação automática ao finalizar</p>
              <p className="text-xs text-foreground">Supervisor: {supervisor?.nome_completo || '—'}</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-warning/8 border border-warning/15 rounded-lg">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-foreground">Verifique todos os dados e documentos. Pendências atrasam a aprovação.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="h-11 border-border/40">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="bg-primary hover:bg-primary/90 text-primary-foreground h-11">
            Próximo <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => setShowConfirm(true)} disabled={!canNext()} className={cn("font-bold h-11 shadow-brand", isChangeRequest ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-success hover:bg-success/90 text-success-foreground')}>
            {isChangeRequest ? (<><Send className="w-4 h-4 mr-1" /> Solicitar Alteração</>) : (<><CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar Venda</>)}
          </Button>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Confirmar Envio da Venda</DialogTitle>
            <DialogDescription>A venda será enviada para análise. Supervisor e gerente serão notificados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm py-2">
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Modalidade</span>
              <span className="font-medium text-foreground">{modalidade}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">{isEmpresa ? 'Empresa' : 'Responsável'}</span>
              <span className="font-medium text-foreground">{selectedLead?.nome || '—'}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium text-foreground">R$ {valorContrato || '0,00'}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-muted/30 rounded-lg">
              <span className="text-muted-foreground">Total Vidas</span>
              <span className="font-medium text-foreground">{titulares.length + dependentes.length}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmVenda} disabled={vendaSaving} className="bg-success hover:bg-success/90 text-success-foreground font-semibold min-w-[140px]">
              {vendaSaving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Salvando...</> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar Venda</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Request Confirmation Dialog */}
      <Dialog open={showChangeConfirm} onOpenChange={setShowChangeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Solicitar Alteração</DialogTitle>
            <DialogDescription>Deseja solicitar a alteração do envio desta venda? As mudanças serão enviadas para aprovação do seu superior.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
            {vendaChangeFields.map(a => (
              <div key={a.campo} className="flex justify-between p-2.5 bg-muted/40 rounded-lg">
                <span className="text-sm text-muted-foreground">{a.label}</span>
                <span className="text-sm">
                  <span className="text-destructive line-through mr-1">{String(a.valorAntigo)}</span>
                  →
                  <span className="text-primary font-semibold ml-1">{String(a.valorNovo)}</span>
                </span>
              </div>
            ))}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-muted-foreground">Justificativa <span className="text-destructive">*</span></label>
              <Textarea value={changeJustificativa} onChange={e => setChangeJustificativa(e.target.value)} placeholder="Explique o motivo da alteração..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangeConfirm(false)}>Cancelar</Button>
            <Button onClick={submitVendaChangeRequest} disabled={vendaSaving || !changeJustificativa.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-w-[120px]">
              {vendaSaving ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Enviando...</> : <><Send className="w-4 h-4 mr-1" /> Enviar Solicitação</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
