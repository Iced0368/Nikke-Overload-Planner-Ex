import "./App.css";
import "./features/overload-planner/styles/overloadPlanner.css";
import {
  CostWeightsSection,
  PlannerHeader,
  PlannerResultPanel,
  StartStateSection,
  TargetGradesSection,
  TargetStatesSection,
  useOverloadPlanner,
} from "./features/overload-planner/index.ts";

function App() {
  const {
    startState,
    startModuleLocks,
    lockKeysPerModule,
    targetStates,
    targetGrades,
    result,
    error,
    isRunning,
    optimizationProgress,
    needsOptimization,
    hasStaleResult,
    binaryStartState,
    currentStateValue,
    detailedSimulationResult,
    simulationError,
    isSimulationRunning,
    updateStartStateSlot,
    updateStartStateGrade,
    updateStartModuleLock,
    updateLockKeysPerModule,
    updateTargetStateSlot,
    updateTargetGrade,
    addTargetState,
    clearTargetStates,
    addTargetStatePermutations,
    removeTargetState,
    runOptimizer,
    runDetailedSimulation,
  } = useOverloadPlanner();

  const isOptimizeButtonDisabled = isRunning || !needsOptimization;
  const optimizeButtonLabel = isRunning ? "계산 중..." : needsOptimization ? "최적화 실행" : "최적화 완료됨";
  const optimizeButtonStateClass = isRunning ? "is-running" : needsOptimization ? "is-ready" : "is-complete";

  return (
    <main className="app-shell">
      <PlannerHeader />

      <section className="workspace-grid">
        <div className="panel form-panel">
          <div className="panel-header">
            <h2>입력 설정</h2>
            <button
              className={`primary-button ${optimizeButtonStateClass}`}
              onClick={runOptimizer}
              disabled={isOptimizeButtonDisabled}
            >
              <span className="button-content">
                <span className="button-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" focusable="false">
                    {isRunning ? (
                      <path d="M10 3.25a6.75 6.75 0 1 1-4.773 1.977" />
                    ) : needsOptimization ? (
                      <>
                        <path d="M4.25 3.75v12.5" />
                        <path d="M7.25 5.25 15.75 10l-8.5 4.75Z" />
                      </>
                    ) : (
                      <path d="M4.5 10.25 8 13.75l7.5-7.5" />
                    )}
                  </svg>
                </span>
                <span>{optimizeButtonLabel}</span>
              </span>
            </button>
          </div>

          <StartStateSection
            startState={startState}
            binaryStartState={binaryStartState}
            startModuleLocks={startModuleLocks}
            onSlotChange={updateStartStateSlot}
            onGradeChange={updateStartStateGrade}
            onStartModuleLockChange={updateStartModuleLock}
          />

          <CostWeightsSection
            lockKeysPerModule={lockKeysPerModule}
            onLockKeysPerModuleChange={updateLockKeysPerModule}
          />

          <TargetStatesSection
            targetStates={targetStates}
            onAdd={addTargetState}
            onClear={clearTargetStates}
            onAddPermutations={addTargetStatePermutations}
            onRemove={removeTargetState}
            onSlotChange={updateTargetStateSlot}
          />

          {error ? <div className="error-banner">{error}</div> : null}
        </div>

        <div className="side-column">
          <PlannerResultPanel
            result={result}
            isStale={hasStaleResult}
            isOptimizing={isRunning}
            optimizationProgress={optimizationProgress}
            currentStateValue={currentStateValue}
            detailedSimulationResult={detailedSimulationResult}
            simulationError={simulationError}
            isSimulationRunning={isSimulationRunning}
            onRunDetailedSimulation={runDetailedSimulation}
            targetGrades={targetGrades}
          />
          <div className="panel side-grade-panel">
            <TargetGradesSection targetGrades={targetGrades} onTargetGradeChange={updateTargetGrade} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
