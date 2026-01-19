import { useEffect } from 'react';

const Index = () => {
  useEffect(() => {
    // Adicionar estilos globais
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --bg: #f9fafb;
        --text: #0f172a;
        --muted: #475569;
        --primary: #2563eb;
        --primary-hover: #1d4ed8;
        --whatsapp: #22c55e;
        --card: #ffffff;
        --border: #e5e7eb;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', sans-serif;
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        color: var(--text);
      }

      .lp-container {
        max-width: 1180px;
        margin: auto;
        padding: 80px 24px;
      }

      .lp-hero {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 64px;
        align-items: center;
        min-height: 100vh;
      }

      .lp-hero img {
        width: 100%;
        border-radius: 20px;
        box-shadow: 0 30px 60px rgba(15,23,42,0.12);
      }

      .lp-h1 {
        font-size: 44px;
        font-weight: 700;
        line-height: 1.15;
        margin-bottom: 20px;
        color: #0f172a;
      }

      .lp-subtitle {
        font-size: 18px;
        color: var(--muted);
        margin-bottom: 32px;
        max-width: 520px;
      }

      .lp-benefits {
        display: grid;
        gap: 14px;
        margin-bottom: 40px;
      }

      .lp-benefits div {
        font-size: 16px;
        color: var(--text);
      }

      .lp-benefits span {
        color: var(--primary);
        font-weight: 600;
        margin-right: 6px;
      }

      .lp-actions {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 36px;
      }

      .lp-btn-primary {
        background: var(--primary);
        color: #fff;
        padding: 14px 28px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        transition: all .2s ease;
        display: inline-block;
      }

      .lp-btn-primary:hover {
        background: var(--primary-hover);
        transform: translateY(-1px);
      }

      .lp-btn-secondary {
        background: #ecfdf5;
        color: #047857;
        padding: 14px 24px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 600;
        border: 1px solid #d1fae5;
        display: inline-block;
      }

      .lp-pricing {
        border-top: 1px solid var(--border);
        padding-top: 24px;
        max-width: 520px;
      }

      .lp-pricing strong {
        display: block;
        margin-bottom: 8px;
        color: var(--text);
      }

      .lp-pricing p {
        font-size: 15px;
        color: var(--muted);
        margin: 0;
      }

      /* WhatsApp flutuante */
      .lp-whatsapp {
        position: fixed;
        right: 24px;
        bottom: 24px;
        background: var(--whatsapp);
        color: #fff;
        padding: 14px 20px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 600;
        box-shadow: 0 20px 40px rgba(34,197,94,.35);
        z-index: 50;
      }

      /* Mobile */
      @media (max-width: 900px) {
        .lp-hero {
          grid-template-columns: 1fr;
          min-height: auto;
          gap: 40px;
        }

        .lp-h1 {
          font-size: 36px;
        }

        .lp-container {
          padding: 48px 20px;
        }

        .lp-actions {
          flex-direction: column;
          align-items: stretch;
        }
        
        .lp-actions a {
            text-align: center;
        }

        .lp-hero img {
            order: -1; /* Imagem acima no mobile */
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="lp-container">
        <section className="lp-hero">

          {/* TEXTO */}
          <div>
            <h1 className="lp-h1">Provador Virtual para Óticas</h1>

            <p className="lp-subtitle">
              Um provador virtual simples para óticas que permite ao cliente experimentar armações na hora e decidir com mais confiança.
            </p>

            <div className="lp-benefits">
              <div><span>✓</span>Ajuda o cliente a decidir mais rápido</div>
              <div><span>✓</span>Visualização realista no próprio rosto</div>
              <div><span>✓</span>Funciona direto no celular ou computador</div>
              <div><span>✓</span>Valoriza a experiência da sua ótica</div>
              <div><span>✓</span>Implementação simples e rápida</div>
            </div>

            <div className="lp-actions">
              <a href="#whats" className="lp-btn-primary">Quero saber mais</a>
              <a
                href="https://wa.me/SEU_NUMERO_AQUI?text=Quero%20saber%20mais%20sobre%20o%20provador%20virtual%20para%20óticas"
                target="_blank"
                rel="noreferrer"
                className="lp-btn-secondary"
                id="whats"
              >
                Falar no WhatsApp
              </a>
            </div>

            <div className="lp-pricing">
              <strong>Tecnologia acessível para óticas</strong>
              <p>
                Sem equipamentos caros, sem contratos longos e com um custo que cabe na rotina da loja.
              </p>
            </div>
          </div>

          {/* IMAGEM */}
          <div>
            <img src="/hero.webp" alt="Provador virtual de óculos em uso na ótica" />
          </div>

        </section>
      </div>

      <a
        href="https://wa.me/SEU_NUMERO_AQUI?text=Oi!%20Tenho%20interesse%20no%20provador%20virtual%20para%20ótica"
        target="_blank"
        rel="noreferrer"
        className="lp-whatsapp"
      >
        💬 Fale com a gente
      </a>
    </div>
  );
};

export default Index;
