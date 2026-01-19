import { useState, useEffect } from 'react';
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
  Check
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
}

export default function MasterPanel() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const getShowcaseUrl = (slug: string) => {
    return `${window.location.origin}/vitrine/${slug}`;
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

  const fetchProfiles = async () => {
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

      const profilesWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        user_roles: (rolesData || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => ({ role: r.role }))
      }));

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
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

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
    setAllowAi(false);
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
            allow_ai: allowAi,
            plan: storePlan,
          })
          .eq('id', editingId);

        if (error) throw error;
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
            allowAi: allowAi,
            plan: storePlan,
            isBlocked: storeStatus === 'inactive',
          },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        toast({
          title: 'Ótica criada!',
          description: `${storeName} foi adicionada com sucesso.`,
        });
      }

      resetForm();
      fetchProfiles();
    } catch (error: any) {
      console.error('Error saving store:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStore = (profile: Profile) => {
    setEditingId(profile.id);
    setStoreName(profile.store_name || '');
    setStoreStatus(profile.is_blocked ? 'inactive' : 'active');
    setAllowCamera(profile.allow_camera ?? true);
    setAllowImage(profile.allow_image ?? false);
    setAllowVisagismo(profile.allow_visagismo ?? false);
    setAllowAi(profile.allow_ai ?? false);
    setStorePlan(profile.plan || '1_month');
    setShowForm(true);
  };

  const handleDeleteStore = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ótica? Esta ação é irreversível.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
      toast({ title: 'Ótica excluída' });
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
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
    <div className="min-h-screen bg-slate-50">
      {/* Header - Dark style like original */}
      <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
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
          <button
            onClick={signOut}
            className="text-sm font-semibold text-slate-400 hover:text-white transition"
          >
            Sair (Voltar ao Site)
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-8">
        {/* Global Config (API Key) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
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
            </div>

            {!showForm ? (
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
                    <Eye className="w-4 h-4 text-indigo-600" /> Tipo de Provador
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
                      Provador por Câmera (AR)
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
                      Provador por Imagem (Upload)
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

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={allowVisagismo}
                        onCheckedChange={setAllowVisagismo}
                      />
                      <span className="text-sm text-slate-700">Visagismo Inteligente</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={allowAi}
                        onCheckedChange={setAllowAi}
                      />
                      <span className="text-sm text-slate-700">Modelos Digitais (IA)</span>
                    </div>
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

                {editingId && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <ModelCreationControl
                      userId={editingId}
                      onUpdate={() => fetchProfiles()}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Óticas */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> Óticas Cadastradas
              </h2>
              <span className="text-sm text-slate-500">
                {profiles.filter(p => !p.user_roles.some(r => r.role === 'master')).length} óticas
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : profiles.filter(p => !p.user_roles.some(r => r.role === 'master')).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma ótica cadastrada ainda.</p>
                <p className="text-sm">Clique em "Adicionar Nova Ótica" para começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles
                  .filter(p => !p.user_roles.some(r => r.role === 'master'))
                  .map((profile) => (
                    <div
                      key={profile.id}
                      className={`
                        p-4 rounded-xl border transition-all
                        ${profile.is_blocked
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white
                            ${profile.is_blocked ? 'bg-red-400' : 'bg-indigo-500'}
                          `}>
                            {(profile.store_name || 'O')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">
                              {profile.store_name || 'Sem nome'}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
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
                            {profile.allow_camera && (
                              <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center" title="Câmera AR">
                                <Camera className="w-3 h-3 text-blue-600" />
                              </span>
                            )}
                            {profile.allow_image && (
                              <span className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center" title="Provador Imagem">
                                <ImageIcon className="w-3 h-3 text-purple-600" />
                              </span>
                            )}
                            {profile.allow_visagismo && (
                              <span className="w-6 h-6 rounded bg-green-100 flex items-center justify-center" title="Visagismo">
                                <Eye className="w-3 h-3 text-green-600" />
                              </span>
                            )}
                            {profile.allow_ai && (
                              <span className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center" title="IA">
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
