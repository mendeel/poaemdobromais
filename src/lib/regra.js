// Generic validity / logistics lines we strip from the product summary.
const STOP_LINE =
  /^-?\s*(?:LEIA COM ATENÇÃO|V[aá]lido de\s|V[aá]lido para consumo|V[aá]lido somente para|N[aã]o [ée] v[aá]lido para op[cç][aã]o de delivery|n[aã]o [ée] v[aá]lido para delivery|n[aã]o [ée] necess[aá]rio a presen[cç]a|Verificar canais|Realizar pedido conforme|O pagamento dever[aá])/i;

/** Product-specific excerpt from a cupom "regra" field. */
export function regraResumo(regra) {
  if (!regra) return '';

  const kept = [];
  for (const line of regra.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (STOP_LINE.test(trimmed)) break;
    kept.push(trimmed.replace(/^-\s*/, ''));
  }

  return kept.join(' ').replace(/\s+/g, ' ').trim();
}
