import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Shield,
  Server,
  PlusCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Camera,
  ImageIcon,
  Sparkles,
  Users,
  Copy,
  ExternalLink,
  Check,
  TrendingUp,
  Clock,
  Calendar,
  Glasses,

  Sun,
  Moon,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ModelCreationControl from '@/components/master/ModelCreationControl';

interface Profile {
  id: string;
  user_id: string;
  store_name: string | null;
  phone: string | null;
  is_blocked: boolean;
  created_at: string;
  allow_camera?: boolean;
  allow_image?: boolean;
  allow_visagismo?: boolean;
  allow_ai?: boolean;
  allow_model_creation?: boolean;
  plan?: string;
  expires_at?: string | null;
  slug?: string | null;
  user_roles: { role: string }[];
  monthly_count?: number;
  glasses_count?: number;
  whatsapp_slots?: number;
}

export default function MasterPanel() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'camera' | 'image' | 'models'>('all');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storePass, setStorePass] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePlan, setStorePlan] = useState('1_month');
  const [storeStatus, setStoreStatus] = useState('active');
  const [allowCamera, setAllowCamera] = useState(true);
  const [allowImage, setAllowImage] = useState(false);
  const [allowVisagismo, setAllowVisagismo] = useState(false);
  const [allowAi, setAllowAi] = useState(false);
  const [allowModelCreation, setAllowModelCreation] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [monthlyLimit, setMonthlyLimit] = useState(100);
  const [whatsappSlots, setWhatsappSlots] = useState(1);
  const [stats, setStats] = useState({
    totalGenerations: 0,
    dailyCount: 0,
    monthlyCount: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const getShowcaseUrl = (slug: string) => {
    return `${window.location.origin}/p/${slug}`;
  };

  const handleCopyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(getShowcaseUrl(slug));
      setCopiedSlug(slug);
      toast({ title: 'Link copiado!' });
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch (err) {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: limitsData } = await supabase
        .from('model_generation_limits')
        .select('profile_id, monthly_count');

      const { data: glassesData } = await supabase
        .from('glasses')
        .select('store_id');

      const profilesWithRoles = (profilesData || []).map(profile => {
        const limit = limitsData?.find(l => l.profile_id === profile.id);
        const glassesCount = glassesData?.filter(g => g.store_id === profile.id).length || 0;
        return {
          ...profile,
          monthly_count: limit?.monthly_count || 0,
          glasses_count: glassesCount,
          user_roles: (rolesData || [])
            .filter(r => r.user_id === profile.user_id)
            .map(r => ({ role: r.role }))
        };
      });

      setProfiles(profilesWithRoles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar a lista de óticas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    let result = profiles;
    if (filterType === 'camera') {
      result = profiles.filter(p => p.allow_camera);
    } else if (filterType === 'image') {
      result = profiles.filter(p => p.allow_image);
    } else if (filterType === 'models') {
      result = profiles.filter(p => p.allow_model_creation);
    }
    setFilteredProfiles(result);
  }, [profiles, filterType]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setStoreName('');
    setStorePass('');
    setStoreEmail('');
    setStorePlan('1_month');
    setStoreStatus('active');
    setAllowCamera(true);
    setAllowImage(false);
    setAllowVisagismo(false);
    setAllowModelCreation(false);
    setDailyLimit(10);
    setDailyLimit(10);
    setMonthlyLimit(100);
    setWhatsappSlots(1);
  };

  const handleProvadorToggle = (type: 'camera' | 'image') => {
    if (type === 'camera') {
      setAllowCamera(true);
      setAllowImage(false);
    } else {
      setAllowCamera(false);
      setAllowImage(true);
    }
  };

  const handleSaveStore = async () => {
    if (!storeName || (!editingId && (!storeEmail || !storePass))) {
      toast({
        title: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('profiles')
          .update({
            store_name: storeName,
            is_blocked: storeStatus === 'inactive',
            allow_camera: allowCamera,
            allow_image: allowImage,
            allow_visagismo: allowVisagismo,
            allow_model_creation: allowModelCreation,
            plan: storePlan,
            whatsapp_slots: whatsappSlots,
          })
          .eq('id', editingId);

        if (error) throw error;

        // Update limits if model creation is enabled (or just always update if relevant)
        if (allowModelCreation) {
          const { error: limitsError } = await supabase
            .from('model_generation_limits')
            .upsert({
              profile_id: editingId,
              daily_limit: dailyLimit,
              monthly_limit: monthlyLimit
            }, { onConflict: 'profile_id' });

          if (limitsError) throw limitsError;
        }

        toast({ title: 'Ótica atualizada!' });
      } else {
        // Create new user via edge function (uses service role to avoid RLS issues)
        const { data, error: fnError } = await supabase.functions.invoke('create-admin-user', {
          body: {
            email: storeEmail,
            password: storePass,
            storeName: storeName,
            allowCamera: allowCamera,
            allowImage: allowImage,
            allowVisagismo: allowVisagismo,
            allowModelCreation: allowModelCreation,
            dailyLimit: dailyLimit,
            monthlyLimit: monthlyLimit,
            plan: storePlan,
            isBlocked: storeStatus === 'inactive',
          },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        // FORCE BLACK COLOR FOR NEW STORES
        if (data?.userId) {
          const { error: colorError } = await supabase
            .from('profiles')
            .update({ store_color: '#000000' })
            .eq('id', data.userId);

          if (colorError) console.error("Error setting default color:", colorError);
        }

        toast({
          title: 'Ótica criada!',
          description: `${storeName} foi adicionada com sucesso.`,
        });
      }

      resetForm();
      fetchProfiles();
    } catch (error) {
      console.error('Error saving store:', error);
      toast({
        title: 'Erro ao salvar',
        description: (error instanceof Error ? error.message : 'Erro desconhecido'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStore = async (profile: Profile) => {
    setEditingId(profile.id);
    setStoreName(profile.store_name || '');
    setStoreStatus(profile.is_blocked ? 'inactive' : 'active');
    setAllowCamera(profile.allow_camera ?? true);
    setAllowImage(profile.allow_image ?? false);
    setAllowVisagismo(profile.allow_visagismo ?? false);
    // allow_ai removed
    setAllowModelCreation(profile.allow_model_creation ?? false);
    setAllowModelCreation(profile.allow_model_creation ?? false);
    setStorePlan(profile.plan || '1_month');
    setWhatsappSlots(profile.whatsapp_slots || 1);

    // Fetch limits
    try {
      const { data: limits } = await supabase
        .from('model_generation_limits')
        .select('daily_limit, monthly_limit, daily_count, monthly_count, updated_at')
        .eq('profile_id', profile.id)
        .single();

      if (limits) {
        let currentDailyCount = limits.daily_count || 0;
        let currentMonthlyCount = limits.monthly_count || 0;

        if (limits.updated_at) {
          const now = new Date();
          const brazilDateOptions: Intl.DateTimeFormatOptions = { timeZone: "America/Sao_Paulo", year: 'numeric', month: 'numeric', day: 'numeric' };
          const todayBrazilString = now.toLocaleDateString("en-US", brazilDateOptions);
          const lastUpdateBrazilString = new Date(limits.updated_at).toLocaleDateString("en-US", brazilDateOptions);

          if (todayBrazilString !== lastUpdateBrazilString) {
            currentDailyCount = 0;
          }

          // Check month change for UI consistency
          const todayMonth = new Date(todayBrazilString).getMonth();
          const lastUpdateMonth = new Date(lastUpdateBrazilString).getMonth();
          if (todayMonth !== lastUpdateMonth) {
            currentMonthlyCount = 0;
          }
        }

        setDailyLimit(limits.daily_limit);
        setMonthlyLimit(limits.monthly_limit);
        setStats(prev => ({
          ...prev,
          dailyCount: currentDailyCount,
          monthlyCount: currentMonthlyCount
        }));
      } else {
        setDailyLimit(10);
        setMonthlyLimit(100);
        setStats(prev => ({ ...prev, dailyCount: 0, monthlyCount: 0 }));
      }

      // Fetch total generations
      const { count: totalCount } = await supabase
        .from('model_generations')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profile.id);

      setStats(prev => ({
        ...prev,
        totalGenerations: totalCount || 0
      }));

    } catch (e) {
      console.error("Error fetching limits", e);
    }

    setShowForm(true);
  };

  const handleDeleteStore = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ótica? Esta ação é irreversível.')) {
      return;
    }

    try {
      setLoading(true);
      // Call Edge Function to delete User (Auth + Data + Storage)
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: profileId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Ótica e dados excluídos com sucesso' });

      // Update local state immediately to avoid ghost items
      setProfiles(prev => prev.filter(p => p.id !== profileId));

      // Fetch fresh data in background
      fetchProfiles();
    } catch (error: any) {
      console.error('Error deleting user:', error);

      let errorMessage = 'Erro desconhecido';

      // Try to parse execution context error from Supabase Functions
      if (error && typeof error === 'object' && 'context' in error) {
        try {
          const context = await error.context.json();
          if (context && context.error) {
            errorMessage = context.error;
          }
        } catch (e) {
          // Failed to parse JSON body
          errorMessage = error.message || 'Erro de execução da função';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro ao excluir',
        description: errorMessage,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({ title: 'Insira uma chave válida', variant: 'destructive' });
      return;
    }
    setSavingKey(true);
    // Here you would save to your settings table
    await new Promise(r => setTimeout(r, 500));
    toast({ title: 'Chave API salva com sucesso!' });
    setSavingKey(false);
  };

  const getPlanLabel = (plan: string | undefined) => {
    switch (plan) {
      case '7_days': return '7 Dias';
      case '1_month': return '1 Mês';
      case '12_months': return '1 Ano';
      case 'unlimited': return 'Ilimitado';
      default: return '1 Mês';
    }
  };

  const getRoleBadge = (roles: { role: string }[]) => {
    const role = roles[0]?.role;
    if (role === 'master') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded bg-indigo-100 text-indigo-700">
          <Shield className="h-3 w-3" /> Master
        </span>
      );
    } else if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-600">
        Usuário
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121212] transition-colors duration-300" translate="no">
      {/* Header - Dark style like original */}
      <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-20 shadow-md">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Painel <span className="text-indigo-400">Master</span>
              </h1>
              <p className="text-xs text-slate-400">Gestão de Óticas e Acessos</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter Buttons */}
            <div className="hidden md:flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Todas
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1"></div>
              <button
                onClick={() => setFilterType('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'camera' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Com Vitrine"
              >
                <Camera className="w-3 h-3" /> Vitrine
              </button>
              <button
                onClick={() => setFilterType('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'image' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Sem Vitrine"
              >
                <ImageIcon className="w-3 h-3" /> Imagem
              </button>
              <button
                onClick={() => setFilterType('models')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === 'models' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Modelos"
              >
                <Sparkles className="w-3 h-3" /> Modelos
              </button>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-yellow-400"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={signOut}
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full p-8">
        {/* Global Config (API Key) */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8 transition-colors">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-indigo-600" /> Configurações Globais
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label className="block text-xs font-semibold text-slate-500 mb-1">
                API Key do Gemini (Imagens)
              </Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="font-mono"
              />
            </div>
            <Button
              onClick={handleSaveApiKey}
              disabled={savingKey}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Chave'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Criar/Editar Loja */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                {editingId ? 'Editar Ótica' : 'Nova Ótica'}
              </h2>
              {editingId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Nova
                </Button>
              )}
            </div>

            {!showForm && !editingId ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-lg border border-dashed border-slate-300 flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" /> Adicionar Nova Ótica
              </button>
            ) : (
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Nome da Loja
                  </Label>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Ex: Ótica Visão"
                    className="bg-white dark:bg-white text-slate-900 border-slate-300 focus:border-indigo-500"
                  />
                </div>

                {!editingId && (
                  <>
                    <div>
                      <Label className="block text-xs font-semibold text-slate-500 mb-1">
                        Email de Acesso
                      </Label>
                      <Input
                        type="email"
                        value={storeEmail}
                        onChange={(e) => setStoreEmail(e.target.value)}
                        placeholder="admin@otica.com"
                        className="bg-white dark:bg-white text-slate-900 border-slate-300 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <Label className="block text-xs font-semibold text-slate-500 mb-1">
                        Senha de Acesso (Admin)
                      </Label>
                      <Input
                        value={storePass}
                        onChange={(e) => setStorePass(e.target.value)}
                        placeholder="Senha para a loja"
                        className="bg-white dark:bg-white text-slate-900 border-slate-300 focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="block text-xs font-semibold text-slate-500 mb-1">
                      Tempo de Uso
                    </Label>
                    <Select value={storePlan} onValueChange={setStorePlan}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7_days">7 Dias</SelectItem>
                        <SelectItem value="1_month">1 Mês</SelectItem>
                        <SelectItem value="12_months">1 Ano</SelectItem>
                        <SelectItem value="unlimited">Ilimitado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block text-xs font-semibold text-slate-500 mb-1">
                      Status
                    </Label>
                    <Select value={storeStatus} onValueChange={setStoreStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Desativado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tipo de Provador */}
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" /> Provador Virtual
                  </h4>

                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="allow-camera"
                      checked={allowCamera}
                      onChange={() => handleProvadorToggle('camera')}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="allow-camera" className="text-sm text-slate-700 font-medium cursor-pointer">
                      <Camera className="w-4 h-4 inline mr-1" />
                      Com Vitrine
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allow-image"
                      checked={allowImage}
                      onChange={() => handleProvadorToggle('image')}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="allow-image" className="text-sm text-slate-700 font-medium cursor-pointer">
                      <ImageIcon className="w-4 h-4 inline mr-1" />
                      Sem Vitrine
                    </label>
                  </div>

                  <p className="text-xs text-slate-400 italic mt-2">
                    * Apenas um provador pode ficar ativo por vez
                  </p>
                </div>

                {/* Funcionalidades Extras */}
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Funcionalidades Extras
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={allowVisagismo}
                        onCheckedChange={setAllowVisagismo}
                      />
                      <span className="text-sm text-slate-700">Visagismo Inteligente</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Switch
                          checked={allowModelCreation}
                          onCheckedChange={setAllowModelCreation}
                        />
                        <span className="text-sm font-bold text-slate-700">Criação de Modelos</span>
                      </div>

                      {allowModelCreation && (
                        <div className="space-y-4">
                          {/* Stats Cards - Only visible when editing and enabled */}
                          {editingId && (
                            <div className="grid grid-cols-3 gap-2 px-1">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 border border-blue-200 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <TrendingUp className="w-3 h-3 text-blue-600" />
                                  <span className="text-[10px] font-bold text-blue-600 uppercase">Total</span>
                                </div>
                                <div className="text-lg font-bold text-blue-900 leading-none">{stats.totalGenerations}</div>
                              </div>

                              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 border border-green-200 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Clock className="w-3 h-3 text-green-600" />
                                  <span className="text-[10px] font-bold text-green-600 uppercase">Hoje</span>
                                </div>
                                <div className="text-lg font-bold text-green-900 leading-none">{stats.dailyCount} <span className="text-[10px] font-normal text-green-700">/ {dailyLimit}</span></div>
                              </div>

                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 border border-purple-200 text-center">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <Calendar className="w-3 h-3 text-purple-600" />
                                  <span className="text-[10px] font-bold text-purple-600 uppercase">Mês</span>
                                </div>
                                <div className="text-lg font-bold text-purple-900 leading-none">{stats.monthlyCount} <span className="text-[10px] font-normal text-purple-700">/ {monthlyLimit}</span></div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 pl-2">
                            <div>
                              <Label className="text-xs text-slate-500">Limite Diário</Label>
                              <Input
                                type="number"
                                className="h-8 text-sm mt-1"
                                value={dailyLimit}
                                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">Limite Mensal</Label>
                              <Input
                                type="number"
                                className="h-8 text-sm mt-1"
                                value={monthlyLimit}
                                onChange={(e) => setMonthlyLimit(parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 mt-2">
                  <div>
                    <Label className="block text-xs font-semibold text-slate-500 mb-1">
                      Limite de WhatsApps
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={whatsappSlots}
                      onChange={(e) => setWhatsappSlots(parseInt(e.target.value) || 1)}
                      className="bg-white dark:bg-white text-slate-900 border-slate-300 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Quantos números a loja pode cadastrar.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveStore}
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {editingId ? 'Salvar Alterações' : 'Criar Ótica'}
                  </Button>
                </div>

                {/* ModelCreationControl removed - Integrated above */}
              </div>
            )}
          </div>

          {/* Lista de Óticas */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> Óticas Cadastradas
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filteredProfiles.filter(p => !p.user_roles.some(r => r.role === 'master')).length} óticas
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredProfiles.filter(p => !p.user_roles.some(r => r.role === 'master')).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ótica cadastrada ainda.</p>
                <p className="text-sm">Clique em "Adicionar Nova Ótica" para começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles
                  .filter(p => !p.user_roles.some(r => r.role === 'master'))
                  .map((profile) => (
                    <div
                      key={profile.id}
                      className={`
                        p-4 rounded-xl border transition-all
                        ${profile.is_blocked
                          ? 'bg-red-50 border-red-200'
                          : profile.allow_camera
                            ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' // Com Vitrine (Verde)
                            : profile.allow_image
                              ? 'bg-purple-50 border-purple-200 hover:border-purple-300' // Sem Vitrine (Lilás)
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-300' // Padrão
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white
                            ${profile.is_blocked
                              ? 'bg-red-400'
                              : profile.allow_camera
                                ? 'bg-emerald-500' // Com Vitrine (Verde)
                                : profile.allow_image
                                  ? 'bg-purple-500' // Sem Vitrine (Lilás)
                                  : 'bg-indigo-500' // Padrão
                            }
                          `}>
                            {(profile.store_name || 'O')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">
                              {profile.store_name || 'Sem nome'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {getRoleBadge(profile.user_roles)}
                              <span className="text-slate-300">•</span>
                              <span>{getPlanLabel(profile.plan)}</span>
                              <span className="text-slate-300">•</span>
                              <span className={profile.is_blocked ? 'text-red-600 font-bold' : 'text-green-600'}>
                                {profile.is_blocked ? 'Bloqueado' : 'Ativo'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Feature badges */}
                          <div className="hidden sm:flex items-center gap-1 mr-2">

                            {/* Glasses Count Badge */}
                            <span className="h-6 px-1.5 rounded bg-blue-100 flex items-center justify-center gap-1" title={`${profile.glasses_count || 0} óculos publicados`}>
                              <Glasses className="w-3 h-3 text-blue-600" />
                              <span className="text-[10px] font-bold text-blue-700">{profile.glasses_count || 0}</span>
                            </span>

                            {profile.allow_visagismo && (
                              <span className="w-6 h-6 rounded bg-green-100 flex items-center justify-center" title="Visagismo">
                                <Eye className="w-3 h-3 text-green-600" />
                              </span>
                            )}

                            {profile.allow_model_creation && (
                              <span className="h-6 px-1.5 rounded bg-amber-100 flex items-center justify-center gap-1" title={`Criação de Modelos`}>
                                <Sparkles className="w-3 h-3 text-amber-600" />
                              </span>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStore(profile)}
                            className="hover:bg-indigo-100"
                          >
                            <Edit className="w-4 h-4 text-indigo-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStore(profile.id)}
                            className="hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Showcase Link */}
                      {profile.slug && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">Link da Vitrine:</span>
                            <div className="flex-1 flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-1.5">
                              <code className="text-xs text-indigo-600 font-mono flex-1 truncate">
                                {getShowcaseUrl(profile.slug)}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-indigo-100"
                                onClick={() => handleCopyLink(profile.slug!)}
                              >
                                {copiedSlug === profile.slug ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500" />
                                )}
                              </Button>
                              <a
                                href={getShowcaseUrl(profile.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-indigo-100"
                              >
                                <ExternalLink className="w-3 h-3 text-slate-500" />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
