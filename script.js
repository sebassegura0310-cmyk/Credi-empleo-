const pasos = Array.from(document.querySelectorAll(".pantalla"));
const datosPostulante = { nombre: "", telefono: "", ciudad: "", direccion: "", contacto: "", fecha: "", hora: "" };

function irAPaso(numero) {
  pasos.forEach((paso) => paso.classList.remove("activa"));
  const destino = document.getElementById(numero === 0 ? "inicio" : `paso-${numero}`);
  if (destino) {
    destino.classList.add("activa");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

document.getElementById("form-demo").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const form = evento.currentTarget;
  if (!form.reportValidity()) return;
  datosPostulante.nombre = document.getElementById("nombre").value.trim();
  datosPostulante.telefono = document.getElementById("telefono").value.trim();
  datosPostulante.ciudad = document.getElementById("ciudad").value.trim();
  datosPostulante.direccion = document.getElementById("direccion").value.trim();
  irAPaso(2);
});

function guardarContacto(respuesta) {
  datosPostulante.contacto = respuesta;
  irAPaso(3);
}

document.getElementById("form-entrevista").addEventListener("submit", (evento) => {
  evento.preventDefault();
  datosPostulante.fecha = document.getElementById("fecha").value;
  datosPostulante.hora = document.getElementById("hora").value;
  const resumen = document.getElementById("resumen");
  resumen.textContent = `Nombre: ${datosPostulante.nombre}. Teléfono: ${datosPostulante.telefono}. Ciudad: ${datosPostulante.ciudad}. Acepta llamada: ${datosPostulante.contacto || "No indicado"}. Fecha preferida: ${datosPostulante.fecha || "No indicada"}. Hora preferida: ${datosPostulante.hora || "No indicada"}.`;
  irAPaso(4);
});

function finalizarPostulacion() {
  document.getElementById("mensaje-final").hidden = false;
}
