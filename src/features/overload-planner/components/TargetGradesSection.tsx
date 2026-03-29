import { type OverloadOptionTarget } from "../../../lib/overloadOptions";
import { formatGradeLabel, getGradeToneClass, getOptionIndex, gradeChoices, optionChoices } from "../model/model";

type TargetGradesSectionProps = {
  targetGrades: OverloadOptionTarget[];
  onTargetGradeChange: (optionId: string, grade: number) => void;
};

export function TargetGradesSection({ targetGrades, onTargetGradeChange }: TargetGradesSectionProps) {
  return (
    <div className="section-block">
      <div className="section-title-row">
        <h3>옵션별 목표 등급</h3>
      </div>
      <div className="grade-grid">
        {targetGrades.map((target) => (
          <label className="grade-card" key={target.id}>
            <span>{optionChoices.find((option) => option.id === target.id)?.name ?? target.id}</span>
            <select
              value={target.grade}
              onChange={(event) => onTargetGradeChange(target.id, Number(event.target.value))}
            >
              {gradeChoices.map((grade) => (
                <option key={`${target.id}-${grade}`} value={grade}>
                  {formatGradeLabel(getOptionIndex(target.id), grade)}
                </option>
              ))}
            </select>
            <strong className={`grade-preview ${getGradeToneClass(target.grade)}`}>
              {formatGradeLabel(getOptionIndex(target.id), target.grade)}
            </strong>
          </label>
        ))}
      </div>
    </div>
  );
}
