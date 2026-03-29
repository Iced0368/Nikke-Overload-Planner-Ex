import {
  gradeChoices,
  type StartModuleLockState,
  getGradeToneClass,
  getOptionName,
  getOptionValue,
  optionChoices,
  formatGradeLabel,
  isOptionSelectableForSlot,
  type BinaryState,
  type StartStateDraft,
} from "../model/model";

const MIN_GRADE_SQUARE_SIZE_REM = 0.6;
const MAX_GRADE_SQUARE_SIZE_REM = 1.05;

function getGradeSquareSize(grade: number) {
  const maxGradeIndex = Math.max(gradeChoices.length - 1, 1);
  const clampedGrade = Math.max(0, Math.min(grade, maxGradeIndex));
  const ratio = clampedGrade / maxGradeIndex;
  return `${(MIN_GRADE_SQUARE_SIZE_REM + (MAX_GRADE_SQUARE_SIZE_REM - MIN_GRADE_SQUARE_SIZE_REM) * ratio).toFixed(3)}rem`;
}

type StartStateSectionProps = {
  startState: StartStateDraft;
  binaryStartState: BinaryState;
  startModuleLocks: StartModuleLockState;
  onSlotChange: (slot: 0 | 1 | 2, value: number) => void;
  onGradeChange: (slot: 0 | 1 | 2, value: number) => void;
  onStartModuleLockChange: (slot: 0 | 1 | 2, value: boolean) => void;
};

export function StartStateSection({
  startState,
  binaryStartState,
  startModuleLocks,
  onSlotChange,
  onGradeChange,
  onStartModuleLockChange,
}: StartStateSectionProps) {
  const selectedOptions: [number, number, number] = [startState[0], startState[1], startState[2]];
  const lockedSlotCount = startModuleLocks.filter(Boolean).length;

  return (
    <div className="section-block">
      <div className="section-title-row">
        <h3>현재 상태</h3>
      </div>
      <div className="ingame-stack">
        {[0, 1, 2].map((slot) => (
          <div className="ingame-option-card" key={`start-slot-${slot}`}>
            <div className="ingame-option-header">
              <span className="slot-tag">슬롯 {slot + 1}</span>
              <div className="start-lock-controls">
                <div className="start-lock-tooltip-shell">
                  <button type="button" className="start-lock-info-button" aria-label="모듈 잠금 설명 보기">
                    i
                  </button>
                  <span className="start-lock-tooltip" role="tooltip">
                    현재 이 슬롯이 모듈 잠금 상태인지 설정합니다.
                  </span>
                </div>
                <button
                  type="button"
                  className={startModuleLocks[slot] ? "start-lock-button is-locked" : "start-lock-button"}
                  onClick={() => onStartModuleLockChange(slot as 0 | 1 | 2, !startModuleLocks[slot])}
                  disabled={startState[slot] === 0 || (!startModuleLocks[slot] && lockedSlotCount >= 2)}
                  aria-pressed={startModuleLocks[slot]}
                  aria-label={startModuleLocks[slot] ? "현재 모듈 잠금 해제" : "현재 모듈 잠금 설정"}
                  title={
                    startState[slot] === 0
                      ? "옵션이 있는 슬롯만 모듈 잠금할 수 있습니다"
                      : !startModuleLocks[slot] && lockedSlotCount >= 2
                        ? "모듈 잠금은 최대 2개까지만 설정할 수 있습니다"
                        : startModuleLocks[slot]
                          ? "현재 모듈 잠금 해제"
                          : "현재 모듈 잠금 설정"
                  }
                >
                  <span className="start-lock-switch" aria-hidden="true">
                    <span className="start-lock-switch-thumb">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M7.5 10V7.75a4.5 4.5 0 1 1 9 0V10" />
                        <rect x="5" y="10" width="14" height="10" rx="2.5" />
                      </svg>
                    </span>
                  </span>
                </button>
              </div>
            </div>
            <div className="ingame-field-grid">
              <div className="ingame-field-card">
                <span className="ingame-field-label">옵션</span>
                <div className="ingame-select-shell">
                  <select
                    className="ingame-select"
                    value={startState[slot]}
                    onChange={(event) => onSlotChange(slot as 0 | 1 | 2, Number(event.target.value))}
                  >
                    <option value={0}>빈 슬롯</option>
                    {optionChoices.map((option) => (
                      <option
                        key={option.id}
                        value={option.index}
                        disabled={!isOptionSelectableForSlot(selectedOptions, slot as 0 | 1 | 2, option.index, true)}
                      >
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <div className="ingame-bar ingame-bar-static ingame-bar-selectable">
                    <span className="ingame-name">[{getOptionName(startState[slot])}]</span>
                    <span className="lock-icon-shell">
                      <span
                        className={binaryStartState[slot + 3] ? "lock-icon is-filled" : "lock-icon"}
                        style={{
                          width: startState[slot] === 0 ? undefined : getGradeSquareSize(startState[slot + 3]),
                          height: startState[slot] === 0 ? undefined : getGradeSquareSize(startState[slot + 3]),
                        }}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="ingame-caret">▾</span>
                  </div>
                </div>
              </div>

              <div className="ingame-field-card">
                <span className="ingame-field-label">등급</span>
                <div className="ingame-select-shell">
                  <select
                    className="ingame-select"
                    value={startState[slot + 3]}
                    onChange={(event) => onGradeChange(slot as 0 | 1 | 2, Number(event.target.value))}
                    disabled={slot > 0 && startState[slot] === 0}
                  >
                    {gradeChoices.map((grade) => (
                      <option key={`start-grade-${slot}-${grade}`} value={grade}>
                        {formatGradeLabel(startState[slot], grade)}
                      </option>
                    ))}
                  </select>
                  <div className="ingame-bar ingame-bar-static ingame-bar-selectable">
                    <span className={`ingame-value ${getGradeToneClass(startState[slot + 3])}`}>
                      {startState[slot] === 0
                        ? "-"
                        : `${getOptionValue(startState[slot], startState[slot + 3])?.toFixed(2) ?? "0.00"}%`}
                    </span>
                    <span className="ingame-name">
                      {startState[slot] === 0 ? "미선택" : formatGradeLabel(startState[slot], startState[slot + 3])}
                    </span>
                    <span className="ingame-caret">▾</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
