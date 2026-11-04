import { useState } from "react";
import { useSearchParams } from "react-router";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Beef,
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleHelp,
  Plus,
  Scale,
  TrendingUp,
  WalletCards,
  Wheat,
} from "lucide-react";
import { motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Modal, StateView } from "@/shared/ui/UI";

const expenses = [
  { date: "08 nov", category: "Suplemento", target: "Lote Safra 24", value: "R$ 2.184,70", icon: Wheat },
  { date: "16 nov", category: "Locação de pasto", target: "Lote Bezerros Sul", value: "R$ 3.250,00", icon: CalendarClock },
  { date: "27 nov", category: "Medicamento", target: "Lote Safra 24", value: "R$ 786,45", icon: Plus },
];

export default function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const state = params.get("estado") as "loading" | "error" | "empty" | null;
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <AppShell>
      {state ? <StateView type={state} onRetry={() => setParams({})} /> : (
        <motion.div className="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <header className="dashboard__heading">
            <div><span className="eyebrow">QUARTA, 5 DE NOVEMBRO</span><h1>Bom dia, João.</h1><p>Veja como está a Fazenda da Baixada hoje.</p></div>
            <div className="market-pill"><span><TrendingUp /> Boi gordo MG</span><strong>R$ 321,40 <small>/ @</small></strong><em>dados ilustrativos</em></div>
          </header>

          <section className="metrics" aria-label="Indicadores principais">
            <Metric icon={<Beef />} label="Animais em estoque" value="147" note="60 em dois lotes ativos" />
            <Metric icon={<WalletCards />} label="Custo acumulado" value="R$ 87.436,29" note="somente custos confirmados" money />
            <Metric icon={<Scale />} label="Receita de vendas" value="R$ 126.184,50" note="nos últimos 12 meses" money />
            <Metric icon={<TrendingUp />} label="Margem" value="+ R$ 38.748,21" note="sobre custos diretos" money positive onHelp={() => setHelpOpen(true)} />
          </section>

          <section className="confirm-banner">
            <div className="confirm-banner__number">4</div>
            <div><span className="eyebrow">A CONFIRMAR</span><h2>Tem gasto previsto esperando você</h2><p>Confira se aconteceu e informe o valor final. Só depois ele entra no custo.</p></div>
            <Button variant="secondary" onClick={() => navigate("/fazenda/baixada/custos?aba=confirmar")}>Revisar lançamentos <ArrowRight /></Button>
          </section>

          <div className="dashboard-grid">
            <section className="panel expenses-panel">
              <div className="panel__heading"><div><span className="eyebrow">PRÓXIMOS 30 DIAS</span><h2>Gastos previstos</h2></div><button className="text-link" onClick={() => navigate("/fazenda/baixada/custos?aba=confirmar")}>Ver todos</button></div>
              <div className="expense-list">
                {expenses.map(({ date, category, target, value, icon: Icon }, index) => (
                  <motion.div className="expense-row" key={category} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * index }}>
                    <time>{date}</time><Icon />
                    <div><strong>{category}</strong><span>{target}</span></div><b>{value}</b>
                  </motion.div>
                ))}
              </div>
              <div className="expense-total"><span>Total previsto</span><strong>R$ 6.221,15</strong></div>
            </section>

            <section className="panel donut-panel">
              <div className="panel__heading"><div><span className="eyebrow">ONDE MAIS GASTOU</span><h2>Custo confirmado por categoria</h2></div><select aria-label="Período" value={params.get("periodo") || "Este ano"} onChange={(event) => { const next = new URLSearchParams(params); next.set("periodo",event.target.value); setParams(next); }}><option>Este ano</option><option>Últimos 30 dias</option></select></div>
              <div className="donut-layout">
                <div className="donut" aria-label="R$ 87.436,29 em custos confirmados"><div><span>Total</span><strong><i>R$</i> 87,4 mil</strong></div></div>
                <ul>
                  <li><i className="dot dot--1" /><span>Suplemento</span><strong>38%</strong></li>
                  <li><i className="dot dot--2" /><span>Locação de pasto</span><strong>27%</strong></li>
                  <li><i className="dot dot--3" /><span>Medicamento</span><strong>18%</strong></li>
                  <li><i className="dot dot--4" /><span>Outros</span><strong>17%</strong></li>
                </ul>
              </div>
            </section>

            <section className="panel chart-panel">
              <div className="panel__heading"><div><span className="eyebrow">ÚLTIMOS 6 MESES</span><h2>Evolução do custo mensal</h2></div><div className="chart-legend"><i /> Confirmado <i /> Previsto</div></div>
              <div className="line-chart">
                <div className="chart-y"><span>20 mil</span><span>10 mil</span><span>0</span></div>
                <svg viewBox="0 0 760 190" role="img" aria-label="O custo mensal confirmado cresceu de maio a outubro">
                  <path className="chart-gridline" d="M0 20H760M0 92H760M0 164H760" />
                  <path className="chart-area" d="M0 138 C70 124 90 132 145 108 S235 112 300 78 S395 90 455 58 S550 85 610 47 S700 55 760 28 V164 H0Z" />
                  <path className="chart-line" d="M0 138 C70 124 90 132 145 108 S235 112 300 78 S395 90 455 58 S550 85 610 47 S700 55 760 28" />
                  <path className="chart-predicted" d="M610 47 C675 42 720 32 760 28" />
                  {[["0","138"],["145","108"],["300","78"],["455","58"],["610","47"],["760","28"]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="5" />)}
                </svg>
                <div className="chart-x"><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Set</span><span>Out</span></div>
              </div>
            </section>
          </div>

          <section className="quick-actions">
            <div><span className="eyebrow">FAÇA AGORA</span><h2>Atalhos do dia a dia</h2></div>
            <div className="quick-actions__buttons">
              <button onClick={() => navigate("/fazenda/baixada/custos/nova-compra")}><Camera /><span><strong>Registrar compra</strong><small>Fotografe a nota em papel</small></span><ArrowRight /></button>
              <button onClick={() => navigate("/fazenda/baixada/rebanho/novo")}><Beef /><span><strong>Novo lote</strong><small>Comece um novo acompanhamento</small></span><ArrowRight /></button>
              <button onClick={() => navigate("/fazenda/baixada/vendas?aba=simulador")}><TrendingUp /><span><strong>Simular venda</strong><small>Veja quanto pode sobrar</small></span><ArrowRight /></button>
            </div>
          </section>
        </motion.div>
      )}

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Como calculamos">
        <div className="calculation-help">
          <p><strong>Margem sobre custos diretos</strong> é o valor da venda menos os custos ligados diretamente aos animais vendidos e as despesas da venda.</p>
          <ol>
            <li><span>1</span><div><strong>Custo médio por animal</strong><p>Custo confirmado do lote ÷ quantidade original de animais.</p></div></li>
            <li><span>2</span><div><strong>Custo da venda</strong><p>Custo médio × quantidade vendida.</p></div></li>
            <li><span>3</span><div><strong>Quanto sobrou</strong><p>Valor recebido − custo da venda − taxas da venda.</p></div></li>
          </ol>
          <div className="help-note"><CheckCircle2 /> Custos previstos só entram na conta depois que você confirma.</div>
          <p className="fine-print">Esta margem não inclui custos gerais da propriedade.</p>
        </div>
      </Modal>
    </AppShell>
  );
}

function Metric({ icon, label, value, note, money, positive, onHelp }: { icon: React.ReactNode; label: string; value: string; note: string; money?: boolean; positive?: boolean; onHelp?: () => void }) {
  const parts = money ? value.replace("+ ", "").split(" ") : [];
  return (
    <article className={`metric ${positive ? "metric--positive" : ""}`}>
      <div className="metric__top"><span>{icon}{label}</span>{onHelp && <button className="icon-button" onClick={onHelp} aria-label="Como calculamos a margem"><CircleHelp /></button>}</div>
      <strong className="metric__value">{positive && <b>+</b>}{money ? <><i>{parts[0]}</i> {parts.slice(1).join(" ")}</> : value}</strong>
      <small>{note}</small>
    </article>
  );
}
