import { getTargetOptionName, isOptionSelectableForSlot, optionChoices, type TargetStateDraft } from "../model/model";

type TargetStatesSectionProps = {
  targetStates: TargetStateDraft[];
  onAdd: () => void;
  onClear: () => void;
  onAddPermutations: (targetIndex: number) => void;
  onRemove: (targetIndex: number) => void;
  onSlotChange: (targetIndex: number, slot: 0 | 1 | 2, value: number) => void;
};

export function TargetStatesSection({
  targetStates,
  onAdd,
  onClear,
  onAddPermutations,
  onRemove,
  onSlotChange,
}: TargetStatesSectionProps) {
  return (
    <div className="section-block">
      <div className="section-title-row">
        <h3>목표 상태들</h3>
        <div className="target-actions">
          <button
            className="ghost-button"
            onClick={onClear}
            disabled={targetStates.length === 1 && targetStates[0]?.every((value) => value === 0)}
          >
            <span className="button-content">
              <span className="button-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                  <path d="M4 6.25h12" />
                  <path d="M7.25 6.25V5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1.25" />
                  <path d="M6.75 8.5v5.75" />
                  <path d="M10 8.5v5.75" />
                  <path d="M13.25 8.5v5.75" />
                  <path d="M5.5 6.25l.75 9a1 1 0 0 0 .996.917h5.498a1 1 0 0 0 .996-.917l.75-9" />
                </svg>
              </span>
              <span>전체 비우기</span>
            </span>
          </button>
          <button className="secondary-button" onClick={onAdd}>
            <span className="button-content">
              <span className="button-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                  <path d="M10 4.25v11.5" />
                  <path d="M4.25 10h11.5" />
                </svg>
              </span>
              <span>목표 상태 추가</span>
            </span>
          </button>
        </div>
      </div>
      <div className="target-list">
        {targetStates.map((targetState, index) => (
          <div className="target-card" key={`target-${index}`}>
            <div className="target-header">
              <strong>목표 {index + 1}</strong>
              <div className="target-actions">
                <button className="ghost-button" onClick={() => onAddPermutations(index)}>
                  <span className="button-content">
                    <span className="button-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" focusable="false">
                        <path d="M7 6.25h6.75A2.25 2.25 0 0 1 16 8.5v.75" />
                        <path d="M13.5 3.75 16 6.25l-2.5 2.5" />
                        <path d="M13 13.75H6.25A2.25 2.25 0 0 1 4 11.5v-.75" />
                        <path d="M6.5 16.25 4 13.75l2.5-2.5" />
                      </svg>
                    </span>
                    <span>동일 옵션 추가</span>
                  </span>
                </button>
                <button className="ghost-button" onClick={() => onRemove(index)} disabled={targetStates.length === 1}>
                  <span className="button-content">
                    <span className="button-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" focusable="false">
                        <path d="M5.75 5.75 14.25 14.25" />
                        <path d="M14.25 5.75 5.75 14.25" />
                      </svg>
                    </span>
                    <span>제거</span>
                  </span>
                </button>
              </div>
            </div>
            <div className="target-state-grid">
              {[0, 1, 2].map((slot) => (
                <select
                  key={`target-${index}-slot-${slot}`}
                  value={targetState[slot]}
                  onChange={(event) => onSlotChange(index, slot as 0 | 1 | 2, Number(event.target.value))}
                >
                  <option value={0}>{getTargetOptionName(0)}</option>
                  {optionChoices.map((option) => (
                    <option
                      key={option.id}
                      value={option.index}
                      disabled={!isOptionSelectableForSlot(targetState, slot as 0 | 1 | 2, option.index, true)}
                    >
                      {option.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        ))}

        <button className="target-add-card" onClick={onAdd} type="button" aria-label="목표 상태 추가">
          <span className="target-add-plus" aria-hidden="true">
            <svg viewBox="0 0 20 20" focusable="false">
              <path d="M10 4.25v11.5" />
              <path d="M4.25 10h11.5" />
            </svg>
          </span>
          <span className="target-add-label">목표 상태 추가</span>
        </button>
      </div>
    </div>
  );
}
