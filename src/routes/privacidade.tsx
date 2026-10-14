import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/legal";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade — Sextante" }] }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade do Sextante">
      <Section title="1. Quem somos">
        <p>
          O Sextante é operado por {BRAND.legalEntity}, responsável pelo tratamento dos dados descritos aqui. Contato:{" "}
          {BRAND.supportEmail}.
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Conta: nome, e-mail e senha (guardada apenas em formato criptografado).</li>
          <li>Conteúdo que você cria: operações do Diário, simulações salvas, progresso na Academia e mensagens de suporte.</li>
          <li>Assinatura: status, plano e identificadores do cliente na Stripe, Apple ou Google. Não recebemos nem guardamos dados de cartão.</li>
          <li>Uso: métricas agregadas de navegação (Vercel Analytics), sem cookies de publicidade.</li>
        </ul>
        <p>Usar o simulador sem conta não envia os números simulados para os nossos servidores.</p>
      </Section>

      <Section title="3. Para que usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Prestar o serviço: login, salvar seus dados e calcular suas métricas.</li>
          <li>Gerenciar a assinatura e o acesso Pro.</li>
          <li>Enviar e-mails de serviço, como redefinição de senha.</li>
          <li>Melhorar o produto com estatísticas agregadas.</li>
        </ul>
        <p>Não vendemos seus dados e não os usamos para publicidade de terceiros.</p>
      </Section>

      <Section title="4. Com quem compartilhamos">
        <p>
          Apenas com fornecedores necessários para operar o serviço: hospedagem e banco de dados (Vercel e Neon),
          pagamentos (Stripe, Apple, Google e RevenueCat) e envio de e-mail (Resend). Eles tratam os dados em nosso nome
          e seguem suas próprias políticas de segurança. Podemos divulgar dados quando exigido por lei.
        </p>
      </Section>

      <Section title="5. Onde os dados ficam e por quanto tempo">
        <p>
          Os dados são armazenados em servidores nos Estados Unidos. Mantemos os dados enquanto sua conta existir. Ao
          excluir a conta, apagamos seus dados em até 30 dias, exceto registros que a lei nos obrigue a manter.
        </p>
      </Section>

      <Section title="6. Seus direitos">
        <p>
          Você pode acessar, corrigir, exportar ou excluir seus dados. A exclusão completa da conta está disponível em{" "}
          <Link to="/conta" className="underline">Minha conta</Link>. Se você mora no Brasil, também tem os direitos
          previstos na LGPD; para exercê-los, fale com o{" "}
          <Link to="/suporte" className="underline">Suporte</Link>.
        </p>
      </Section>

      <Section title="7. Segurança">
        <p>
          Usamos conexão criptografada (HTTPS), senhas com hash e acesso aos dados restrito ao dono da conta. Nenhum
          sistema é 100% seguro; se ocorrer um incidente relevante, avisaremos você.
        </p>
      </Section>

      <Section title="8. Menores de idade">
        <p>O Sextante não é destinado a menores de 18 anos.</p>
      </Section>

      <Section title="9. Alterações">
        <p>Avisaremos sobre mudanças relevantes nesta política por e-mail ou no app.</p>
      </Section>
    </LegalPage>
  );
}
