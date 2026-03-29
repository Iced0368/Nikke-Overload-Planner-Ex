import { type MonteCarloSimulationSummary } from "../../../lib/overloadMonteCarlo.ts";
import {
  type OverloadCostWeights,
  type OverloadOptionIds,
  type OverloadOptionTarget,
} from "../../../lib/overloadOptions";
import {
  type OverloadOptimizationProgress,
  type OverloadPolicyOptimizationResult,
  type OverloadState,
} from "../../../lib/overloadPolicyOptimizer.ts";

export type OptimizeWorkerRequest = {
  kind: "optimize";
  requestId: number;
  targetOptionIds: OverloadOptionIds[];
  targetGrades: OverloadOptionTarget[];
  iterations: number;
  costWeights: OverloadCostWeights;
};

export type SimulateWorkerRequest = {
  kind: "simulate";
  requestId: number;
  startState: OverloadState;
  result: OverloadPolicyOptimizationResult;
  targetGrades: OverloadOptionTarget[];
  costWeights: OverloadCostWeights;
};

export type PlannerWorkerRequest = OptimizeWorkerRequest | SimulateWorkerRequest;

export type OptimizeProgressWorkerResponse = {
  kind: "optimize-progress";
  requestId: number;
  progress: OverloadOptimizationProgress;
};

export type OptimizeSuccessWorkerResponse = {
  kind: "optimize-success";
  requestId: number;
  result: OverloadPolicyOptimizationResult;
};

export type OptimizeErrorWorkerResponse = {
  kind: "optimize-error";
  requestId: number;
  message: string;
};

export type SimulateSuccessWorkerResponse = {
  kind: "simulate-success";
  requestId: number;
  result: MonteCarloSimulationSummary;
};

export type SimulateErrorWorkerResponse = {
  kind: "simulate-error";
  requestId: number;
  message: string;
};

export type PlannerWorkerResponse =
  | OptimizeProgressWorkerResponse
  | OptimizeSuccessWorkerResponse
  | OptimizeErrorWorkerResponse
  | SimulateSuccessWorkerResponse
  | SimulateErrorWorkerResponse;
