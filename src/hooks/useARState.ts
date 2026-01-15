import { useState, useCallback, useRef } from 'react';

export interface ARPartConfig {
  img: HTMLImageElement | null;
  remoteUrl: string | null;
  x: number;
  y: number;
  scale: number;
  anchorFrame: { x: number; y: number };
  anchorEar: { x: number; y: number };
}

export interface ARModel {
  parts: {
    front: ARPartConfig;
    left: ARPartConfig;
    right: ARPartConfig;
  };
}

export interface SmoothedFaceData {
  x: number | null;
  y: number | null;
  w: number | null;
  angle: number | null;
  yaw: number | null;
  jawLeft: { x: number; y: number } | null;
  jawRight: { x: number; y: number } | null;
}

export type EditingPart = 'front' | 'left' | 'right' | null;

const defaultPartConfig = (x = 0, y = 0, scale = 1): ARPartConfig => ({
  img: null,
  remoteUrl: null,
  x,
  y,
  scale,
  anchorFrame: { x: 0, y: 0 },
  anchorEar: { x: 0.3, y: 0 },
});

export const useARState = () => {
  const [model, setModel] = useState<ARModel>({
    parts: {
      front: defaultPartConfig(0, 0.05, 1.1),
      left: defaultPartConfig(0.05, 0, 0.8),
      right: defaultPartConfig(-0.05, 0, 0.8),
    },
  });

  const [editingPart, setEditingPart] = useState<EditingPart>('front');
  const [autoAnchors, setAutoAnchors] = useState(true);
  const [showTemples, setShowTemples] = useState(false);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const smoothedRef = useRef<SmoothedFaceData>({
    x: null,
    y: null,
    w: null,
    angle: null,
    yaw: null,
    jawLeft: null,
    jawRight: null,
  });

  const lastAnchorsRef = useRef<{
    frame: { x: number; y: number };
    ear: { x: number; y: number };
  } | null>(null);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const updatePart = useCallback((partName: keyof ARModel['parts'], updates: Partial<ARPartConfig>) => {
    setModel((prev) => ({
      ...prev,
      parts: {
        ...prev.parts,
        [partName]: {
          ...prev.parts[partName],
          ...updates,
        },
      },
    }));
  }, []);

  const snapAnchorsToFront = useCallback(() => {
    setModel((prev) => {
      const front = prev.parts.front;
      const halfWidth = front.scale * 0.45;
      const defaultHingeY = front.y - front.scale * 0.05;

      return {
        ...prev,
        parts: {
          ...prev.parts,
          left: {
            ...prev.parts.left,
            anchorFrame: { x: front.x - halfWidth, y: defaultHingeY },
          },
          right: {
            ...prev.parts.right,
            anchorFrame: { x: front.x + halfWidth, y: defaultHingeY },
          },
        },
      };
    });
  }, []);

  const selectPart = useCallback((part: EditingPart) => {
    setEditingPart(part);
  }, []);

  const clearAll = useCallback(() => {
    setModel({
      parts: {
        front: defaultPartConfig(0, 0.05, 1.1),
        left: defaultPartConfig(0.05, 0, 0.8),
        right: defaultPartConfig(-0.05, 0, 0.8),
      },
    });
    setEditingPart('front');
    setAutoAnchors(true);
  }, []);

  const pushHistory = useCallback(() => {
    const snapshot = JSON.stringify({
      parts: {
        front: { x: model.parts.front.x, y: model.parts.front.y, scale: model.parts.front.scale },
        left: { ...model.parts.left, img: undefined, remoteUrl: undefined },
        right: { ...model.parts.right, img: undefined, remoteUrl: undefined },
      },
      autoAnchors,
    });

    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    historyRef.current.push(snapshot);
    historyIndexRef.current++;

    if (historyRef.current.length > 20) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [model, autoAnchors]);

  const getARConfig = useCallback(() => {
    return {
      front: model.parts.front.remoteUrl,
      left: model.parts.left.remoteUrl,
      right: model.parts.right.remoteUrl,
      frontParams: {
        x: model.parts.front.x,
        y: model.parts.front.y,
        scale: model.parts.front.scale,
      },
      leftParams: {
        x: model.parts.left.x,
        y: model.parts.left.y,
        scale: model.parts.left.scale,
        anchorFrame: model.parts.left.anchorFrame,
        anchorEar: model.parts.left.anchorEar,
      },
      rightParams: {
        x: model.parts.right.x,
        y: model.parts.right.y,
        scale: model.parts.right.scale,
        anchorFrame: model.parts.right.anchorFrame,
        anchorEar: model.parts.right.anchorEar,
      },
      autoAnchors,
    };
  }, [model, autoAnchors]);

  const applyARConfig = useCallback((config: any) => {
    if (!config) return;

    setModel((prev) => {
      const newParts = { ...prev.parts };

      // Apply front params
      if (config.frontParams) {
        newParts.front = {
          ...newParts.front,
          x: config.frontParams.x ?? newParts.front.x,
          y: config.frontParams.y ?? newParts.front.y,
          scale: config.frontParams.scale ?? newParts.front.scale,
        };
      }

      // Apply left params
      if (config.leftParams) {
        newParts.left = {
          ...newParts.left,
          x: config.leftParams.x ?? newParts.left.x,
          y: config.leftParams.y ?? newParts.left.y,
          scale: config.leftParams.scale ?? newParts.left.scale,
          anchorFrame: config.leftParams.anchorFrame ?? newParts.left.anchorFrame,
          anchorEar: config.leftParams.anchorEar ?? newParts.left.anchorEar,
        };
      }

      // Apply right params
      if (config.rightParams) {
        newParts.right = {
          ...newParts.right,
          x: config.rightParams.x ?? newParts.right.x,
          y: config.rightParams.y ?? newParts.right.y,
          scale: config.rightParams.scale ?? newParts.right.scale,
          anchorFrame: config.rightParams.anchorFrame ?? newParts.right.anchorFrame,
          anchorEar: config.rightParams.anchorEar ?? newParts.right.anchorEar,
        };
      }

      return { ...prev, parts: newParts };
    });

    if (typeof config.autoAnchors !== 'undefined') {
      setAutoAnchors(config.autoAnchors);
    }

    // Load images if URLs are provided
    ['front', 'left', 'right'].forEach((partName) => {
      const url = config[partName];
      if (url) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          updatePart(partName as keyof ARModel['parts'], { img, remoteUrl: url });
        };
        img.src = url;
      }
    });
  }, [updatePart]);

  return {
    model,
    setModel,
    editingPart,
    setEditingPart,
    autoAnchors,
    setAutoAnchors,
    showTemples,
    setShowTemples,
    isVideoStarted,
    setIsVideoStarted,
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
  };
};

export default useARState;
