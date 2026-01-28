import { useState, useEffect, useCallback } from 'react';
import ARCamera from './ARCamera';
import ARComponentsPanel from './ARComponentsPanel';
import ARFineControls from './ARFineControls';
import { useARState } from '@/hooks/useARState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tag, Save, Loader2, Image as ImageIcon, Upload, X, Plus, Sparkles } from 'lucide-react';
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
import { Check, ChevronsUpDown } from "lucide-react";
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
  tags?: Tag[]; // New prop
  onSave: (glassData: {
    name: string;
    price: string;
    category: string;
    image_url: string;
    buy_link: string;
    ar_config: any;
    cover_image_url: string | null;
    whatsapp_contact_id?: string | null;
    tags?: string[]; // New prop
  }) => Promise<void>;
  editingGlass?: EditingGlass | null;
  onCancel?: () => void;
  isSubmitting?: boolean;
  waConfig?: {
    enabled: boolean;
    number: string;
    message: string;
  };
  waContacts?: { id: string; name: string; number: string; is_default: boolean }[]; // New prop
  onCategoriesChange?: () => Promise<void>;
}

export default function AREditor({
  profileId,
  categories,
  tags = [], // Default empty
  onSave,
  editingGlass,
  onCancel,
  isSubmitting = false,
  waConfig,
  waContacts = [], // Default empty
  onCategoriesChange
}: AREditorProps) {
  const { toast } = useToast();
  const [useLegacyEditor, setUseLegacyEditor] = useState(false);
  const {
    model,
    editingPart,
    autoAnchors,
    setAutoAnchors,
    isLoading,
    setIsLoading,
    smoothedRef,
    lastAnchorsRef,
    updatePart,
    snapAnchorsToFront,
    selectPart,
    clearAll,
    pushHistory,
    getARConfig,
    applyARConfig,
  } = useARState();

  // Form state
  const [name, setName] = useState(editingGlass?.name || '');
  const [price, setPrice] = useState(editingGlass?.price || '');
  const [category, setCategory] = useState(editingGlass?.category || '');
  const [buyLink, setBuyLink] = useState(editingGlass?.buy_link || '');
  const [coverImageMode, setCoverImageMode] = useState<'glasses' | 'custom'>('glasses');
  const [customCoverImage, setCustomCoverImage] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [linkType, setLinkType] = useState<'whatsapp' | 'website'>('whatsapp');
  const [selectedContactId, setSelectedContactId] = useState<string>('default'); // Multi-WA State

  // Tags State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [openTagCombobox, setOpenTagCombobox] = useState(false);

  useEffect(() => {
    if (editingGlass?.glass_tags) {
      setSelectedTags(editingGlass.glass_tags.map(gt => gt.tag_id));
    }
  }, [editingGlass]);

  // Auto-generate WhatsApp link based on selected contact
  useEffect(() => {
    if (linkType === 'whatsapp' && waConfig?.enabled) {
      let activeNumber = waConfig.number;

      // If a specific contact is selected, use their number
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

  // Apply initial AR config and load front image on mount/change
  useEffect(() => {
    if (editingGlass) {
      setName(editingGlass.name || '');
      setPrice(editingGlass.price || '');
      setCategory(editingGlass.category || '');
      setBuyLink(editingGlass.buy_link || '');

      if (editingGlass.ar_config) {
        applyARConfig(editingGlass.ar_config);
        // Load link type preference
        if (editingGlass.ar_config.purchaseType) {
          setLinkType(editingGlass.ar_config.purchaseType);
        }
      }

      // Load selected contact
      if (editingGlass.whatsapp_contact_id) {
        setSelectedContactId(editingGlass.whatsapp_contact_id);
      } else {
        setSelectedContactId('default');
      }


      // Load front image from existing glass
      if (editingGlass.image_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          updatePart('front', { img, remoteUrl: editingGlass.image_url });
        };
        img.src = editingGlass.image_url;
      }
    } else {
      // Clear form for new glass
      setName('');
      setPrice('');
      setCategory('');
      setCategory('');
      setBuyLink('');
      setSelectedContactId('default');
      clearAll();

      // Load default template AFTER clearing (so it overrides defaults)
      setTimeout(() => {
        const savedTemplate = localStorage.getItem('ar_default_template');
        console.log('Loading template after clear:', savedTemplate);
        if (savedTemplate) {
          try {
            const template = JSON.parse(savedTemplate);
            console.log('Parsed template:', template);

            // Check if old format (with image URLs) - clean it
            if (template.front || template.left || template.right) {
              console.log('Detected old template format with images - cleaning...');
              localStorage.removeItem('ar_default_template');
              toast({
                title: 'Template antigo removido',
                description: 'Por favor, salve o padrão novamente sem imagens.',
                variant: 'destructive',
              });
              return;
            }

            // Only apply if it's the new format (params only)
            if (template.frontParams || template.leftParams || template.rightParams) {
              applyARConfig(template);
              // toast({
              //   title: 'Template padrão carregado!',
              //   description: 'Ajustes salvos foram aplicados.',
              // });
            }
          } catch (error) {
            console.error('Error loading default template:', error);
          }
        }
      }, 100);
    }
  }, [editingGlass, applyARConfig, updatePart, clearAll]);

  const handleUploadPart = useCallback((
    partName: keyof typeof model.parts,
    img: HTMLImageElement,
    remoteUrl: string
  ) => {
    updatePart(partName, { img, remoteUrl });
    selectPart(partName);

    // Auto-snap anchors when front is uploaded
    if (partName === 'front' && autoAnchors) {
      setTimeout(snapAnchorsToFront, 100);
    }
  }, [updatePart, selectPart, autoAnchors, snapAnchorsToFront]);

  const handleScaleChange = useCallback((value: number) => {
    if (editingPart) {
      updatePart(editingPart, { scale: value });

      // Auto-sync temple scales: when adjusting one temple, update the other
      if (editingPart === 'left') {
        updatePart('right', { scale: value });
      } else if (editingPart === 'right') {
        updatePart('left', { scale: value });
      }

      if (editingPart === 'front' && autoAnchors) {
        snapAnchorsToFront();
      }
    }
  }, [editingPart, updatePart, autoAnchors, snapAnchorsToFront]);

  const handleSaveDefault = useCallback(() => {
    const config = getARConfig();
    console.log('Full config:', config);
    // Save only parameters, not image URLs
    const templateConfig = {
      frontParams: config.frontParams,
      leftParams: config.leftParams,
      rightParams: config.rightParams,
      autoAnchors: config.autoAnchors,
      // Explicitly exclude image URLs
    };
    console.log('Saving template (params only):', templateConfig);
    localStorage.setItem('ar_default_template', JSON.stringify(templateConfig));
    toast({ title: 'Configuração salva como padrão!' });
  }, [getARConfig, toast]);

  const handleClearAll = useCallback(() => {
    clearAll();
    localStorage.removeItem('ar_glasses_config');
    toast({ title: 'Editor limpo!' });
  }, [clearAll, toast]);

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const formatted = (parseInt(numbers) / 100).toFixed(2).replace('.', ',');
    return formatted === 'NaN' ? '' : formatted;
  };

  const handleSubmit = async () => {
    if (!name) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para o óculos.',
        variant: 'destructive',
      });
      return;
    }

    if (!model.parts.front.img) {
      toast({
        title: 'Imagem obrigatória',
        description: 'Faça upload da imagem frontal do óculos.',
        variant: 'destructive',
      });
      return;
    }

    if (coverImageMode === 'custom' && !customCoverImage) {
      toast({
        title: 'Imagem de capa obrigatória',
        description: 'Faça upload da imagem de capa ou selecione "Usar frente do óculos".',
        variant: 'destructive',
      });
      return;
    }

    const arConfig = {
      ...getARConfig(),
      purchaseType: linkType // Save preference
    };
    const imageUrl = model.parts.front.remoteUrl || '';

    // Determine cover image URL
    let coverImageUrl: string | null = null;

    if (coverImageMode === 'glasses') {
      // Use the front glasses image
      coverImageUrl = imageUrl;
    } else if (coverImageMode === 'custom' && customCoverImage) {
      // Upload custom cover image to Supabase Storage
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const fileName = `cover-${Date.now()}.png`;
        const filePath = `${profileId}/${fileName}`;

        // Convert base64 to blob
        const response = await fetch(customCoverImage);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('glasses-images')
          .upload(filePath, blob, {
            contentType: 'image/png',
            upsert: false,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('glasses-images')
          .getPublicUrl(filePath);

        coverImageUrl = publicUrl;
      } catch (error) {
        console.error('Error uploading cover image:', error);
        toast({
          title: 'Erro ao enviar imagem',
          description: 'Não foi possível fazer upload da imagem de capa.',
          variant: 'destructive',
        });
        return;
      }
    }

    await onSave({
      name,
      price,
      category,
      image_url: imageUrl,
      buy_link: buyLink,
      ar_config: arConfig,
      cover_image_url: coverImageUrl,
      whatsapp_contact_id: selectedContactId !== 'default' ? selectedContactId : null,
      tags: selectedTags, // Pass tags
    });
  };

  // State for 3D Publishing
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
      let templeUrl = ''; // Future implementation if we store temple separately

      // Upload Front Image (Processed)
      if (pending3DData.frontImage) {
        const fileName = `${profileId}/front-${Date.now()}.webp`; // Using WebP
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
        temple_url: templeUrl, // Save temple URL in config
        front_url_backup: frontUrl // Backup explicit reference
      };

      await onSave({
        name,
        price,
        category,
        image_url: frontUrl,
        buy_link: buyLink,
        ar_config: finalConfig,
        cover_image_url: frontUrl, // Use front image as cover by default for 3D models
        whatsapp_contact_id: selectedContactId !== 'default' ? selectedContactId : null,
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


  if (!useLegacyEditor) {
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
                      <Popover open={openTagCombobox} onOpenChange={setOpenTagCombobox}>
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
                        <PopoverContent className="w-[300px] p-0" align="start">
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

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
      {/* Left: AR Camera */}
      <div className="w-full lg:flex-[2.5] flex flex-col items-center gap-6">
        <ARCamera
          model={model}
          editingPart={editingPart}
          autoAnchors={autoAnchors}
          isLoading={isLoading}
          onLoadingChange={setIsLoading}
          onVideoStarted={() => selectPart('front')}
          smoothedRef={smoothedRef}
          lastAnchorsRef={lastAnchorsRef}
          onUpdatePart={updatePart}
          onSnapAnchors={snapAnchorsToFront}
          onPushHistory={pushHistory}
        />
      </div>

      {/* Right: Controls Panel */}
      <div className="w-full lg:w-96 flex flex-col gap-6 lg:sticky lg:top-28">

        {/* NEW: External Tools Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <ImageIcon className="w-5 h-5 text-indigo-600" /> 1 - EDIÇÃO
          </h2>
          <div className="space-y-3">
            <a
              href="https://www.remove.bg/pt-br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 block">Remover Fundo</span>
                <span className="text-xs text-slate-400">remove.bg</span>
              </div>
            </a>

            <a
              href="https://wipix.app.br/editor/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <Sparkles className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-pink-700 block">Editor de Lente</span>
                <span className="text-xs text-slate-400">wipix.app.br</span>
              </div>
            </a>
          </div>
        </div>

        {/* Components Panel */}
        <ARComponentsPanel
          model={model}
          editingPart={editingPart}
          onSelectPart={selectPart}
          onUploadPart={handleUploadPart}
          onSaveDefault={handleSaveDefault}
          onClearAll={handleClearAll}
          profileId={profileId}
          autoAnchors={autoAnchors}
          onAutoAnchorsChange={setAutoAnchors}
          onScaleChange={handleScaleChange}
        />

        {/* Fine Controls removed - now integrated in ARComponentsPanel */}

        {/* Product Info Form */}
        <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
            <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-500" /> Informações do Produto
          </h2>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Nome do Óculos *</Label>
              <Input
                placeholder="Ex: Ray-Ban Aviator"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Preço (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                  <Input
                    placeholder="0,00"
                    value={price}
                    onChange={(e) => setPrice(formatPrice(e.target.value))}
                    className="h-10 pl-9 border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</Label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(!showCategoryManager)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline transition-all"
                  >
                    Gerenciar
                  </button>
                </div>

                {/* Category Tags */}
                {showCategoryManager && (
                  <div className="mb-3 space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 text-xs font-medium px-2 py-1 rounded-md shadow-sm"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const { supabase } = await import('@/integrations/supabase/client');
                                const { error } = await supabase
                                  .from('categories')
                                  .delete()
                                  .eq('store_id', profileId)
                                  .eq('name', cat);

                                if (error) throw error;
                                const updatedCategories = categories.filter(c => c !== cat);
                                toast({ title: 'Categoria removida!' });
                                if (onCategoriesChange) await onCategoriesChange();
                              } catch (error: any) {
                                toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
                              }
                            }}
                            className="hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add New Category */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nova Categoria..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (!newCategoryName.trim()) return;

                            try {
                              const { supabase } = await import('@/integrations/supabase/client');
                              const { error } = await supabase
                                .from('categories')
                                .insert({
                                  store_id: profileId,
                                  name: newCategoryName.trim(),
                                });

                              if (error) throw error;

                              toast({ title: 'Categoria adicionada!' });
                              setNewCategoryName('');
                              if (onCategoriesChange) {
                                await onCategoriesChange();
                              }
                            } catch (error: any) {
                              toast({
                                title: 'Erro ao adicionar',
                                description: error.message,
                                variant: 'destructive',
                              });
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={async () => {
                          if (!newCategoryName.trim()) return;

                          try {
                            const { supabase } = await import('@/integrations/supabase/client');
                            const { error } = await supabase
                              .from('categories')
                              .insert({
                                store_id: profileId,
                                name: newCategoryName.trim(),
                              });

                            if (error) throw error;

                            toast({ title: 'Categoria adicionada!' });
                            setNewCategoryName('');
                            if (onCategoriesChange) {
                              await onCategoriesChange();
                            }
                          } catch (error: any) {
                            toast({
                              title: 'Erro ao adicionar',
                              description: error.message,
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {/* Category Selector */}
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:ring-indigo-500/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1e1e1e] border-slate-200 dark:border-slate-800">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="focus:bg-indigo-50 dark:focus:bg-indigo-900/20 cursor-pointer">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Tipo de Link</Label>
              <div className="flex gap-4 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${linkType === 'whatsapp' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-indigo-400'}`}>
                    {linkType === 'whatsapp' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="linkType"
                    value="whatsapp"
                    checked={linkType === 'whatsapp'}
                    onChange={() => setLinkType('whatsapp')}
                    className="sr-only"
                  />
                  <span className={`text-sm transition-colors ${linkType === 'whatsapp' ? 'text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${linkType === 'website' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-indigo-400'}`}>
                    {linkType === 'website' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="linkType"
                    value="website"
                    checked={linkType === 'website'}
                    onChange={() => {
                      setLinkType('website');
                      setBuyLink('');
                    }}
                    className="sr-only"
                  />
                  <span className={`text-sm transition-colors ${linkType === 'website' ? 'text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>Site / Loja</span>
                </label>
              </div>

            </div>

            {linkType === 'whatsapp' && waContacts.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Atendente Responsável</Label>
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger className="h-10 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                    <SelectValue placeholder="Padrão da Loja" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1e1e1e]">
                    <SelectItem value="default" className="font-semibold text-slate-500">
                      Padrão da Loja
                    </SelectItem>
                    {waContacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} ({contact.number.slice(-4)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Quem receberá as mensagens deste produto.
                </p>
              </div>
            )}

            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Link de Compra</Label>
            <Input
              placeholder="https://..."
              value={buyLink}
              onChange={(e) => setBuyLink(e.target.value)}
              readOnly={linkType === 'whatsapp' && waConfig?.enabled} // Read-only if auto-generated
              className={`h-10 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${linkType === 'whatsapp' && waConfig?.enabled ? 'bg-slate-50 dark:bg-slate-800 text-slate-500' : ''}`}
            />
            {linkType === 'whatsapp' && waConfig?.enabled && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Gerado automaticamente com base no número configurado.
              </p>
            )}
          </div>

          {/* Cover Image Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 mt-2">
            <Label className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
              Imagem de Capa (Vitrine)
            </Label>

            <div className="space-y-4">
              {/* Radio Options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="coverImage"
                    value="glasses"
                    checked={coverImageMode === 'glasses'}
                    onChange={() => setCoverImageMode('glasses')}
                    className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Usar frente do óculos</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="coverImage"
                    value="custom"
                    checked={coverImageMode === 'custom'}
                    onChange={() => setCoverImageMode('custom')}
                    className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Usar outra imagem</span>
                </label>
              </div>

              {/* File Upload (shown when custom is selected) */}
              {coverImageMode === 'custom' && (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCustomCoverImage(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="cover-image-upload"
                  />
                  <label htmlFor="cover-image-upload" className="cursor-pointer">
                    {customCoverImage ? (
                      <div className="space-y-2">
                        <img src={customCoverImage} alt="Cover preview" className="max-h-32 mx-auto rounded" />
                        <p className="text-xs text-slate-500">Clique para alterar</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-600 font-medium">Clique para enviar imagem</p>
                        <p className="text-xs text-slate-400">PNG, JPG até 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !model.parts.front.img}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingGlass ? 'Atualizar' : 'Publicar'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
