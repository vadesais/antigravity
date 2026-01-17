import { FaceAnalysis } from '@/types/visagismo';

interface Landmark {
    x: number;
    y: number;
    z?: number;
}

interface PixelPoint {
    x: number;
    y: number;
}

/**
 * Analisa o formato do rosto baseado em landmarks faciais do MediaPipe
 * @param landmarks Array de landmarks faciais (468 pontos)
 * @param width Largura da imagem
 * @param height Altura da imagem
 * @returns Análise completa do formato facial
 */
export function analyzeFaceShape(
    landmarks: Landmark[],
    width: number,
    height: number
): FaceAnalysis {
    // Converte landmark normalizado para pixels
    const toPixel = (landmark: Landmark): PixelPoint => ({
        x: landmark.x * width,
        y: landmark.y * height,
    });

    // Pontos-chave do rosto
    const cheekLeft = toPixel(landmarks[234]);
    const cheekRight = toPixel(landmarks[454]);
    const jawLeft = toPixel(landmarks[58]);
    const jawRight = toPixel(landmarks[288]);
    const templeLeft = toPixel(landmarks[103]);
    const templeRight = toPixel(landmarks[332]);
    const chin = toPixel(landmarks[152]);
    const foreheadTop = toPixel(landmarks[10]);

    // Cálculo de distâncias
    const cheekWidth = Math.hypot(
        cheekRight.x - cheekLeft.x,
        cheekRight.y - cheekLeft.y
    );
    const jawWidth = Math.hypot(jawRight.x - jawLeft.x, jawRight.y - jawLeft.y);
    const foreheadWidth = Math.hypot(
        templeRight.x - templeLeft.x,
        templeRight.y - templeLeft.y
    );
    const faceHeight = Math.hypot(
        chin.x - foreheadTop.x,
        chin.y - foreheadTop.y
    );

    // Índices proporcionais
    const faceIndex = faceHeight / cheekWidth;
    const jawIndex = jawWidth / cheekWidth;
    const foreheadIndex = foreheadWidth / cheekWidth;

    // Determinação do formato facial
    let shape = 'Oval';
    let description = 'Seu rosto tem proporções equilibradas.';
    let recommendedStyle = 'quase todos os tipos de armação.';

    if (faceIndex > 1.38) {
        // Rosto alongado
        if (jawIndex >= 0.85) {
            shape = 'Retangular';
            description = 'Seu rosto é alongado com maxilar reto e bem definido.';
            recommendedStyle =
                'armações grandes, quadradas ou aviador para equilibrar o comprimento.';
        } else if (jawIndex < 0.72 && foreheadIndex < 0.72) {
            shape = 'Diamante';
            description =
                'Suas bochechas são a parte mais larga, com testa e queixo estreitos.';
            recommendedStyle = 'armações gatinho, ovais ou sem aro.';
        } else {
            shape = 'Oval';
            description =
                'Seu rosto é alongado com curvas suaves e proporções harmônicas.';
            recommendedStyle =
                'quase todos os estilos, especialmente geométricos e gatinho.';
        }
    } else {
        // Rosto mais curto
        if (jawIndex >= 0.88) {
            shape = 'Quadrado';
            description =
                'Seu rosto tem altura e largura similares, com maxilar marcante e angular.';
            recommendedStyle = 'armações redondas ou ovais para suavizar as linhas.';
        } else if (jawIndex >= 0.75) {
            shape = 'Redondo';
            description =
                'Seu rosto tem largura e altura semelhantes, com contornos arredondados e suaves.';
            recommendedStyle =
                'armações quadradas e retangulares para adicionar estrutura.';
        } else {
            shape = 'Coração';
            description =
                'Sua testa é mais larga que o maxilar, e o rosto afina até o queixo.';
            recommendedStyle =
                'armações ovais, redondas ou com a base mais larga (aviador).';
        }
    }

    return {
        shape,
        description,
        recommendedStyle,
        measurements: {
            faceIndex,
            jawIndex,
            foreheadIndex,
        },
    };
}
