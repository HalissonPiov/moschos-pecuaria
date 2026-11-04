import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Beef, Copy, FileImage, FileText, Plus, Trash2, Upload, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import AppShell from "@/shared/layout/AppShell";
import { Button, Field, Modal, Toast } from "@/shared/ui/UI";

type Attribute = { id: number; name: string; value: string };
type Attachment = { id: number; name: string; size: string; type: "image" | "pdf" };

export default function AnimalFormPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const editing = location.pathname.endsWith("/editar");
  const [step, setStep] = useState(editing ? 2 : 1);
  const [type, setType] = useState<"individual" | "batch">(editing ? "batch" : "batch");
  const [attributes, setAttributes] = useState<Attribute[]>(editing ? [{ id: 1, name: "Cor", value: "Branca" }, { id: 2, name: "Marca", value: "FB 24" }] : []);
  const [files, setFiles] = useState<Attachment[]>(editing ? [{ id: 1, name: "registro_lote_safra_24.pdf", size: "1,8 MB", type: "pdf" }] : []);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const data = new FormData(event.currentTarget);
    if (!data.get("identificacao")) return;
    setToast(editing ? "Alterações salvas com sucesso." : `${type === "batch" ? "Lote" : "Animal"} cadastrado com sucesso.`);
    window.setTimeout(() => navigate("/fazenda/baixada/rebanho/lote-safra-24"), 900);
  }

  function addAttribute() {
    setAttributes([...attributes, { id: Date.now(), name: "", value: "" }]);
  }

  return (
    <AppShell>
      <div className="record-form-page">
        <header className="record-form-heading">
          <button className="back-link" onClick={() => navigate(-1)}>← Voltar para o rebanho</button>
          <span className="eyebrow">{editing ? "EDITAR REGISTRO" : "NOVO REGISTRO"}</span>
          <h1>{editing ? "Lote Safra 24" : "Cadastrar no rebanho"}</h1>
          <p>{step === 1 ? "Primeiro, diga como você acompanha este gado." : "Preencha o que souber. Você pode completar depois."}</p>
        </header>

        <div className="stepper" aria-label={`Etapa ${step} de 3`}>
          {[1, 2, 3].map((number) => <span key={number} className={step >= number ? "active" : ""}><i>{number}</i><b>{number === 1 ? "Tipo" : number === 2 ? "Informações" : "Documentos"}</b></span>)}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.section className="type-step" key="type" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }}>
              <div className="type-choices">
                <button className={type === "individual" ? "active" : ""} onClick={() => setType("individual")}><Beef /><span><strong>Um animal</strong><small>Acompanhar um animal separado</small></span><i /></button>
                <button className={type === "batch" ? "active" : ""} onClick={() => setType("batch")}><Users /><span><strong>Um lote de animais</strong><small>Acompanhar vários animais juntos</small></span><i /></button>
              </div>
              {type === "batch" && <Field label="Quantidade total original" name="quantity" type="number" inputMode="numeric" min="1" defaultValue="38" suffix={<span className="field-suffix">animais</span>} />}
              <div className="form-footer"><span /><Button onClick={() => setStep(2)}>Continuar</Button></div>
            </motion.section>
          ) : (
            <motion.form className="record-form" key="form" onSubmit={save} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }}>
              {step === 2 && (
                <>
                  <section className="form-section">
                    <div className="form-section__heading"><span>01</span><div><h2>Identificação</h2><p>As informações principais para encontrar este registro.</p></div></div>
                    <div className="form-grid">
                      <Field label={type === "batch" ? "Nome do lote" : "Identificação do animal"} name="identificacao" defaultValue={editing ? "Lote Safra 24" : ""} placeholder={type === "batch" ? "Ex.: Lote Safra 25" : "Ex.: Boi 048"} error={submitted ? "Informe um nome para continuar." : undefined} />
                      <label className="select-field"><span>Propriedade</span><select defaultValue="Fazenda da Baixada"><option>Fazenda da Baixada</option><option>Sítio Serra Bonita</option></select></label>
                      <label className="select-field"><span>Raça</span><select defaultValue="Nelore"><option>Nelore</option><option>Angus x Nelore</option><option>Nelore cruzado</option><option>Outra</option></select></label>
                      <Field label="Idade aproximada" name="idade" defaultValue={editing ? "22" : ""} inputMode="numeric" suffix={<span className="field-suffix">meses</span>} />
                      <Field label="Local" name="local" defaultValue={editing ? "Piquete da Serra" : ""} placeholder="Ex.: Pasto do Córrego" />
                      <Field label="Data de entrada" name="data" type="date" defaultValue="2024-01-18" />
                    </div>
                  </section>
                  <section className="form-section">
                    <div className="form-section__heading"><span>02</span><div><h2>Outras características</h2><p>Crie informações do seu jeito, como cor ou marca.</p></div></div>
                    <div className="attribute-list">
                      {attributes.map((attribute) => (
                        <div className="attribute-row" key={attribute.id}>
                          <label><span>Nome</span><input list="attribute-suggestions" value={attribute.name} placeholder="Ex.: Cor" onChange={(event) => setAttributes(attributes.map((item) => item.id === attribute.id ? { ...item, name: event.target.value } : item))} /></label>
                          <label><span>Valor</span><input value={attribute.value} placeholder="Ex.: Branca" onChange={(event) => setAttributes(attributes.map((item) => item.id === attribute.id ? { ...item, value: event.target.value } : item))} /></label>
                          <button type="button" className="icon-button" onClick={() => setAttributes(attributes.filter((item) => item.id !== attribute.id))} aria-label="Remover atributo"><X /></button>
                        </div>
                      ))}
                      <datalist id="attribute-suggestions"><option value="Cor" /><option value="Marca" /><option value="Origem" /><option value="Peso de entrada" /></datalist>
                      <Button type="button" variant="secondary" icon={<Plus />} onClick={addAttribute}>Adicionar característica</Button>
                    </div>
                  </section>
                  <div className="form-footer"><Button type="button" variant="ghost" onClick={() => setStep(1)}>Voltar</Button><Button type="button" onClick={() => setStep(3)}>Continuar</Button></div>
                </>
              )}
              {step === 3 && (
                <>
                  <section className="form-section">
                    <div className="form-section__heading"><span>03</span><div><h2>Documentos e anotações</h2><p>Guarde registros e observações junto do lote.</p></div></div>
                    <button type="button" className="document-upload" onClick={() => setFiles([...files, { id: Date.now(), name: "registro_fotografado.jpg", size: "824 KB", type: "image" }])}><Upload /><span><strong>Anexar documento</strong><small>Foto, PDF ou planilha · até 10 MB</small></span></button>
                    <div className="attachment-list">
                      {files.map((file) => <div key={file.id}>{file.type === "pdf" ? <FileText /> : <FileImage />}<span><strong>{file.name}</strong><small>{file.size}</small></span><button type="button" className="icon-button" onClick={() => setFiles(files.filter((item) => item.id !== file.id))} aria-label={`Remover ${file.name}`}><Trash2 /></button></div>)}
                    </div>
                    <label className="textarea-field"><span>Anotações</span><textarea defaultValue={editing ? "Lote formado com animais da própria fazenda. Revisar peso em dezembro." : ""} placeholder="Escreva aqui qualquer informação importante..." rows={5} /></label>
                  </section>
                  <div className="form-footer"><Button type="button" variant="ghost" onClick={() => setStep(2)}>Voltar</Button><Button type="submit">{editing ? "Salvar alterações" : "Cadastrar"}</Button></div>
                </>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {editing && (
          <section className="danger-zone">
            <div><h2>Outras ações</h2><p>Duplique este lote ou exclua todos os dados ligados a ele.</p></div>
            <Button variant="secondary" icon={<Copy />} onClick={() => setToast("Cópia criada. Revise os dados antes de salvar.")}>Duplicar lote</Button>
            <Button variant="danger" icon={<Trash2 />} onClick={() => setDeleteOpen(true)}>Excluir lote</Button>
          </section>
        )}
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir Lote Safra 24?">
        <p className="modal-copy">Você perderá os dados do lote, documentos anexados e todo o histórico. Custos e vendas já registrados também serão apagados. Esta ação não pode ser desfeita.</p>
        <div className="modal__actions"><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Manter lote</Button><Button variant="danger" onClick={() => navigate("/fazenda/baixada/rebanho")}>Excluir tudo</Button></div>
      </Modal>
      <Toast message={toast} onClose={() => setToast(null)} />
    </AppShell>
  );
}
