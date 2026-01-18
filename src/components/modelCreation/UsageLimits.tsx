import { AlertCircle } from 'lucide-react';
import { ModelGenerationLimits } from '@/types/modelCreation';

interface UsageLimitsProps {
    limits: ModelGenerationLimits;
}

export default function UsageLimits({ limits }: UsageLimitsProps) {
    const dailyPercentage = (limits.daily_count / limits.daily_limit) * 100;
    const isNearLimit = dailyPercentage >= 80;
    const isAtLimit = limits.daily_count >= limits.daily_limit;

    return (
        <div className={`p-5 rounded-xl border-2 ${isAtLimit
                ? 'bg-red-50 border-red-200'
                : isNearLimit
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-slate-50 border-slate-200'
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                        Uso Diário
                    </h3>
                    <p className="text-xs text-slate-600">
                        {limits.daily_count} de {limits.daily_limit} gerações utilizadas hoje
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                        {limits.daily_limit - limits.daily_count}
                    </p>
                    <p className="text-xs text-slate-600">restantes</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                <div
                    className={`h-2 rounded-full transition-all ${isAtLimit
                            ? 'bg-red-500'
                            : isNearLimit
                                ? 'bg-yellow-500'
                                : 'bg-blue-500'
                        }`}
                    style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
                />
            </div>

            {/* Warning */}
            {isAtLimit && (
                <div className="flex items-start gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">
                        Limite diário atingido. Tente novamente amanhã ou entre em contato para aumentar seu limite.
                    </p>
                </div>
            )}

            {isNearLimit && !isAtLimit && (
                <div className="flex items-start gap-2 text-yellow-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">
                        Você está próximo do limite diário. Use com moderação.
                    </p>
                </div>
            )}
        </div>
    );
}
