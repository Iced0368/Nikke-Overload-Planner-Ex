import { OVERLOAD_GRADE_COUNT, overloadOptions, type OverloadOptionTarget } from "../../../lib/overloadOptions";
import {
  type OverloadAction,
  type OverloadPolicyOptimizationResult,
  type OverloadState,
  type OverloadStateValue,
} from "../../../lib/overloadPolicyOptimizer.ts";

export type TargetStateDraft = [number, number, number];
export type StartStateDraft = [number, number, number, number, number, number];
export type BinaryState = [number, number, number, number, number, number];
export type StartModuleLockState = [boolean, boolean, boolean];

export const optionChoices = overloadOptions
  .map((option, index) => (option ? { index, id: option.id, name: option.name } : null))
  .filter((option): option is { index: number; id: string; name: string } => option !== null);

const optionIndexById = new Map(optionChoices.map((option) => [option.id, option.index]));

export const gradeChoices = Array.from({ length: OVERLOAD_GRADE_COUNT }, (_, index) => index);

export const defaultStartState: StartStateDraft = [0, 0, 0, 0, 0, 0];
export const defaultStartModuleLocks: StartModuleLockState = [false, false, false];

export const defaultTargetStates: TargetStateDraft[] = [[0, 0, 0]];

export function isValidStartModuleLockState(
  [o1, o2, o3]: [number, number, number],
  startModuleLocks: StartModuleLockState,
) {
  const lockCount = startModuleLocks.filter(Boolean).length;
  if (lockCount > 2) {
    return false;
  }

  return [o1, o2, o3].every((optionIndex, slot) => optionIndex !== 0 || !startModuleLocks[slot]!);
}

export function readStateValue(
  result: OverloadPolicyOptimizationResult,
  [o1, o2, o3, g1, g2, g3]: BinaryState,
  startModuleLocks: StartModuleLockState,
): OverloadStateValue | null {
  if (!isValidStartModuleLockState([o1, o2, o3], startModuleLocks)) {
    return null;
  }

  return result.stateValues[o1][o2][o3][g1][g2][g3][Number(startModuleLocks[0])][Number(startModuleLocks[1])][
    Number(startModuleLocks[2])
  ];
}

function collectLockedSlots(lockState: [boolean, boolean, boolean]) {
  return lockState
    .map((locked, index) => (locked ? `${index + 1}번` : null))
    .filter((slot): slot is string => slot !== null);
}

export function getOptionName(optionIndex: number) {
  return overloadOptions[optionIndex]?.name ?? "빈 슬롯";
}

export function getTargetOptionName(optionIndex: number) {
  return optionIndex === 0 ? "상관 없음" : getOptionName(optionIndex);
}

export function getOptionIndex(optionId: string) {
  return optionIndexById.get(optionId) ?? 0;
}

export function getOptionValue(optionIndex: number, grade: number) {
  if (optionIndex === 0) {
    return null;
  }

  return overloadOptions[optionIndex]?.values[grade] ?? null;
}

export function getGradeToneClass(grade: number) {
  if (grade >= 14) {
    return "grade-black";
  }

  if (grade >= 10) {
    return "grade-blue";
  }

  return "grade-default";
}

export function formatGradeLabel(optionIndex: number, grade: number) {
  const value = getOptionValue(optionIndex, grade);
  if (value === null) {
    return `${grade + 1}단계`;
  }

  return `${grade + 1}단계 · ${value.toFixed(2)}%`;
}

export function formatStartState([o1, o2, o3, g1, g2, g3]: StartStateDraft) {
  return [
    `${getOptionName(o1)} ${o1 === 0 ? "" : formatGradeLabel(o1, g1)}`,
    `${getOptionName(o2)} ${o2 === 0 ? "" : formatGradeLabel(o2, g2)}`,
    `${getOptionName(o3)} ${o3 === 0 ? "" : formatGradeLabel(o3, g3)}`,
  ].join(" / ");
}

export function formatBinaryState([o1, o2, o3, g1, g2, g3]: BinaryState) {
  return `${getOptionName(o1)} / ${getOptionName(o2)} / ${getOptionName(o3)} · ${g1}-${g2}-${g3}`;
}

export function formatAction(action: OverloadAction) {
  if (action.type === "done") {
    return "이미 목표 상태입니다";
  }

  const moduleLockedSlots = collectLockedSlots(action.moduleLock);
  const keyLockedSlots = collectLockedSlots(action.keyLock);

  if (moduleLockedSlots.length === 0 && keyLockedSlots.length === 0) {
    return action.type === "option" ? "효과 변경, 잠금 없음" : "수치 재설정, 잠금 없음";
  }

  const parts: string[] = [];
  if (moduleLockedSlots.length > 0) {
    parts.push(`모듈 ${moduleLockedSlots.join(", ")}`);
  }
  if (keyLockedSlots.length > 0) {
    parts.push(`락키 ${keyLockedSlots.join(", ")}`);
  }

  return `${action.type === "option" ? "효과 변경" : "수치 재설정"}, ${parts.join(" / ")} 잠금`;
}

export function normalizeStartState([o1, o2, o3, g1, g2, g3]: StartStateDraft): StartStateDraft {
  return [o1, o2, o3, g1, o2 === 0 ? 0 : g2, o3 === 0 ? 0 : g3];
}

export function isValidOptionTriple([o1, o2, o3]: [number, number, number]) {
  const picked = [o1, o2, o3].filter((value) => value !== 0);
  return new Set(picked).size === picked.length;
}

export function isValidTargetOptionTriple([o1, o2, o3]: [number, number, number]) {
  const picked = [o1, o2, o3].filter((value) => value !== 0);
  return new Set(picked).size === picked.length;
}

export function isOptionSelectableForSlot(
  optionTriple: [number, number, number],
  slot: 0 | 1 | 2,
  candidateOptionIndex: number,
  allowZeroInFirstSlot = false,
) {
  if (candidateOptionIndex === 0) {
    return allowZeroInFirstSlot || slot !== 0;
  }

  return optionTriple.every((selectedOptionIndex, selectedSlot) => {
    if (selectedSlot === slot) {
      return true;
    }

    return selectedOptionIndex !== candidateOptionIndex;
  });
}

export function syncTargetGrades(targetOptionIdsInUse: string[], current: OverloadOptionTarget[]) {
  const previousGradeById = new Map(current.map((target) => [target.id, target.grade]));
  return targetOptionIdsInUse.map((id) => ({
    id,
    grade: previousGradeById.get(id) ?? 0,
  }));
}

export function buildBinaryStartState(startState: StartStateDraft, targetGradeById: Map<string, number>): BinaryState {
  const [o1, o2, o3, g1, g2, g3] = startState;

  return [
    o1,
    o2,
    o3,
    o1 === 0 ? 0 : Number(g1 >= (targetGradeById.get(overloadOptions[o1]?.id ?? "") ?? 0)),
    o2 === 0 ? 0 : Number(g2 >= (targetGradeById.get(overloadOptions[o2]?.id ?? "") ?? 0)),
    o3 === 0 ? 0 : Number(g3 >= (targetGradeById.get(overloadOptions[o3]?.id ?? "") ?? 0)),
  ];
}

export function buildSimulationStartState(
  [o1, o2, o3, g1, g2, g3]: BinaryState,
  startModuleLocks: StartModuleLockState,
) {
  return [
    o1,
    o2,
    o3,
    g1,
    g2,
    g3,
    Number(startModuleLocks[0]),
    Number(startModuleLocks[1]),
    Number(startModuleLocks[2]),
  ] as OverloadState;
}

export function createTargetStateKey([o1, o2, o3]: TargetStateDraft) {
  return `${o1}:${o2}:${o3}`;
}

export function getTargetStatePermutations([o1, o2, o3]: TargetStateDraft) {
  const permutations: TargetStateDraft[] = [
    [o1, o2, o3],
    [o1, o3, o2],
    [o2, o1, o3],
    [o2, o3, o1],
    [o3, o1, o2],
    [o3, o2, o1],
  ];

  const uniquePermutations = new Map<string, TargetStateDraft>();
  for (const permutation of permutations) {
    uniquePermutations.set(createTargetStateKey(permutation), permutation);
  }

  return Array.from(uniquePermutations.values());
}
