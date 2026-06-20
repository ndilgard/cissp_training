import { useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ExamMode from './components/ExamMode.jsx';
import PracticeMode from './components/PracticeMode.jsx';
import Dashboard from './components/Dashboard.jsx';
import QuestionImport from './components/QuestionImport.jsx';
import WrongAnswerReview from './components/WrongAnswerReview.jsx';

function App() {
  const [screen, setScreen] = useState('home');
  const [wrongQuestions, setWrongQuestions] = useState([]);

  function startWrongReview(questions) {
    setWrongQuestions(questions);
    setScreen('wrong-review');
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          onExam={() => setScreen('exam')}
          onPractice={() => setScreen('practice')}
          onDashboard={() => setScreen('dashboard')}
          onImport={() => setScreen('import')}
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
    </div>
  );
}

export default App;
