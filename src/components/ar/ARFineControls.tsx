import { Sliders } from 'lucide-react';
import type { ARModel, EditingPart } from '@/hooks/useARState';

interface ARFineControlsProps {
  model: ARModel;
  editingPart: EditingPart;
  autoAnchors: boolean;
  onAutoAnchorsChange: (value: boolean) => void;
  onScaleChange: (value: number) => void;
}

export default function ARFineControls({
  model,
  editingPart,
  autoAnchors,
  onAutoAnchorsChange,
  onScaleChange,
}: ARFineControlsProps) {
  if (!editingPart) return null;

  const currentPart = model.parts[editingPart];
  const isFront = editingPart === 'front';

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" /> Ajustes Finos
        </h2>

        {isFront && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <label
              className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
              htmlFor="cb-auto-anchor"
            >
              Auto-Ajuste
            </label>
            <input
              type="checkbox"
              id="cb-auto-anchor"
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              checked={autoAnchors}
              onChange={(e) => onAutoAnchorsChange(e.target.checked)}
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Scale Control */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-700">Tamanho / Escala</label>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {currentPart.scale.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            value={currentPart.scale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-blue-600
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
      </div>

      {/* Hint for temples */}
      {!isFront && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
            Arraste as âncoras para ajustar posição
          </p>
        </div>
      )}
    </div>
  );
}
