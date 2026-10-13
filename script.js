const botonesAbrir = document.querySelectorAll("[data-open]");
const seccionServicios = document.getElementById("servicios");
const seccionFormulario = document.getElementById("formulario");
const formulario = document.getElementById("solicitud-form");
const volver = document.getElementById("volver");
const nuevo = document.getElementById("nuevo");

const tipoServicio = document.getElementById("tipo-servicio");
const titulo = document.getElementById("form-title");
const descripcion = document.getElementById("form-description");
const puestoWrap = document.getElementById("puesto-wrap");
const montoWrap = document.getElementById("monto-wrap");
const puesto = document.getElementById("puesto");
const monto = document.getElementById("monto");
const edadWrap = document.getElementById("edad-wrap");
const edad = document.getElementById("edad");
const successMessage = document.getElementById("success-message");
const successCopy = document.getElementById("success-copy");
const eyebrow = document.getElementById("form-eyebrow");

function abrirFormulario(tipo) {
  formulario.reset();
  formulario.hidden = false;
  successMessage.hidden = true;
  tipoServicio.value = tipo;

  const esEmpleo = tipo === "empleo";
  titulo.textContent = esEmpleo ? "Solicitud de empleo" : "Solicitud de informaci贸n de cr茅dito";
  eyebrow.textContent = esEmpleo ? "POSTULACI脫N LABORAL" : "INFORMACI脫N DE CR脡DITO";
  descripcion.textContent = esEmpleo
    ? "Completa tus datos de contacto y cu茅ntanos qu茅 tipo de trabajo buscas."
    : "Completa tus datos de contacto y selecciona el rango de cr茅dito que te interesa. Esto no representa una aprobaci贸n.";
  puestoWrap.hidden = !esEmpleo;
  montoWrap.hidden = esEmpleo;
  edadWrap.hidden = !esEmpleo;
  puesto.required = esEmpleo;
  monto.required = !esEmpleo;
  edad.required = esEmpleo;

  seccionFormulario.hidden = false;
  seccionFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
}

botonesAbrir.forEach((boton) => {
  boton.addEventListener("click", () => abrirFormulario(boton.dataset.open));
});

volver.addEventListener("click", () => {
  seccionFormulario.hidden = true;
  seccionServicios.scrollIntoView({ behavior: "smooth", block: "start" });
});

nuevo.addEventListener("click", () => {
  seccionFormulario.hidden = true;
  seccionServicios.scrollIntoView({ behavior: "smooth", block: "start" });
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  if (!formulario.reportValidity()) return;

  const tipo = tipoServicio.value;
  const datos = new FormData(formulario);
  const nombre = String(datos.get("nombre") || "").trim();

  successCopy.textContent = tipo === "empleo"
    ? `Gracias, ${nombre}. Los campos de tu postulaci贸n se validaron correctamente.`
    : `Gracias, ${nombre}. Tu solicitud de informaci贸n de cr茅dito se valid贸 correctamente.`;

  formulario.hidden = true;
  successMessage.hidden = false;
  successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
});
