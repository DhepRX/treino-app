// Funções usadas por mais de um roteiro.

// Vale um treino por dia. Para um roteiro fazer outro treino no mesmo dia,
// o treino salvo hoje vai para ontem (na hora dada) e o app é recarregado.
async function paraOntem(p, hora = 6){
  await p.evaluate(h => {
    const s = JSON.parse(localStorage.getItem('treino-renan-v1'));
    const hoje = new Date().toDateString();
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); ontem.setHours(h, 0, 0, 0);
    s.hist.forEach(x => { if (new Date(x.start).toDateString() === hoje) { const dur = x.end - x.start; x.start = ontem.getTime(); x.end = x.start + dur; } });
    s.hist.sort((a, b) => a.start - b.start);
    localStorage.setItem('treino-renan-v1', JSON.stringify(s));
  }, hora);
  await p.reload();
}

// Registra um treino à mão num dia sem treino (AAAA-MM-DD), pelo calendário.
async function registrarNoDia(p, dia, wid){
  await p.click('[data-view="cal"]');
  for (let k = 0; k < 36 && !(await p.locator(`[data-cd="${dia}"]`).count()); k++) await p.click('[data-cm="-1"]');
  await p.click(`[data-cd="${dia}"]`);
  await p.click('[data-reg-open]');
  await p.click(`[data-reg="${wid}"]`);
}

module.exports = { paraOntem, registrarNoDia };
