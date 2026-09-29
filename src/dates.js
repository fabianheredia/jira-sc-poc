/**
 * Utilidades de fecha y días hábiles.
 *
 * R-09 (Q-03): el eje temporal son días hábiles de lunes a viernes.
 * Los feriados NO se gestionan en el MVP.
 *
 * Todo el cálculo se hace en UTC a medianoche para que el resultado no dependa
 * de la zona horaria de la máquina que ejecuta el dashboard.
 */

const MS_POR_DIA = 86_400_000;

/**
 * Normaliza un valor de fecha a un Date en UTC a medianoche.
 *
 * Acepta:
 *   - un Date (por si js-yaml resolvió un timestamp),
 *   - una cadena que empiece por YYYY-MM-DD, incluido el formato completo de
 *     Jira ("2026-08-07T14:03:00.000-0500").
 *
 * De la cadena se toma la porción de fecha tal como Jira la reporta, que es lo
 * que un humano ve en la interfaz de Jira. No se reinterpreta el offset: hacerlo
 * movería la fecha un día en los cierres de última hora y desalinearía el
 * cumplimiento respecto de lo que el equipo ve en Jira.
 */
export function parseFecha(valor) {
  if (valor == null) return null;

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
  }

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
  if (!m) return null;

  const [, y, mes, d] = m;
  const fecha = new Date(Date.UTC(Number(y), Number(mes) - 1, Number(d)));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Formatea un Date como YYYY-MM-DD. */
export function formatFecha(fecha) {
  return fecha.toISOString().slice(0, 10);
}

/** true si la fecha cae de lunes a viernes. */
export function esDiaHabil(fecha) {
  const dia = fecha.getUTCDay();
  return dia >= 1 && dia <= 5;
}

/**
 * Días hábiles del rango [inicio, fin], ambos inclusive.
 * Devuelve un array de Date en orden ascendente.
 */
export function diasHabiles(inicio, fin) {
  const dias = [];
  if (!inicio || !fin || fin < inicio) return dias;

  for (let t = inicio.getTime(); t <= fin.getTime(); t += MS_POR_DIA) {
    const dia = new Date(t);
    if (esDiaHabil(dia)) dias.push(dia);
  }
  return dias;
}

/**
 * Cuántos días hábiles han transcurrido desde `inicio` hasta `fecha`, contando
 * ambos extremos. Es la unidad del cycle time (R-16 / Q-38, Q-42).
 *
 * Ejemplo: inicio 2026-08-03 (lun), fecha 2026-08-12 (mié de la semana
 * siguiente) -> 8 días hábiles.
 *
 * Devuelve null si la fecha es anterior al inicio.
 */
export function diasHabilesTranscurridos(inicio, fecha) {
  if (!inicio || !fecha || fecha < inicio) return null;
  return diasHabiles(inicio, fecha).length;
}
