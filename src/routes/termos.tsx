import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/legal";
import { BRAND } from "@/lib/brand";
import { FREE_LIMITS } from "@/lib/access";
import { TRIAL_DAYS } from "@/lib/billing/plans";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de Uso — Sextante" }] }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <LegalPage title="Termos de Uso do Sextante">
      <Section title="1. O que é o Sextante">
        <p>
          O Sextante é uma ferramenta educacional e de simulação sobre opções negociadas no mercado dos Estados Unidos.
          Ele oferece conteúdo didático, um simulador de estratégias e um diário para registrar operações. O serviço é
          operado por {BRAND.legalEntity} ("nós"). Ao criar uma conta ou usar o Sextante, você concorda com estes Termos.
        </p>
      </Section>

      <Section title="2. Não é consultoria nem intermediação">
        <p>
          O Sextante não é corretora, consultor de investimentos, analista de valores mobiliários nem gestor de
          recursos. Não fazemos recomendações personalizadas, não indicamos ativos ou operações específicas para você,
          não recebemos ordens e não nos conectamos à sua conta em corretora.
        </p>
        <p>
          Todo o conteúdo e todos os cálculos têm finalidade exclusivamente educacional. Decisões de investimento são
          suas. Antes de investir, considere procurar um profissional habilitado na sua jurisdição.
        </p>
      </Section>

      <Section title="3. Riscos de opções">
        <p>
          Opções são instrumentos complexos e de alto risco. É possível perder todo o valor aplicado e, em algumas
          estratégias, mais do que o valor aplicado. Antes de operar, leia o documento oficial "Characteristics and Risks
          of Standardized Options", disponibilizado pela sua corretora e pela Options Clearing Corporation.
        </p>
      </Section>

      <Section title="4. Limites dos cálculos">
        <p>
          O simulador usa modelos matemáticos (como Black-Scholes) e premissas simplificadoras: preços com distribuição
          lognormal, exercício europeu, ausência de dividendos e taxa de juros informada. Probabilidades e valores
          esperados dependem dos dados e da volatilidade que você informa e não são previsões. Resultados reais podem
          ser muito diferentes por causa de liquidez, spreads, exercício antecipado, eventos, impostos e custos.
        </p>
        <p>Resultados passados, simulados ou registrados no Diário não garantem resultados futuros.</p>
      </Section>

      <Section title="5. Conta">
        <p>
          Você deve ter pelo menos 18 anos, fornecer um e-mail válido e manter sua senha em sigilo. Você é responsável
          pelos dados que registra no Diário. Você pode excluir sua conta a qualquer momento em{" "}
          <Link to="/conta" className="underline">Minha conta</Link>.
        </p>
      </Section>

      <Section title="6. Planos e assinatura">
        <p>
          O plano grátis inclui parte das estratégias e da Academia, até {FREE_LIMITS.trades} operações no Diário e até{" "}
          {FREE_LIMITS.simulations} simulações salvas. O Sextante Pro é uma assinatura mensal ou anual, com teste grátis
          de {TRIAL_DAYS} dias para novos assinantes, renovada automaticamente até ser cancelada.
        </p>
        <p>
          Assinaturas feitas no site são cobradas pela Stripe e canceladas no portal de assinatura. Assinaturas feitas
          nos apps são cobradas pela Apple ou pelo Google e seguem as regras de cobrança, cancelamento e reembolso dessas
          lojas. Ao cancelar, o acesso Pro continua até o fim do período já pago.
        </p>
      </Section>

      <Section title="7. Uso aceitável">
        <p>
          Não é permitido copiar ou revender o conteúdo da Academia, tentar acessar dados de outros usuários,
          sobrecarregar o serviço ou usá-lo para atividades ilegais.
        </p>
      </Section>

      <Section title="8. Propriedade intelectual">
        <p>
          O software, os textos, a marca e o design do Sextante pertencem a {BRAND.legalEntity}. Os dados que você
          registra continuam sendo seus.
        </p>
      </Section>

      <Section title="9. Limitação de responsabilidade">
        <p>
          O serviço é oferecido "no estado em que se encontra". Na máxima extensão permitida por lei, não respondemos
          por perdas financeiras decorrentes de decisões de investimento, nem por danos indiretos. Nossa
          responsabilidade total fica limitada ao valor pago por você nos 12 meses anteriores ao evento.
        </p>
      </Section>

      <Section title="10. Alterações e lei aplicável">
        <p>
          Podemos atualizar estes Termos e avisaremos sobre mudanças relevantes por e-mail ou no app. Estes Termos são
          regidos pelas leis do {BRAND.governingLaw}, sem prejuízo dos direitos de consumidor garantidos pela lei do seu
          país de residência.
        </p>
      </Section>

      <Section title="11. Contato">
        <p>
          Dúvidas: <Link to="/suporte" className="underline">Suporte</Link> ou {BRAND.supportEmail}.
        </p>
      </Section>
    </LegalPage>
  );
}
