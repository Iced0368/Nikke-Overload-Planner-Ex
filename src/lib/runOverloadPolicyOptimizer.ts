import { runMonteCarloPolicySimulation } from "./overloadMonteCarlo";
import { optimizeOverloadPolicy, type OverloadState } from "./overloadPolicyOptimizer";
import { type OverloadOptionTarget } from "./overloadOptions";

const targetOptionIds = [
  ["elementdmg", "atk", "ammunition"],
  ["elementdmg", "ammunition", "atk"],
  ["atk", "elementdmg", "ammunition"],
  ["atk", "ammunition", "elementdmg"],
  ["ammunition", "elementdmg", "atk"],
  ["ammunition", "atk", "elementdmg"],
] as const;

const targetGradeTargets: OverloadOptionTarget[] = [
  { id: "elementdmg", grade: 9 },
  { id: "atk", grade: 9 },
  { id: "ammunition", grade: 9 },
];

const simulationStartState: OverloadState = [1, 2, 5, 1, 1, 1, 0, 0, 0];

console.time("optimize-policy");

const result = await optimizeOverloadPolicy(
  targetOptionIds.map((ids) => [...ids] as [string, string, string]),
  targetGradeTargets,
  1000,
);

console.log(`Finished after ${result.iterationsRun} iterations`);
console.timeEnd("optimize-policy");

const stateValue =
  result.stateValues[simulationStartState[0]][simulationStartState[1]][simulationStartState[2]][
    simulationStartState[3]
  ][simulationStartState[4]][simulationStartState[5]][simulationStartState[6]][simulationStartState[7]][
    simulationStartState[8]
  ];
console.log("Current policy value");
console.log(stateValue);

const simulation = runMonteCarloPolicySimulation(simulationStartState, result, targetGradeTargets, {
  trialCount: 100000,
});

console.log("Simulation check");
console.log(`Start state: [${simulationStartState.join(", ")}]`);
console.log(`DP weighted cost: ${simulation.estimatedCost.toFixed(4)}`);
console.log(`DP module expected cost: ${simulation.estimatedModuleCost.toFixed(4)}`);
console.log(`DP lock-key expected cost: ${simulation.estimatedLockKeyCost.toFixed(4)}`);
console.log(`Monte Carlo weighted mean: ${simulation.sampleMean.toFixed(4)}`);
console.log(`Monte Carlo module mean: ${simulation.sampleMeanModuleCost.toFixed(4)}`);
console.log(`Monte Carlo lock-key mean: ${simulation.sampleMeanLockKeyCost.toFixed(4)}`);
console.log(`Std. error: ${simulation.standardError.toFixed(4)}`);
console.log(`Absolute error: ${Math.abs(simulation.sampleMean - simulation.estimatedCost).toFixed(4)}`);
