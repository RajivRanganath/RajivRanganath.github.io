// Self-check for tracker.js. Run: node tracker.check.js
const assert = require('assert');
const { createSim, hungarian } = require('./tracker.js');

// Hungarian: known optimum is row0->1, row1->0, row2->2 (cost 1 + 2 + 2 = 5).
assert.deepStrictEqual(hungarian([[4, 1, 3], [2, 0, 5], [3, 2, 2]]), [1, 0, 2]);
// Rectangular: 2 rows, 3 cols.
assert.deepStrictEqual(hungarian([[9, 1, 9], [1, 9, 9]]), [1, 0]);

function run(clutter, seed) {
  const sim = createSim({ seed, clutter, targets: 6 });
  let loss = { gnn: 0, jpda: 0 };
  for (let i = 0; i < 1500; i++) { sim.step(); loss.gnn += sim.methods.gnn.losses.at(-1); loss.jpda += sim.methods.jpda.losses.at(-1); }
  return { gnn: sim.readout('gnn').accuracy, jpda: sim.readout('jpda').accuracy, loss };
}

for (const clutter of [0, 15, 35, 60]) {
  const rs = [1, 2, 3].map(s => run(clutter, s));
  const avg = k => rs.reduce((s, r) => s + r[k], 0) / rs.length;
  const lg = rs.reduce((s, r) => s + r.loss.gnn, 0), lj = rs.reduce((s, r) => s + r.loss.jpda, 0);
  console.log(`clutter ${String(clutter).padStart(2)}: acc GNN ${(avg('gnn') * 100).toFixed(1)}%  JPDA ${(avg('jpda') * 100).toFixed(1)}%  | track losses GNN ${lg}  JPDA ${lj}`);
  if (clutter === 0) assert(avg('gnn') > 0.9 && avg('jpda') > 0.9, 'both should track cleanly with no clutter');
  if (clutter === 60) assert(lj * 2 < lg, 'JPDA should drop far fewer tracks than GNN in heavy clutter');
}
console.log('ok');
