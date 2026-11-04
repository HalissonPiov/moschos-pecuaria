import { useState } from "react";
import {
  BellRing,
  Calculator,
  Camera,
  Check,
  ChevronRight,
  CloudOff,
  Edit3,
  KeyRound,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Split,
  UserRound,
  WandSparkles,
} from "lucide-react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Field, Modal, Toast } from "@/shared/ui/UI";

const futureItems = [
  { icon: Camera, title: "Leitura automática da nota", text: "Foto transformada em itens e valores para você apenas conferir." },
  { icon: Split, title: "Custos gerais com rateio", text: "Distribuição de despesas da propriedade entre os lotes." },
  { icon: BellRing, title: "Melhor momento de venda", text: "Sugestões e alertas com base em custo, peso e cotação." },
  { icon: CloudOff, title: "Modo offline", text: "Registre no campo e sincronize quando a internet voltar." },
  { icon: RefreshCw, title: "Cotação automática", text: "Importação de referências de mercado sem digitação." },
];

export default function SettingsPage() {
  const [modal, setModal] = useState<"profile" | "password" | "calculation" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="settings-page">
        <header className="section-heading"><div><span className="eyebrow">SUA CONTA</span><h1>Configurações</h1><p>Preferências, segurança e informações da fazenda.</p></div></header>
        <div className="settings-layout">
          <main className="settings-main">
            <section className="settings-section"><div className="settings-section__heading"><UserRound /><div><h2>Perfil</h2><p>Seus dados de acesso ao Mo$chos.</p></div></div><button className="settings-row" onClick={() => setModal("profile")}><span className="settings-avatar">JM</span><p><strong>João Mendes</strong><small>joao@fazendadabaixada.com.br</small></p><Edit3 /></button><button className="settings-row" onClick={() => setModal("password")}><span><KeyRound /></span><p><strong>Trocar senha</strong><small>Última alteração há 4 meses</small></p><ChevronRight /></button></section>

            <section className="settings-section"><div className="settings-section__heading"><MapPin /><div><h2>Propriedades e região</h2><p>Defina de onde vêm suas referências.</p></div></div><button className="settings-row"><span className="property-mini-logo">FB</span><p><strong>Fazenda da Baixada</strong><small>Piedade de Ponte Nova/MG · 70 ha</small></p><Edit3 /></button><button className="settings-row"><span><MapPin /></span><p><strong>Região padrão de cotação</strong><small>Triângulo Mineiro — MG</small></p><ChevronRight /></button><Button variant="secondary" icon={<Plus />}>Adicionar propriedade</Button></section>

            <section className="settings-section"><div className="settings-section__heading"><Calculator /><div><h2>Transparência</h2><p>Entenda os números exibidos no sistema.</p></div></div><button className="settings-row" onClick={() => setModal("calculation")}><span><Calculator /></span><p><strong>Como calculamos</strong><small>Custos, margens e arroba de equilíbrio</small></p><ChevronRight /></button></section>
          </main>

          <aside className="coming-soon"><div className="coming-soon__heading"><span><Sparkles /></span><div><b>EM BREVE</b><h2>Novidades que vêm por aí</h2><p>Estamos preparando ferramentas para deixar sua gestão ainda mais simples.</p></div></div><div className="future-list">{futureItems.map(({ icon: Icon, title, text }) => <div key={title}><span><Icon /></span><p><strong>{title}</strong><small>{text}</small></p></div>)}</div></aside>
        </div>
      </div>

      <Modal open={modal === "profile"} onClose={() => setModal(null)} title="Editar perfil"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setModal(null); setToast("Perfil atualizado."); }}><Field label="Nome completo" autoComplete="name" defaultValue="João Mendes" /><Field label="E-mail" type="email" autoComplete="email" defaultValue="joao@fazendadabaixada.com.br" /><Field label="Telefone" type="tel" inputMode="tel" autoComplete="tel" defaultValue="(31) 98842-1047" /><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Salvar alterações</Button></div></form></Modal>
      <Modal open={modal === "password"} onClose={() => setModal(null)} title="Trocar senha"><form className="form-stack" onSubmit={(event) => { event.preventDefault(); setModal(null); setToast("Senha atualizada com segurança."); }}><Field label="Senha atual" type="password" autoComplete="current-password" /><Field label="Nova senha" type="password" autoComplete="new-password" /><Field label="Confirmar nova senha" type="password" autoComplete="new-password" /><div className="password-safety"><Lock /><span>Use pelo menos 8 caracteres, com letras e números.</span></div><div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button><Button type="submit">Atualizar senha</Button></div></form></Modal>
      <Modal open={modal === "calculation"} onClose={() => setModal(null)} title="Como calculamos"><div className="calculation-help"><p>O Mo$chos usa apenas lançamentos confirmados para compor os custos e deixa previsões sempre separadas.</p><ol><li><span>1</span><div><strong>Custo por animal</strong><p>Custo confirmado do lote dividido pela quantidade original.</p></div></li><li><span>2</span><div><strong>Margem sobre custos diretos</strong><p>Valor recebido menos custo apropriado e taxas informadas.</p></div></li><li><span>3</span><div><strong>Arroba de equilíbrio</strong><p>Preço mínimo estimado para cobrir custos diretos no cenário informado.</p></div></li></ol><div className="help-note"><Check /> Previsões nunca alteram seus resultados confirmados.</div></div></Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
