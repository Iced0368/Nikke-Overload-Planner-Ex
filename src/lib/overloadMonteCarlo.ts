import {
  defaultCostWeights,
  lockCosts,
  lockKeyCosts,
  overloadGradeProbabilities,
  overloadOptions,
  rerollCosts,
  slotOptionProbabilities,
  type OverloadCostWeights,
  type OverloadOptionTarget,
} from "./overloadOptions";
import { type OverloadPolicyOptimizationResult, type OverloadState } from "./overloadPolicyOptimizer";

const DEFAULT_TRIAL_COUNT = 5000;
const DEFAULT_MAX_STEPS = 10000;
const DEFAULT_COST_BUCKET_SIZE = 5;

type SimulationEpisodeResult = {
  totalCost: number;
  totalModuleCost: number;
  totalLockKeyCost: number;
  terminalState: OverloadState;
};

export type MonteCarloCostBucket = {
  upperBound: number;
  cumulativeCount: number;
  cumulativeShare: number;
};

export type MonteCarloTerminalStateStat = {
  state: OverloadState;
  count: number;
  share: number;
};

export type MonteCarloSimulationSummary = {
  trialCount: number;
  estimatedCost: number;
  estimatedModuleCost: number;
  estimatedLockKeyCost: number;
  estimatedConvertedLockKeyCost: number;
  sampleMean: number;
  sampleMeanModuleCost: number;
  sampleMeanLockKeyCost: number;
  sampleMeanConvertedLockKeyCost: number;
  standardError: number;
  cumulativeCostDistribution: MonteCarloCostBucket[];
  cumulativeModuleCostDistribution: MonteCarloCostBucket[];
  cumulativeLockKeyCostDistribution: MonteCarloCostBucket[];
  cumulativeConvertedLockKeyCostDistribution: MonteCarloCostBucket[];
  terminalStateDistribution: MonteCarloTerminalStateStat[];
  terminalStateCount: number;
};

type MonteCarloSimulationOptions = {
  trialCount?: number;
  maxSteps?: number;
  costBucketSize?: number;
  costWeights?: OverloadCostWeights;
};

function countBits(mask: number) {
  return Number(Boolean(mask & 1)) + Number(Boolean(mask & 2)) + Number(Boolean(mask & 4));
}

function buildMask([b1, b2, b3]: [number, number, number]) {
  return b1 | (b2 << 1) | (b3 << 2);
}

function actionModuleMask(
  action: Exclude<
    OverloadPolicyOptimizationResult["stateValues"][number][number][number][number][number][number][number][number][number]["action"],
    { type: "done" }
  >,
) {
  return buildMask([Number(action.moduleLock[0]), Number(action.moduleLock[1]), Number(action.moduleLock[2])]);
}

function actionKeyMask(
  action: Exclude<
    OverloadPolicyOptimizationResult["stateValues"][number][number][number][number][number][number][number][number][number]["action"],
    { type: "done" }
  >,
) {
  return buildMask([Number(action.keyLock[0]), Number(action.keyLock[1]), Number(action.keyLock[2])]);
}

function getStateValue(
  stateValues: OverloadPolicyOptimizationResult["stateValues"],
  [o1, o2, o3, g1, g2, g3, m1, m2, m3]: OverloadState,
) {
  return stateValues[o1][o2][o3][g1][g2][g3][m1][m2][m3];
}

function buildSimulationData(targetGrades: OverloadOptionTarget[]) {
  const optionIndexById = new Map<string, number>();
  const gradeTailProbabilityByThreshold = Array<number>(overloadGradeProbabilities.length + 1).fill(0);
  const optionProbabilityByIndex = overloadOptions.map((option) => option?.probability ?? 0);

  for (let index = 1; index < overloadOptions.length; index++) {
    const option = overloadOptions[index];
    if (option) {
      optionIndexById.set(option.id, index);
    }
  }

  for (let grade = overloadGradeProbabilities.length - 1; grade >= 0; grade--) {
    gradeTailProbabilityByThreshold[grade] =
      gradeTailProbabilityByThreshold[grade + 1]! + overloadGradeProbabilities[grade]!;
  }

  const requiredGradeByOption = Array(overloadOptions.length).fill(0);
  for (const target of targetGrades) {
    const optionIndex = optionIndexById.get(target.id);
    if (optionIndex !== undefined) {
      requiredGradeByOption[optionIndex] = target.grade;
    }
  }

  const successProbabilityByOption = requiredGradeByOption.map(
    (requiredGrade) => gradeTailProbabilityByThreshold[requiredGrade]!,
  );

  return {
    optionProbabilityByIndex,
    successProbabilityByOption,
  };
}

function buildWeightedActionCost(
  currentModuleMask: number,
  nextModuleMask: number,
  keyMask: number,
  protectedCount: number,
  costWeights: OverloadCostWeights,
) {
  const keptModuleCount = countBits(currentModuleMask & nextModuleMask);
  const nextModuleCount = countBits(nextModuleMask);
  const moduleCost = rerollCosts[protectedCount]! + lockCosts[nextModuleCount]! - lockCosts[keptModuleCount]!;
  const lockKeyCost = lockKeyCosts[countBits(keyMask)]!;
  return costWeights.module * moduleCost + costWeights.lockKey * lockKeyCost;
}

function sampleBinary(successProbability: number) {
  return Math.random() < successProbability ? 1 : 0;
}

function createStateKey([o1, o2, o3, g1, g2, g3, m1, m2, m3]: OverloadState) {
  return `${o1},${o2},${o3},${g1},${g2},${g3},${m1},${m2},${m3}`;
}

function sampleFromWeightedStates(weightedStates: Array<{ state: OverloadState; weight: number }>) {
  let totalWeight = 0;
  for (const { weight } of weightedStates) {
    totalWeight += weight;
  }

  let draw = Math.random() * totalWeight;
  for (const { state, weight } of weightedStates) {
    draw -= weight;
    if (draw <= 0) {
      return [...state] as OverloadState;
    }
  }

  return [...weightedStates[weightedStates.length - 1]!.state] as OverloadState;
}

function createOptionSampler(
  states: OverloadState[],
  successProbabilityByOption: number[],
  optionProbabilityByIndex: number[],
) {
  const cache = new Map<string, Array<{ state: OverloadState; weight: number }>>();

  return (state: OverloadState, protectedMask: number, nextModuleMask: number) => {
    const cacheKey = `${createStateKey(state)}|${protectedMask}|${nextModuleMask}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return sampleFromWeightedStates(cached);
    }

    const weightedStates = states.flatMap((candidate) => {
      let weight = 1;

      for (let slot = 0; slot < 3; slot++) {
        const currentOption = state[slot]!;
        const currentGrade = state[slot + 3]!;
        const nextOption = candidate[slot]!;
        const nextGrade = candidate[slot + 3]!;

        if ((protectedMask >> slot) & 1 && (currentOption !== nextOption || currentGrade !== nextGrade)) {
          return [];
        }

        if (candidate[slot + 6] !== ((nextModuleMask >> slot) & 1 ? 1 : 0)) {
          return [];
        }

        if (nextOption === 0) {
          weight *= 1 - slotOptionProbabilities[slot]!;
          continue;
        }

        const successProbability = successProbabilityByOption[nextOption]!;
        const gradeProbability = nextGrade ? successProbability : 1 - successProbability;
        weight *= slotOptionProbabilities[slot]! * optionProbabilityByIndex[nextOption]! * gradeProbability;
      }

      return weight > 0 ? [{ state: candidate, weight }] : [];
    });

    cache.set(cacheKey, weightedStates);
    return sampleFromWeightedStates(weightedStates);
  };
}

function simulateEpisode(
  startState: OverloadState,
  stateValues: OverloadPolicyOptimizationResult["stateValues"],
  successProbabilityByOption: number[],
  sampleOptionOutcome: (state: OverloadState, protectedMask: number, nextModuleMask: number) => OverloadState,
  maxSteps: number,
  costWeights: OverloadCostWeights,
): SimulationEpisodeResult {
  let currentState = [...startState] as OverloadState;
  let totalCost = 0;
  let totalModuleCost = 0;
  let totalLockKeyCost = 0;

  for (let step = 0; step < maxSteps; step++) {
    const currentValue = getStateValue(stateValues, currentState);
    if (currentValue.action.type === "done") {
      return {
        totalCost,
        totalModuleCost,
        totalLockKeyCost,
        terminalState: [...currentState] as OverloadState,
      };
    }

    const nextModuleMask = actionModuleMask(currentValue.action);
    const keyMask = actionKeyMask(currentValue.action);
    const protectedMask = nextModuleMask | keyMask;
    const protectedCount = countBits(protectedMask);
    const currentModuleMask = buildMask([currentState[6], currentState[7], currentState[8]]);
    const keptModuleCount = countBits(currentModuleMask & nextModuleMask);
    const nextModuleCount = countBits(nextModuleMask);
    totalCost += buildWeightedActionCost(currentModuleMask, nextModuleMask, keyMask, protectedCount, costWeights);
    totalModuleCost += rerollCosts[protectedCount]! + lockCosts[nextModuleCount]! - lockCosts[keptModuleCount]!;
    totalLockKeyCost += lockKeyCosts[countBits(keyMask)]!;

    let sampledState: OverloadState;
    if (currentValue.action.type === "grade") {
      const [o1, o2, o3, g1, g2, g3] = currentState;
      sampledState = [
        o1,
        o2,
        o3,
        protectedMask & 1 ? g1 : sampleBinary(successProbabilityByOption[o1] ?? 0),
        o2 === 0 ? 0 : protectedMask & 2 ? g2 : sampleBinary(successProbabilityByOption[o2] ?? 0),
        o3 === 0 ? 0 : protectedMask & 4 ? g3 : sampleBinary(successProbabilityByOption[o3] ?? 0),
        nextModuleMask & 1 ? 1 : 0,
        nextModuleMask & 2 ? 1 : 0,
        nextModuleMask & 4 ? 1 : 0,
      ];
    } else {
      sampledState = sampleOptionOutcome(currentState, protectedMask, nextModuleMask);
    }

    if (getStateValue(stateValues, sampledState).cost < currentValue.cost - 1e-9) {
      currentState = sampledState;
    }
  }

  throw new Error("Simulation exceeded max steps before reaching a done state");
}

function buildCumulativeCostDistribution(costSamples: number[], costBucketSize: number) {
  const bucketCounts = new Map<number, number>();

  for (const cost of costSamples) {
    const bucketStart = Math.floor(cost / costBucketSize) * costBucketSize;
    bucketCounts.set(bucketStart, (bucketCounts.get(bucketStart) ?? 0) + 1);
  }

  const sortedBuckets = Array.from(bucketCounts.entries()).sort(([left], [right]) => left - right);
  const distribution: MonteCarloCostBucket[] = [];

  let cumulativeCount = 0;
  for (const [bucketStart, count] of sortedBuckets) {
    cumulativeCount += count;
    distribution.push({
      upperBound: bucketStart + costBucketSize,
      cumulativeCount,
      cumulativeShare: cumulativeCount / costSamples.length,
    });
  }

  return distribution;
}

function buildTerminalStateDistribution(terminalStates: OverloadState[]) {
  const terminalCounts = new Map<string, { state: OverloadState; count: number }>();

  for (const state of terminalStates) {
    const key = createStateKey(state);
    const entry = terminalCounts.get(key);
    if (entry) {
      entry.count += 1;
      continue;
    }

    terminalCounts.set(key, { state: [...state] as OverloadState, count: 1 });
  }

  const sortedTerminalStates = Array.from(terminalCounts.values())
    .sort((left, right) => right.count - left.count)
    .map(({ state, count }) => ({
      state,
      count,
      share: count / terminalStates.length,
    }));

  return {
    terminalStateDistribution: sortedTerminalStates,
    terminalStateCount: terminalCounts.size,
  };
}

export function runMonteCarloPolicySimulation(
  startState: OverloadState,
  result: OverloadPolicyOptimizationResult,
  targetGrades: OverloadOptionTarget[],
  options: MonteCarloSimulationOptions = {},
): MonteCarloSimulationSummary {
  const trialCount = options.trialCount ?? DEFAULT_TRIAL_COUNT;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const costBucketSize = options.costBucketSize ?? DEFAULT_COST_BUCKET_SIZE;
  const costWeights = options.costWeights ?? defaultCostWeights;

  const { successProbabilityByOption, optionProbabilityByIndex } = buildSimulationData(targetGrades);
  const sampleOptionOutcome = createOptionSampler(result.states, successProbabilityByOption, optionProbabilityByIndex);
  const episodes = Array.from({ length: trialCount }, () =>
    simulateEpisode(
      startState,
      result.stateValues,
      successProbabilityByOption,
      sampleOptionOutcome,
      maxSteps,
      costWeights,
    ),
  );

  const costSamples = episodes.map((episode) => episode.totalCost);
  const moduleCostSamples = episodes.map((episode) => episode.totalModuleCost);
  const lockKeyCostSamples = episodes.map((episode) => episode.totalLockKeyCost);
  const convertedLockKeyCostSamples = lockKeyCostSamples.map((value) => value * costWeights.lockKey);
  const terminalStates = episodes.map((episode) => episode.terminalState);
  const sampleMean = costSamples.reduce((sum, value) => sum + value, 0) / costSamples.length;
  const sampleMeanModuleCost = moduleCostSamples.reduce((sum, value) => sum + value, 0) / moduleCostSamples.length;
  const sampleMeanLockKeyCost = lockKeyCostSamples.reduce((sum, value) => sum + value, 0) / lockKeyCostSamples.length;
  const sampleMeanConvertedLockKeyCost =
    convertedLockKeyCostSamples.reduce((sum, value) => sum + value, 0) / convertedLockKeyCostSamples.length;
  const sampleVariance =
    costSamples.reduce((sum, value) => sum + (value - sampleMean) ** 2, 0) / Math.max(1, costSamples.length - 1);
  const standardError = Math.sqrt(sampleVariance / costSamples.length);
  const { terminalStateDistribution, terminalStateCount } = buildTerminalStateDistribution(terminalStates);
  const startStateValue = getStateValue(result.stateValues, startState);

  return {
    trialCount,
    estimatedCost: startStateValue.cost,
    estimatedModuleCost: startStateValue.expectedCosts.module,
    estimatedLockKeyCost: startStateValue.expectedCosts.lockKey,
    estimatedConvertedLockKeyCost: startStateValue.expectedCosts.lockKey * costWeights.lockKey,
    sampleMean,
    sampleMeanModuleCost,
    sampleMeanLockKeyCost,
    sampleMeanConvertedLockKeyCost,
    standardError,
    cumulativeCostDistribution: buildCumulativeCostDistribution(costSamples, costBucketSize),
    cumulativeModuleCostDistribution: buildCumulativeCostDistribution(moduleCostSamples, costBucketSize),
    cumulativeLockKeyCostDistribution: buildCumulativeCostDistribution(lockKeyCostSamples, costBucketSize),
    cumulativeConvertedLockKeyCostDistribution: buildCumulativeCostDistribution(
      convertedLockKeyCostSamples,
      costBucketSize,
    ),
    terminalStateDistribution,
    terminalStateCount,
  };
}
