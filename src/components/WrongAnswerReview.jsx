import { useState } from 'react';
import Question from './Question.jsx';

export default function WrongAnswerReview({ wrongQuestions, onDone }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  if (!wrongQuestions || wrongQuestions.length === 0) {
    return (
      <div className="setup-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h2>No wrong answers to review!</h2>
        <button className="btn btn--primary btn--full" onClick={onDone}>Back</button>
      </div>
    );
  }

  const currentQ = wrongQuestions[index];

  function handleSubmit() { setShowResult(true); }

  function handleNext() {
    if (index + 1 >= wrongQuestions.length) {
      onDone();
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setShowResult(false);
  }

  return (
    <div className="exam-layout">
      <header className="exam-header">
        <button className="btn btn--ghost" onClick={onDone}>← Exit Review</button>
        <div className="exam-header__title">Wrong Answer Review</div>
        <div className="exam-header__progress">
          {index + 1} / {wrongQuestions.length}
        </div>
      </header>
      <main className="exam-main">
        <Question
          question={currentQ}
          questionNumber={index + 1}
          totalQuestions={wrongQuestions.length}
          selected={selected}
          onSelect={setSelected}
          showResult={showResult}
          onNext={showResult ? handleNext : handleSubmit}
          practiceMode={true}
          nextLabel={
            showResult
              ? (index + 1 < wrongQuestions.length ? 'Next →' : 'Finish Review')
              : 'Submit Answer'
          }
        />
      </main>
    </div>
  );
}
