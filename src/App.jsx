import { useState } from 'react';
import BackupRestore from './components/BackupRestore.jsx';
import Dashboard from './components/Dashboard.jsx';
import ExamMode from './components/ExamMode.jsx';
import FlashcardMode from './components/FlashcardMode.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import PracticeMode from './components/PracticeMode.jsx';
import QuestionImport from './components/QuestionImport.jsx';
import WrongAnswerReview from './components/WrongAnswerReview.jsx';
import questions from './data/questions.js';
import { shuffleOptions } from './utils/cat.js';
import { getCustomQuestions } from './utils/customQuestions.js';
import { getWrongIds } from './utils/history.js';

function App() {
  const [screen, setScreen] = useState('home');
  const [wrongQuestions, setWrongQuestions] = useState([]);

  function startWrongReview(qs) {
    setWrongQuestions(qs.map(shuffleOptions));
    setScreen('wrong-review');
  }

  function handleHomeWrongReview() {
    const all = [...questions, ...getCustomQuestions()];
    const wrongIds = getWrongIds();
    startWrongReview(all.filter((q) => wrongIds.has(q.id)));
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          onExam={() => setScreen('exam')}
          onPractice={() => setScreen('practice')}
          onDashboard={() => setScreen('dashboard')}
          onImport={() => setScreen('import')}
          onWrongReview={handleHomeWrongReview}
          onFlashcards={() => setScreen('flashcards')}
          onBackup={() => setScreen('backup')}
        />
      )}
      {screen === 'exam' && <ExamMode onHome={() => setScreen('home')} />}
      {screen === 'practice' && (
        <PracticeMode
          onHome={() => setScreen('home')}
          onWrongReview={startWrongReview}
        />
      )}
      {screen === 'dashboard' && <Dashboard onHome={() => setScreen('home')} />}
      {screen === 'import' && (
        <QuestionImport onHome={() => setScreen('home')} />
      )}
      {screen === 'wrong-review' && (
        <WrongAnswerReview
          wrongQuestions={wrongQuestions}
          onDone={() => setScreen('home')}
        />
      )}
      {screen === 'flashcards' && (
        <FlashcardMode onHome={() => setScreen('home')} />
      )}
      {screen === 'backup' && (
        <BackupRestore onHome={() => setScreen('home')} />
      )}
    </div>
  );
}

export default App;
