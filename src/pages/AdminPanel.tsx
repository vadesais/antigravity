import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Glasses,
  Plus,
  Trash2,
  Edit,
  List,
  Settings,
  Share2,
  Search,
  ExternalLink,
  Palette,
  MessageSquare,
  UploadCloud,
  Copy,
  Check,
  Ruler,
  ArrowLeft,
  Upload,
  Layers,
  X,
  Sparkles
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AREditor from '@/components/ar/AREditor';
import VitrinePreview from '@/components/admin/VitrinePreview';

interface Glass {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
  image_url: string;
  buy_link: string | null;
  is_custom: boolean;
  ar_config: any;
  active: boolean;
  created_at: string;
}

type ViewMode = 'editor' | 'list' | 'config';
type ConfigSubMenu = 'main' | 'site' | 'whatsapp' | 'categories';

export default function AdminPanel() {
  const { signOut, profileId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [glasses, setGlasses] = useState<Glass[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [configMenu, setConfigMenu] = useState<ConfigSubMenu>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Profile state for vitrine link
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [allowModelCreation, setAllowModelCreation] = useState(false);

  // Editor state
  const [editingGlass, setEditingGlass] = useState<Glass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buyLink, setBuyLink] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [arConfig, setArConfig] = useState('');

  // Config state
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [waEnabled, setWaEnabled] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [storeName, setStoreName] = useState('');
  const [allowVisagismo, setAllowVisagismo] = useState(false);
  const [allowCamera, setAllowCamera] = useState(true);
  const [phone, setPhone] = useState('');

  // Categories state
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Fetch profile slug for vitrine link
  const fetchProfileSlug = async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('slug, allow_model_creation')
        .eq('id', profileId)
        .single();
      if (data?.slug) {
        setProfileSlug(data.slug);
      }
      if (data?.allow_model_creation !== undefined) {
        setAllowModelCreation(data.allow_model_creation);
      }
    } catch (error) {
      console.error('Error fetching profile slug:', error);
    }
  };

  const getVitrineUrl = () => {
    if (!profileSlug) return '';
    return `${window.location.origin}/vitrine/${profileSlug}`;
  };

  const handleCopyVitrineLink = async () => {
    const url = getVitrineUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast({ title: 'Link da vitrine copiado!' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const fetchGlasses = async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('glasses')
        .select('*')
        .eq('store_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGlasses(data || []);
    } catch (error) {
      console.error('Error fetching glasses:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os óculos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('store_id', profileId)
        .order('name');

      if (error) throw error;
      setCategories(data?.map(c => c.name) || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!profileId || !newCategoryName.trim()) return;

    // Validação prévia de categoria duplicada
    if (categories.includes(newCategoryName.trim())) {
      toast({
        title: 'Erro ao adicionar',
        description: 'Esta categoria já existe',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .insert({ store_id: profileId, name: newCategoryName.trim() });

      if (error) throw error;

      toast({ title: 'Categoria adicionada!' });
      setNewCategoryName('');
      fetchCategories();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message.includes('duplicate')
          ? 'Esta categoria já existe'
          : 'Não foi possível adicionar a categoria',
        variant: 'destructive',
      });
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryName: string) => {
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('store_id', profileId)
        .eq('name', categoryName);

      if (error) throw error;

      toast({ title: 'Categoria removida!' });
      fetchCategories();
      setCategoryToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a categoria',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (profileId) {
      fetchGlasses();
      fetchProfileSlug();
      fetchConfig();
      fetchCategories();
    }
  }, [profileId]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('');
    setImageUrl('');
    setBuyLink('');
    setIsCustom(false);
    setArConfig('');
    setEditingGlass(null);
  };

  const handleOpenEditor = (glass?: Glass) => {
    if (glass) {
      setEditingGlass(glass);
      setName(glass.name);
      setPrice(glass.price || '');
      setCategory(glass.category || '');
      setImageUrl(glass.image_url);
      setBuyLink(glass.buy_link || '');
      setIsCustom(glass.is_custom);
      setArConfig(glass.ar_config ? JSON.stringify(glass.ar_config, null, 2) : '');
    } else {
      resetForm();
    }
    setViewMode('editor');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('glasses-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('glasses-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast({ title: 'Imagem enviada!' });
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('glasses-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('glasses-images')
        .getPublicUrl(filePath);

      setBannerUrl(publicUrl);
      toast({ title: 'Banner enviado!' });
    } catch (error: any) {
      toast({
        title: 'Erro no upload do banner',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${profileId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('glasses-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('glasses-images')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({ title: 'Logo enviado!' });
    } catch (error: any) {
      toast({
        title: 'Erro no upload do logo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchConfig = async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('banner_url, store_logo_url, store_color, wa_enabled, wa_number, wa_message, store_name, allow_visagismo, allow_camera, phone')
        .eq('id', profileId)
        .single();

      if (data) {
        setBannerUrl(data.banner_url || '');
        setLogoUrl(data.store_logo_url || '');
        setPrimaryColor(data.store_color || '#000000');
        setWaEnabled(data.wa_enabled || false);
        setWaNumber(data.wa_number || '');
        setWaMessage(data.wa_message || '');
        setStoreName(data.store_name || '');
        setAllowVisagismo(data.allow_visagismo || false);
        setAllowCamera(data.allow_camera !== false);
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!profileId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          banner_url: bannerUrl || null,
          store_logo_url: logoUrl || null,
          store_color: primaryColor,
          wa_enabled: waEnabled,
          wa_number: waNumber || null,
          wa_message: waMessage || null,
          allow_visagismo: allowVisagismo,
        })
        .eq('id', profileId);

      if (error) throw error;
      toast({ title: 'Configurações salvas!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !imageUrl || !profileId) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Nome e imagem são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let parsedArConfig = null;
      if (arConfig) {
        try {
          parsedArConfig = JSON.parse(arConfig);
        } catch {
          toast({
            title: 'Config AR inválida',
            description: 'O JSON da configuração AR está incorreto.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      const glassData = {
        store_id: profileId,
        name,
        price: price || null,
        category: category || null,
        image_url: imageUrl,
        buy_link: buyLink || null,
        is_custom: isCustom,
        ar_config: parsedArConfig,
        cover_image_url: null, // Will be set by AREditor
      };

      if (editingGlass) {
        const { error } = await supabase
          .from('glasses')
          .update(glassData)
          .eq('id', editingGlass.id);
        if (error) throw error;
        toast({ title: 'Óculos atualizado!' });
      } else {
        const { error } = await supabase
          .from('glasses')
          .insert(glassData);
        if (error) throw error;
        toast({ title: 'Óculos adicionado!' });
      }

      resetForm();
      setViewMode('list');
      fetchGlasses();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (glassId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('glasses')
        .update({ active: !currentStatus })
        .eq('id', glassId);

      if (error) throw error;
      fetchGlasses();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (glassId: string) => {
    if (!confirm('Tem certeza que deseja excluir este óculos?')) return;

    try {
      const { error } = await supabase
        .from('glasses')
        .delete()
        .eq('id', glassId);

      if (error) throw error;
      toast({ title: 'Óculos excluído' });
      fetchGlasses();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredGlasses = glasses.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const formatted = (parseInt(numbers) / 100).toFixed(2).replace('.', ',');
    return formatted === 'NaN' ? '' : formatted;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Glasses className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                <span className="text-blue-600">Admin</span>
              </h1>
              <p className="text-xs text-slate-500">Painel administrativo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Vitrine Link */}
            {profileSlug && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={handleCopyVitrineLink}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition"
                  title="Copiar link da vitrine"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={getVitrineUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver Minha Vitrine
                </a>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => { resetForm(); setViewMode('editor'); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2
                  ${viewMode === 'editor' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}
                `}
              >
                <Edit className="w-4 h-4" /> Editor
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2
                  ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}
                `}
              >
                <List className="w-4 h-4" /> Gestão
              </button>
              <button
                onClick={() => { setViewMode('config'); setConfigMenu('main'); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2
                  ${viewMode === 'config' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-800'}
                `}
              >
                <Settings className="w-4 h-4" /> Configuração
              </button>
            </div>

            <button
              onClick={signOut}
              className="text-sm font-semibold text-red-500 hover:text-red-700 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-6">
        {/* Mobile Vitrine Link */}
        {profileSlug && (
          <div className="md:hidden flex items-center justify-center gap-2 mb-4">
            <a
              href={getVitrineUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Minha Vitrine
            </a>
            <button
              onClick={handleCopyVitrineLink}
              className="p-2 text-slate-500 hover:text-blue-600 bg-slate-100 rounded-lg"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center justify-center bg-white rounded-lg p-1 mb-6 shadow-sm border">
          <button
            onClick={() => { resetForm(); setViewMode('editor'); }}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition flex items-center justify-center gap-1
              ${viewMode === 'editor' ? 'bg-blue-600 text-white' : 'text-slate-600'}
            `}
          >
            <Edit className="w-3 h-3" /> Editor
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition flex items-center justify-center gap-1
              ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'}
            `}
          >
            <List className="w-3 h-3" /> Gestão
          </button>
          <button
            onClick={() => { setViewMode('config'); setConfigMenu('main'); }}
            className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition flex items-center justify-center gap-1
              ${viewMode === 'config' ? 'bg-blue-600 text-white' : 'text-slate-600'}
            `}
          >
            <Settings className="w-3 h-3" /> Config
          </button>
        </div>

        {/* EDITOR VIEW - AR Editor Completo */}
        {viewMode === 'editor' && (
          <AREditor
            profileId={profileId || ''}
            categories={categories}
            editingGlass={editingGlass}
            onSave={async (glassData) => {
              setIsSubmitting(true);
              try {
                if (editingGlass) {
                  const { error } = await supabase
                    .from('glasses')
                    .update({
                      ...glassData,
                      store_id: profileId,
                    })
                    .eq('id', editingGlass.id);
                  if (error) throw error;
                  toast({ title: 'Óculos atualizado!' });
                } else {
                  const { error } = await supabase
                    .from('glasses')
                    .insert({
                      ...glassData,
                      store_id: profileId,
                    });
                  if (error) throw error;
                  toast({ title: 'Óculos adicionado!' });
                }
                resetForm();
                setViewMode('list');
                fetchGlasses();
              } catch (error: any) {
                toast({
                  title: 'Erro ao salvar',
                  description: error.message,
                  variant: 'destructive',
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            onCancel={() => {
              resetForm();
              setViewMode('list');
            }}
            isSubmitting={isSubmitting}
            waConfig={{
              enabled: waEnabled,
              number: waNumber,
              message: waMessage
            }}
            onCategoriesChange={fetchCategories}
          />
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <List className="w-6 h-6 text-blue-600" /> Gestão de Óculos
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Gerencie, edite ou remova os modelos da sua vitrine.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-32 md:w-40 text-sm"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-28 md:w-32 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* New Button */}
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleOpenEditor()}
                >
                  <Plus className="w-4 h-4 mr-1" /> Novo
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredGlasses.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Glasses className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum óculos encontrado.</p>
                <p className="text-sm">Clique em "Novo" para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredGlasses.map((glass) => (
                  <div
                    key={glass.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    {/* Image */}
                    <div className="aspect-square w-full bg-slate-50 p-4 relative flex items-center justify-center border-b border-slate-100">
                      <img
                        src={glass.image_url}
                        alt={glass.name}
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-white flex flex-col flex-1">
                      <h3 className="font-bold text-sm text-slate-800 truncate">
                        {glass.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {glass.category || 'Geral'} • R$ {glass.price || '0,00'}
                      </p>

                      {/* Actions Row */}
                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                        {/* Toggle Switch iOS-style */}
                        <div className="flex items-center gap-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={glass.active}
                              onChange={() => handleToggleActive(glass.id, glass.active)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                          <span className={`text-xs font-bold ${glass.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {glass.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        {/* Edit/Delete Buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleOpenEditor(glass)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(glass.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Link Provador Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                        onClick={() => {
                          const link = `${window.location.origin}/provador/${glass.id}`;
                          navigator.clipboard.writeText(link);
                          toast({ title: 'Link do provador copiado!' });
                        }}
                      >
                        <Share2 className="w-3 h-3 mr-2" />
                        Link Provador
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFIG VIEW */}
        {
          viewMode === 'config' && (
            <div className={configMenu === 'site' ? "w-full mx-auto transition-all duration-300" : "max-w-2xl mx-auto transition-all duration-300"}>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {configMenu === 'main' && (
                  <>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                      <Settings className="w-5 h-5 text-blue-600" /> Configurações
                    </h2>

                    <div className="space-y-3">
                      <button
                        onClick={() => setConfigMenu('site')}
                        className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                          <Palette className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600">
                            Personalização da Vitrine
                          </h3>
                          <p className="text-xs text-slate-500">Banner, logo e cores do site</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setConfigMenu('whatsapp')}
                        className="w-full p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-slate-800 group-hover:text-green-600">
                            Gerar Link WhatsApp
                          </h3>
                          <p className="text-xs text-slate-500">Configure botões de compra automáticos</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </button>

                      {allowModelCreation && (
                        <button
                          onClick={() => navigate('/admin/model-creation')}
                          className="w-full p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-slate-800 group-hover:text-purple-600">
                              Criação de Modelos
                            </h3>
                            <p className="text-xs text-slate-500">Gere modelos hiper-realistas com IA</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </button>
                      )}

                      <button
                        onClick={() => setConfigMenu('categories')}
                        className="w-full p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                          <Layers className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="font-bold text-slate-800 group-hover:text-orange-600">
                            Gerenciar Categorias
                          </h3>
                          <p className="text-xs text-slate-500">Adicione ou remova categorias de produtos</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </>
                )}

                {configMenu === 'site' && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => setConfigMenu('main')}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <h2 className="text-xl font-bold text-slate-800">Personalização da Vitrine</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Column: Editor Form */}
                      <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                          <p className="text-xs text-slate-500 leading-relaxed">
                            💡 As alterações feitas aqui são visualizadas ao lado em tempo real.
                            Lembre-se de clicar em <strong>Salvar Alterações</strong> para publicar.
                          </p>
                        </div>

                        {/* Banner */}
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-slate-700">Banner do Topo</Label>
                          <div className="relative w-full h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                            {bannerUrl ? (
                              <img src={bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                Sem banner
                              </div>
                            )}
                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity">
                              <UploadCloud className="w-6 h-6 mb-1" />
                              <span className="text-xs font-bold">Alterar Banner</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                            </label>
                          </div>
                        </div>

                        {/* Logo */}
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-slate-700">Logo da Loja</Label>
                          <div className="flex items-center gap-4">
                            <div className="relative w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group flex-shrink-0 flex items-center justify-center">
                              {logoUrl ? (
                                <img src={logoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                              ) : (
                                <span className="text-slate-400 text-xs text-center">Sem Logo</span>
                              )}
                              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                                <Upload className="w-4 h-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                              </label>
                            </div>
                            <div className="text-xs text-slate-500">
                              Recomendado: PNG transparente.<br />Substitui o nome da loja no topo.
                            </div>
                          </div>
                        </div>

                        {/* Colors */}
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-slate-700">Cor Principal</Label>
                          <div className="flex items-center gap-4">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-12 h-12 rounded cursor-pointer border-0 p-0 shadow-sm"
                            />
                            <div className="text-xs text-slate-500 flex-1">
                              Define a cor dos botões e destaques da sua vitrine.
                            </div>
                          </div>
                        </div>

                        {/* Visagismo Toggle */}
                        <div className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-slate-700">Visagismo Digital</Label>
                            <p className="text-xs text-slate-500">
                              Habilitar botão de recomendação por IA na vitrine.
                            </p>
                          </div>
                          <Switch
                            checked={allowVisagismo}
                            onCheckedChange={setAllowVisagismo}
                          />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base shadow-lg shadow-blue-200"
                            onClick={handleSaveConfig}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              'Salvar Alterações'
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Right Column: Realtime Preview */}
                      <div className="lg:col-span-8 hidden lg:block">
                        <div className="sticky top-6 h-[calc(100vh-100px)]">
                          <VitrinePreview
                            config={{
                              bannerUrl,
                              storeColor: primaryColor,
                              storeLogoUrl: logoUrl,
                              storeName,
                              allowVisagismo,
                              phone,
                              waEnabled,
                              waNumber,
                              waMessage,
                              allowCamera
                            }}
                            products={glasses}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {configMenu === 'whatsapp' && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => setConfigMenu('main')}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <h2 className="text-xl font-bold text-slate-800">Gerar Link WhatsApp</h2>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2 mb-4">
                          <Switch
                            checked={waEnabled}
                            onCheckedChange={(checked) => {
                              setWaEnabled(checked);
                              if (checked && !waMessage) {
                                setWaMessage("Olá, tenho interesse nesse modelo:");
                              }
                            }}
                          />
                          <span className="text-sm font-bold text-slate-800">Ativar Link Automático</span>
                        </div>

                        {waEnabled && (
                          <div className="space-y-4">
                            <div>
                              <Label className="block text-xs font-bold text-green-800 mb-1">
                                Número do WhatsApp (DDD + Número)
                              </Label>
                              <Input
                                value={waNumber}
                                onChange={(e) => setWaNumber(e.target.value)}
                                placeholder="Ex: 5511999999999"
                                className="border-green-200 focus:border-green-500"
                              />
                              <p className="text-[10px] text-green-600 mt-1">
                                Apenas números. Ex: 5511999998888
                              </p>
                            </div>
                            <div>
                              <Label className="block text-xs font-bold text-green-800 mb-1">
                                Mensagem Padrão
                              </Label>
                              <Input
                                value={waMessage}
                                onChange={(e) => setWaMessage(e.target.value)}
                                placeholder="Ex: Olá, tenho interesse no modelo"
                                className="border-green-200 focus:border-green-500"
                              />
                              <p className="text-[10px] text-green-600 mt-1">
                                Dica: Use {'{ref}'} para inserir o nome do óculos automaticamente.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleSaveConfig}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Configurações'
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {configMenu === 'categories' && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => setConfigMenu('main')}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <h2 className="text-xl font-bold text-slate-800">Gerenciar Categorias</h2>
                    </div>

                    <div className="space-y-6">
                      {/* Add Category */}
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Nova Categoria</Label>
                        <div className="flex gap-2">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nome da categoria"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                          />
                          <Button
                            onClick={handleAddCategory}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </div>

                      {/* Categories List */}
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Categorias Existentes</Label>
                        {categories.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma categoria cadastrada</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {categories.map((cat) => (
                              <div
                                key={cat}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                              >
                                <span className="font-medium text-slate-700">{cat}</span>
                                <button
                                  onClick={() => setCategoryToDelete(cat)}
                                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                                  title="Remover categoria"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          )
        }
      </main>

      {/* Alert Dialog for Category Deletion */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir a categoria <strong>"{categoryToDelete}"</strong>.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
