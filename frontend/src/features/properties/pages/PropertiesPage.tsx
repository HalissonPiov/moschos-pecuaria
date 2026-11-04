import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Building2, ChevronRight, Ellipsis, LogOut, MapPin, Plus, Upload } from "lucide-react";
import { motion } from "motion/react";
import { Brand, Button, Field, Modal, StateView, Toast } from "@/shared/ui/UI";

const properties = [
  { id: "baixada", name: "Fazenda da Baixada", place: "Piedade de Ponte Nova/MG", area: "70 ha", animals: "147 animais", margin: "+ R$ 18.742,63", featured: true },
  { id: "serra", name: "Sítio Serra Bonita", place: "Acaiaca/MG", area: "42 ha", animals: "83 animais", margin: "+ R$ 9.381,20" },
  { id: "cedro", name: "Fazenda Cedro Alto", place: "Ponte Nova/MG", area: "58 ha", animals: "112 animais", margin: "Ainda sem venda" },
];

export default function PropertiesPage() {
  const [params, setParams] = useSearchParams();
  const state = params.get("estado") as "loading" | "error" | "empty" | null;
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const navigate = useNavigate();

  function saveProperty(event: React.FormEvent) {
    event.preventDefault();
    setAddOpen(false);
    setToast("Propriedade adicionada com sucesso.");
  }

  return (
    <div className="properties-page">
      <header className="properties-header">
        <Brand compact />
        <div className="properties-header__user">
          <span>JB</span><div><strong>João Batista</strong><small>Produtor rural</small></div>
          <button className="icon-button" aria-label="Sair"><LogOut /></button>
        </div>
      </header>
      <main className="properties-content">
        <div className="page-title-row">
          <div><span className="eyebrow">SEU CAMPO</span><h1>Minhas propriedades</h1><p>Escolha onde você quer trabalhar hoje.</p></div>
          <Button icon={<Plus />} onClick={() => setAddOpen(true)}>Adicionar propriedade</Button>
        </div>

        {state ? <StateView type={state} onRetry={() => setParams({})} /> : (
          <motion.div className="property-grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            {properties.map((property, index) => (
              <motion.article className="property-card" key={property.id} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
                <button className="property-card__menu" onClick={() => index > 0 && setDeleteOpen(true)} aria-label={`Mais opções para ${property.name}`}><Ellipsis /></button>
                <button className="property-card__main" onClick={() => navigate(property.featured ? "/fazenda/baixada/resumo" : "/fazenda/baixada/resumo")}>
                  <div className={`property-cover ${property.featured ? "property-cover--photo" : ""}`}>
                    {property.featured ? (
                      <img src="/assets/fazenda-baixada-aerea.jpg" width="800" height="360" alt="Vista aérea da Fazenda da Baixada" />
                    ) : <div className="cover-placeholder"><Building2 /></div>}
                    <div className="property-logo">
                      {property.featured ? <img src="/assets/fazenda-baixada-logo.png" width="72" height="72" alt="" /> : <Building2 />}
                    </div>
                  </div>
                  <div className="property-card__body">
                    <div className="property-card__heading"><div><h2>{property.name}</h2><p><MapPin /> {property.place}</p></div><ChevronRight /></div>
                    <dl><div><dt>Área</dt><dd>{property.area}</dd></div><div><dt>Rebanho</dt><dd>{property.animals}</dd></div></dl>
                    <div className="property-margin"><span>Margem do último lote · sobre custos diretos</span><strong>{property.margin}</strong></div>
                  </div>
                </button>
              </motion.article>
            ))}
            <motion.button className="add-property-card" onClick={() => setAddOpen(true)} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}>
              <span><Plus /></span><strong>Adicionar propriedade</strong><small>Cadastre outra fazenda ou sítio</small>
            </motion.button>
          </motion.div>
        )}
      </main>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Adicionar propriedade">
        <form className="form-stack" onSubmit={saveProperty}>
          <Field label="Nome da propriedade" name="property-name" placeholder="Ex.: Fazenda Boa Vista" required />
          <Field label="Município e estado" name="city" placeholder="Ex.: Ponte Nova/MG" required />
          <Field label="Área total" name="area" inputMode="decimal" placeholder="0,0" suffix={<span className="field-suffix">ha</span>} />
          <div className="upload-row">
            <button type="button"><Upload /><span><strong>Logo</strong><small>PNG ou JPG</small></span></button>
            <button type="button"><Upload /><span><strong>Foto de capa</strong><small>PNG ou JPG</small></span></button>
          </div>
          <div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button><Button type="submit">Adicionar</Button></div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir propriedade?">
        <p className="modal-copy">Todos os lotes, custos e vendas desta propriedade serão perdidos. Esta ação não pode ser desfeita.</p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Manter propriedade</Button>
          <Button variant="danger" onClick={() => { setDeleteOpen(false); setToast("Propriedade excluída."); }}>Excluir tudo</Button>
        </div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
