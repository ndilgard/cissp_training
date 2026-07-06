import { useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ExamMode from './components/ExamMode.jsx';
import PracticeMode from './components/PracticeMode.jsx';
import Dashboard from './components/Dashboard.jsx';
import QuestionImport from './components/QuestionImport.jsx';
import WrongAnswerReview from './components/WrongAnswerReview.jsx';
import FlashcardMode from './components/FlashcardMode.jsx';
import questions from './data/questions.js';
import { getCustomQuestions } from './utils/customQuestions.js';
import { getWrongIds } from './utils/history.js';
import { shuffleOptions } from './utils/cat.js';

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
    startWrongReview(all.filter(q => wrongIds.has(q.id)));
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
        />
      )}
      {screen === 'exam' && (
        <ExamMode onHome={() => setScreen('home')} />
      )}
      {screen === 'practice' && (
        <PracticeMode
          onHome={() => setScreen('home')}
          onWrongReview={startWrongReview}
        />
      )}
      {screen === 'dashboard' && (
        <Dashboard onHome={() => setScreen('home')} />
      )}
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
    </div>
  );
}

export default App;
