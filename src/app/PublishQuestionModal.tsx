import { useState } from "react";
import { Btn, Input, Modal, Select } from "./shared";

type QuestionType = "mcq" | "true-false";

export type PublishedQuestionPayload = {
  title: string;
  qType: QuestionType;
  questions: number;
  deadline: string;
};

export function PublishQuestionModal({
  mode,
  onClose,
  onPublish,
}: {
  mode: "homework" | "task" | "test";
  onClose: () => void;
  onPublish: (item: PublishedQuestionPayload) => void;
}) {
  const [title, setTitle] = useState("");
  const [qType, setQType] = useState<QuestionType>("mcq");
  const [questionCount, setQuestionCount] = useState("1");
  const [deadlineDate, setDeadlineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deadlineTime, setDeadlineTime] = useState("09:00");
  const [error, setError] = useState("");

  const label = mode === "homework" ? "Homework" : mode === "task" ? "Task" : "Test";

  const handlePublish = () => {
    const parsedCount = Number(questionCount);
    if (!title.trim()) {
      setError("Enter a title first.");
      return;
    }
    if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
      setError("Enter a valid number of questions.");
      return;
    }
    if (!deadlineDate || !deadlineTime) {
      setError("Choose a deadline date and time.");
      return;
    }
    onPublish({
      title: title.trim(),
      qType,
      questions: parsedCount,
      deadline: `${deadlineDate} ${deadlineTime}`,
    });
    onClose();
  };

  return (
    <Modal title={`Publish ${label}`} onClose={onClose}>
      <div className="space-y-4">
        <Input label={`${label} Title`} value={title} onChange={(value) => { setTitle(value); setError(""); }} required />
        <Select
          label="Question Type"
          value={qType}
          onChange={(value) => { setQType(value as QuestionType); setError(""); }}
          options={[
            { value: "mcq", label: "Multiple Choice" },
            { value: "true-false", label: "True / False" },
          ]}
        />
        <Input label="Question Count" value={questionCount} onChange={(value) => { setQuestionCount(value); setError(""); }} required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Deadline Date" type="date" value={deadlineDate} onChange={(value) => { setDeadlineDate(value); setError(""); }} required />
          <Input label="Deadline Time" type="time" value={deadlineTime} onChange={(value) => { setDeadlineTime(value); setError(""); }} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Btn onClick={handlePublish} className="flex-1">{`Publish ${label}`}</Btn>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </Modal>
  );
}
