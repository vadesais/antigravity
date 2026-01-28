
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tag, Save, Loader2, Image as ImageIcon, Sparkles, X, Check, ChevronsUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import Advanced3DEditor from '../admin/Advanced3DEditor';

interface EditingGlass {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
  image_url: string;
  buy_link: string | null;
  ar_config: any;
  whatsapp_contact_id?: string | null;
  glass_tags?: { tag_id: string }[];
}

interface Tag {
  id: string;
  name: string;
}

interface AREditorProps {
  profileId: string;
  categories: string[];
  tags?: Tag[];
  onSave: (glassData: {
    name: string;
    price: string;
    category: string;
    image_url: string;
    buy_link: string;
    ar_config: any;
    cover_image_url: string | null;
    whatsapp_contact_id?: string | null;
    tags?: string[];
  }) => Promise<void>;
  editingGlass?: EditingGlass | null;
  onCancel?: () => void;
  isSubmitting?: boolean;
  waConfig?: {
    enabled: boolean;
    number: string;
    message: string;
  };
  waContacts?: { id: string; name: string; number: string; is_default: boolean }[];
  onCategoriesChange?: () => Promise<void>;
}

export default function AREditor({
  profileId,
  categories,
  tags = [],
  onSave,
  editingGlass,
  onCancel,
  isSubmitting = false,
  waConfig,
  waContacts = [],
  onCategoriesChange
}: AREditorProps) {
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState(editingGlass?.name || '');
  const [price, setPrice] = useState(editingGlass?.price || '');
  const [category, setCategory] = useState(editingGlass?.category || '');
  const [buyLink, setBuyLink] = useState(editingGlass?.buy_link || '');
  const [linkType, setLinkType] = useState<'whatsapp' | 'website'>('whatsapp');
  const [selectedContactId, setSelectedContactId] = useState<string>('default');

  // Tags State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [openTagCombobox, setOpenTagCombobox] = useState(false);

  // Initialize State from EditingGlass
  useEffect(() => {
    if (editingGlass) {
      setName(editingGlass.name || '');
      setPrice(editingGlass.price || '');
      setCategory(editingGlass.category || '');
      setBuyLink(editingGlass.buy_link || '');

      if (editingGlass.ar_config) {
        if (editingGlass.ar_config.purchaseType) {
          setLinkType(editingGlass.ar_config.purchaseType);
        }
      }

      if (editingGlass.whatsapp_contact_id) {
        setSelectedContactId(editingGlass.whatsapp_contact_id);
      } else {
        setSelectedContactId('default');
      }

      // Initialize Tags
      if (editingGlass.glass_tags) {
        const extractedTags = editingGlass.glass_tags.map(gt => gt.tag_id);
        setSelectedTags(extractedTags);
      } else {
        setSelectedTags([]);
      }
    } else {
      // Clear form for new glass
      setName('');
      setPrice('');
      setCategory('');
      setBuyLink('');
      setSelectedContactId('default');
      setSelectedTags([]);
    }
  }, [editingGlass]);

  // Auto-generate WhatsApp link
  useEffect(() => {
    if (linkType === 'whatsapp' && waConfig?.enabled) {
      let activeNumber = waConfig.number;

      if (selectedContactId && selectedContactId !== 'default' && waContacts.length > 0) {
        const contact = waContacts.find(c => c.id === selectedContactId);
        if (contact) {
          activeNumber = contact.number;
        }
      }

      if (activeNumber) {
        const encodedMessage = encodeURIComponent(`${waConfig.message} ${name || ''}`.trim());
        const link = `http://api.whatsapp.com/send/?phone=${activeNumber}&text=${encodedMessage}`;
        setBuyLink(link);
      }
    }
  }, [name, waConfig, linkType, selectedContactId, waContacts]);

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const formatted = (parseInt(numbers) / 100).toFixed(2).replace('.', ',');
    return formatted === 'NaN' ? '' : formatted;
  };

  // State for 3D Publishing Modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pending3DData, setPending3DData] = useState<{ config: any; frontImage: string | null; templeImage: string | null } | null>(null);

  const handle3DPublish = (data: { config: any; frontImage: string | null; templeImage: string | null }) => {
    setPending3DData(data);
    setIsPublishModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!name) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    if (!pending3DData?.frontImage) {
      toast({ title: 'Erro na imagem', description: 'Imagem frontal não encontrada.', variant: 'destructive' });
      return;
    }

    setIsPublishing(true);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      let frontUrl = '';
      let templeUrl = '';

      // Upload Front Image (Processed)
      if (pending3DData.frontImage) {
        const fileName = `${profileId}/front-${Date.now()}.webp`;
        const res = await fetch(pending3DData.frontImage);
        const blob = await res.blob();

        await supabase.storage.from('glasses-images').upload(fileName, blob, {
          contentType: 'image/webp', upsert: false
        });

        const { data: { publicUrl } } = supabase.storage.from('glasses-images').getPublicUrl(fileName);
        frontUrl = publicUrl;
      }

      // Upload Temple Image (Processed)
      if (pending3DData.templeImage) {
        const fileName = `${profileId}/temple-${Date.now()}.webp`;
        const res = await fetch(pending3DData.templeImage);
        const blob = await res.blob();

        await supabase.storage.from('glasses-images').upload(fileName, blob, {
          contentType: 'image/webp', upsert: false
        });

        const { data: { publicUrl } } = supabase.storage.from('glasses-images').getPublicUrl(fileName);
        templeUrl = publicUrl;
      }

      // Merge config with URLs
      const finalConfig = {
        ...pending3DData.config,
        temple_url: templeUrl,
        front_url_backup: frontUrl
      };

      await onSave({
        name,
        price,
        category,
        image_url: frontUrl,
        buy_link: buyLink,
        ar_config: finalConfig,
        cover_image_url: frontUrl,
        whatsapp_contact_id: selectedContactId !== 'default' ? selectedContactId : null,
        tags: selectedTags, // Keep tags fix
      });

      setIsPublishModalOpen(false);
      setPending3DData(null);
      toast({ title: 'Óculos publicado com sucesso!' });

    } catch (error: any) {
      console.error('Publish error:', error);
      toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Map editingGlass to initialData if available
  const initialData = editingGlass ? {
    config: editingGlass.ar_config,
    frontUrl: editingGlass.image_url,
    templeUrl: editingGlass.ar_config?.temple_url
  } : null;

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-50">
      <Advanced3DEditor onPublish={handle3DPublish} initialData={initialData} />

      {/* Metadata Modal for 3D Publish */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e1e1e] border dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">

            <div className="px-5 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Publicar Óculos 3D
              </h2>
              <button onClick={() => setIsPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-5">
                {/* Left: Image Preview (Compact) */}
                {pending3DData?.frontImage && (
                  <div className="w-24 h-24 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2 relative self-start">
                    <img src={pending3DData.frontImage} className="w-full h-full object-contain" />
                  </div>
                )}

                {/* Right: Form Fields */}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase mb-1">Nome do Modelo</Label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Ray-Ban Aviator"
                      className="h-9 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</Label>
                      <Input
                        value={price}
                        onChange={e => setPrice(formatPrice(e.target.value))}
                        placeholder="0,00"
                        className="h-9 dark:bg-slate-800 dark:border-slate-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-500 uppercase mb-1">Categoria</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-9 dark:bg-slate-800 dark:border-slate-700">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="z-[100]">
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tags MultiSelect */}
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase mb-1">Tags</Label>
                    <Popover open={openTagCombobox} onOpenChange={setOpenTagCombobox} modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openTagCombobox}
                          className="w-full justify-between h-auto min-h-[36px] py-2 px-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          {selectedTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTags.map(tagId => {
                                const tag = tags?.find(t => t.id === tagId);
                                return tag ? (
                                  <Badge key={tagId} variant="secondary" className="mr-0.5 px-1.5 py-0 h-5 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 pointer-events-none">
                                    {tag.name}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-normal">Selecione tags...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 z-[80] pointer-events-auto" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar tag..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                            <CommandGroup>
                              {tags?.map((tag) => (
                                <CommandItem
                                  key={tag.id}
                                  value={tag.name}
                                  onSelect={() => {
                                    setSelectedTags(prev =>
                                      prev.includes(tag.id)
                                        ? prev.filter(id => id !== tag.id)
                                        : [...prev, tag.id]
                                    )
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {tag.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Botão Comprar</Label>

                  <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setLinkType('whatsapp')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${linkType === 'whatsapp' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        setLinkType('website');
                        setBuyLink('');
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${linkType === 'website' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Site
                    </button>
                  </div>
                </div>

                {/* WA Contact Selector */}
                {linkType === 'whatsapp' && waContacts.length > 0 && (
                  <div className="mb-3">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Atendente / Vendedor</Label>
                    <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                      <SelectTrigger className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="default" className="font-medium">
                          {waContacts.find(c => c.is_default)?.name || 'Padrão da Loja'} (Padrão)
                        </SelectItem>
                        {waContacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} <span className="text-slate-400 ml-1">({contact.number})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Link Input (Hidden if WA, Visible if Site) */}
                <div className={linkType === 'whatsapp' ? 'hidden' : 'block'}>
                  <Label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">URL de Destino</Label>
                  <Input
                    value={buyLink}
                    onChange={e => setBuyLink(e.target.value)}
                    placeholder="https://..."
                    className="h-9 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Info text for WA */}
                {linkType === 'whatsapp' && (
                  <div className="text-xs text-slate-500 flex items-center gap-2 bg-green-50/50 dark:bg-green-900/10 p-2 rounded border border-green-100 dark:border-green-900/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Link do WhatsApp será gerado automaticamente.
                  </div>
                )}
              </div>

              <Button
                onClick={handleConfirmPublish}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-green-200/50 dark:shadow-none"
                disabled={isPublishing}
              >
                {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Publicar Agora
              </Button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
