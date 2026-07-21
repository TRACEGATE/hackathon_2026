import type { ActionItem } from "../types";

interface ActionChecklistProps {
  items: ActionItem[];
  onToggle: (index: number) => void;
}

export default function ActionChecklist({ items, onToggle }: ActionChecklistProps) {
  if (items.length === 0) {
    return <p className="body-text body-text--muted">액션 아이템이 없습니다.</p>;
  }

  return (
    <ul className="action-checklist">
      {items.map((item, index) => (
        <li
          key={index}
          className={`action-checklist-item ${item.done ? "action-checklist-item--done" : ""}`}
        >
          <label className="action-checklist-label">
            <input
              type="checkbox"
              className="action-checklist-checkbox"
              checked={item.done}
              onChange={() => onToggle(index)}
            />
            <span className="action-checklist-content">
              <span className="action-checklist-task">{item.task}</span>
              <span className="action-checklist-owner">담당 제안: {item.owner}</span>
            </span>
            {item.done && <span className="action-checklist-badge">완료</span>}
          </label>
        </li>
      ))}
    </ul>
  );
}
