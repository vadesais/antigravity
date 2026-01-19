import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, TrendingUp, Calendar, Clock } from 'lucide-react';

interface ModelCreationControlProps {
    userId: string;
    onUpdate?: () => void;
}

interface Stats {
    totalGenerations: number;
    todayCount: number;
    monthCount: number;
}

export default function ModelCreationControl({ userId, onUpdate }: ModelCreationControlProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [enabled, setEnabled] = useState(false);
    const [dailyLimit, setDailyLimit] = useState(10);
    const [monthlyLimit, setMonthlyLimit] = useState(100);
    const [stats, setStats] = useState<Stats>({
        totalGenerations: 0,
        todayCount: 0,
        monthCount: 0
    });

    useEffect(() => {
        if (userId) {
            loadData();
        }
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Buscar configuração do profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('allow_model_creation')
                .eq('id', userId)
                .single();

            if (profile) {
                setEnabled(profile.allow_model_creation || false);
            }

            // Buscar limites
            const { data: limits } = await supabase
                .from('model_generation_limits')
                .select('daily_limit, monthly_limit, daily_count, monthly_count')
                .eq('profile_id', userId)
                .single();

            if (limits) {
                setDailyLimit(limits.daily_limit);
                setMonthlyLimit(limits.monthly_limit);
                setStats(prev => ({
                    ...prev,
                    todayCount: limits.daily_count,
                    monthCount: limits.monthly_count
                }));
            }

            // Buscar total de gerações
            const { count: totalCount } = await supabase
                .from('model_generations')
                .select('*', { count: 'exact', head: true })
                .eq('profile_id', userId);

            setStats(prev => ({
                ...prev,
                totalGenerations: totalCount || 0
            }));

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Atualizar profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ allow_model_creation: enabled })
                .eq('id', userId);

            if (profileError) throw profileError;

            // Atualizar ou criar limites
            const { error: limitsError } = await supabase
                .from('model_generation_limits')
                .upsert({
                    profile_id: userId,
                    daily_limit: dailyLimit,
                    monthly_limit: monthlyLimit
                }, {
                    onConflict: 'profile_id'
                });

            if (limitsError) throw limitsError;

            toast({
                title: 'Configurações salvas!',
                description: 'As configurações de criação de modelos foram atualizadas.'
            });

            if (onUpdate) onUpdate();
        } catch (error: any) {
            toast({
                title: 'Erro ao salvar',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Criação de Modelos</h3>
                        <p className="text-sm text-slate-500">Geração de modelos com IA</p>
                    </div>
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={setEnabled}
                />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{stats.totalGenerations}</div>
                    <div className="text-xs text-blue-600">gerações</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-600">Hoje</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{stats.todayCount}</div>
                    <div className="text-xs text-green-600">de {dailyLimit}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">Este Mês</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{stats.monthCount}</div>
                    <div className="text-xs text-purple-600">de {monthlyLimit}</div>
                </div>
            </div>

            {/* Limits Configuration */}
            {enabled && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="font-semibold text-slate-800">Limites de Uso</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="daily-limit">Limite Diário</Label>
                            <Input
                                id="daily-limit"
                                type="number"
                                value={dailyLimit}
                                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="monthly-limit">Limite Mensal</Label>
                            <Input
                                id="monthly-limit"
                                type="number"
                                value={monthlyLimit}
                                onChange={(e) => setMonthlyLimit(parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
        </div>
    );
}
