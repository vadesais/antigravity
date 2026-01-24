import { useState, useEffect, useCallback } from 'react';
import ARCamera from './ARCamera';
import ARComponentsPanel from './ARComponentsPanel';
import ARFineControls from './ARFineControls';
import { useARState } from '@/hooks/useARState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tag, Save, Loader2, Image as ImageIcon, Upload, X, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import Advanced3DEditor from '../admin/Advanced3DEditor';

interface EditingGlass {
  id: string;
  name: string;
  price: string | null;
  category: string | null;
  image_url: string;
  buy_link: string | null;
  ar_config: any;
}

interface AREditorProps {
  profileId: string;
  categories: string[];
  onSave: (glassData: {
    name: string;
    price: string;
    category: string;
    image_url: string;
    buy_link: string;
    ar_config: any;
    cover_image_url: string | null;
  }) => Promise<void>;
  editingGlass?: EditingGlass | null;
  onCancel?: () => void;
  isSubmitting?: boolean;
  waConfig?: {
    enabled: boolean;
    number: string;
    message: string;
  };
  onCategoriesChange?: () => Promise<void>;
}

export default function AREditor({
  profileId,
  categories,
  onSave,
  editingGlass,
  onCancel,
  isSubmitting = false,
  waConfig,
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

  // Auto-generate WhatsApp link
  useEffect(() => {
    if (linkType === 'whatsapp' && waConfig?.enabled && waConfig?.number) {
      const encodedMessage = encodeURIComponent(`${waConfig.message} ${name || ''}`.trim());
      const link = `http://api.whatsapp.com/send/?phone=${waConfig.number}&text=${encodedMessage}`;
      setBuyLink(link);
    }
  }, [name, waConfig, linkType]);

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
      setBuyLink('');
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
            <div className="bg-white dark:bg-[#1e1e1e] border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Preencha os detalhes</h2>
                <button onClick={() => setIsPublishModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Image Preview */}
                <div className="flex justify-center mb-4">
                  {pending3DData?.frontImage && (
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-2 relative">
                      <img src={pending3DData.frontImage} className="w-full h-full object-contain" />
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">3D</div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="dark:text-slate-200">Nome do Óculos *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ray-Ban Aviator" className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="dark:text-slate-200">Preço (R$)</Label>
                    <Input value={price} onChange={e => setPrice(formatPrice(e.target.value))} placeholder="0,00" className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" />
                  </div>
                  <div>
                    <Label className="dark:text-slate-200">Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#1e1e1e] dark:border-slate-700 z-[100]">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="dark:text-slate-200 dark:focus:bg-slate-800">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Tipo de Link</Label>
                  <div className="flex gap-4 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${linkType === 'whatsapp' ? 'border-green-600 bg-green-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-green-400'}`}>
                        {linkType === 'whatsapp' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <input
                        type="radio"
                        name="linkTypeModal"
                        value="whatsapp"
                        checked={linkType === 'whatsapp'}
                        onChange={() => setLinkType('whatsapp')}
                        className="sr-only"
                      />
                      <span className={`text-sm transition-colors ${linkType === 'whatsapp' ? 'text-green-700 dark:text-green-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${linkType === 'website' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-blue-400'}`}>
                        {linkType === 'website' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <input
                        type="radio"
                        name="linkTypeModal"
                        value="website"
                        checked={linkType === 'website'}
                        onChange={() => {
                          setLinkType('website');
                          setBuyLink('');
                        }}
                        className="sr-only"
                      />
                      <span className={`text-sm transition-colors ${linkType === 'website' ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>Site / Loja</span>
                    </label>
                  </div>

                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Link de Compra</Label>
                  <Input
                    value={buyLink}
                    onChange={e => setBuyLink(e.target.value)}
                    placeholder="https://..."
                    readOnly={linkType === 'whatsapp' && waConfig?.enabled}
                    className={`h-10 border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${linkType === 'whatsapp' && waConfig?.enabled ? 'bg-slate-50 dark:bg-slate-800 text-slate-500' : ''}`}
                  />
                  {linkType === 'whatsapp' && waConfig?.enabled && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span> Gerado automaticamente com base no número configurado.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleConfirmPublish}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 mt-4"
                  disabled={isPublishing}
                >
                  {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Confirmar e Publicar
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
      <div className="w-full lg:flex-[1.5] flex flex-col items-center gap-6">
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
    </div>
  );
}
