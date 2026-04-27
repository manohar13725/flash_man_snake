import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Gamepad2, Trophy, RefreshCcw } from 'lucide-react';

// --- Constants & Types ---
const BOARD_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_DECREMENT = 2; // Speed increases by this per food
const MIN_SPEED = 50;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const PLAYLIST = [
  { id: 1, title: 'Neon Nights (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Synthwave Sunset (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 3, title: 'Digital Mirage (AI Gen)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' }
];

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [direction, setDirection] = useState<Direction>('UP');
  const [nextDirection, setNextDirection] = useState<Direction>('UP');
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isPlayingGame, setIsPlayingGame] = useState(false); // Game started flag

  // --- Music State ---
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * BOARD_SIZE),
        y: Math.floor(Math.random() * BOARD_SIZE)
      };
      // eslint-disable-next-line no-loop-func
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    const initialSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    setSnake(initialSnake);
    setDirection('UP');
    setNextDirection('UP');
    setFood(generateFood(initialSnake));
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setGameOver(false);
    setIsPaused(false);
    setIsPlayingGame(true);
    
    // Auto start music when playing begins
    if (!isPlayingAudio) {
      setIsPlayingAudio(true);
    }
  };

  const checkCollision = (head: Point, currentSnake: Point[]) => {
    // Wall collision
    if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) return true;
    // Self collision
    if (currentSnake.some(segment => segment.x === head.x && segment.y === head.y)) return true;
    return false;
  };

  useEffect(() => {
    if (!isPlayingGame || gameOver || isPaused) return;

    const moveSnake = () => {
      setSnake(prev => {
        const head = prev[0];
        const newHead = { ...head };

        switch (nextDirection) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        setDirection(nextDirection);

        if (checkCollision(newHead, prev)) {
          setGameOver(true);
          setHighScore(s => Math.max(s, score));
          return prev;
        }

        const newSnake = [newHead, ...prev];

        // Check if food eaten
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore(s => s + 10);
          setSpeed(s => Math.max(MIN_SPEED, s - SPEED_DECREMENT));
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(moveSnake, speed);
    return () => clearInterval(intervalId);
  }, [isPlayingGame, gameOver, isPaused, nextDirection, food, speed, score, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingGame || gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (direction !== 'DOWN') setNextDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (direction !== 'UP') setNextDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (direction !== 'RIGHT') setNextDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (direction !== 'LEFT') setNextDirection('RIGHT');
          break;
        case ' ': // Spacebar to pause
          setIsPaused(p => !p);
          e.preventDefault();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, isPlayingGame, gameOver]);

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (isPlayingAudio) {
        audioRef.current.play().catch(e => {
          console.warn('Audio auto-play prevented by browser:', e);
          setIsPlayingAudio(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIdx, isPlayingAudio, volume]);

  const toggleAudio = () => setIsPlayingAudio(!isPlayingAudio);
  
  const nextTrack = () => {
    setCurrentTrackIdx((prev) => (prev + 1) % PLAYLIST.length);
    setIsPlayingAudio(true);
  };
  
  const prevTrack = () => {
    setCurrentTrackIdx((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
    setIsPlayingAudio(true);
  };

  const handleTrackEnd = () => nextTrack();

  return (
    <div className="h-screen w-screen bg-[#000] text-[#00FFFF] font-['VT323'] text-xl flex flex-col overflow-hidden relative scanlines crt-flicker">
      {/* Header Navigation: Glitch Art Edition */}
      <header className="h-16 border-b-4 border-[#FF00FF] flex items-center justify-between px-8 bg-black shrink-0 relative glitch-anim z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00FFFF] border-2 border-white flex items-center justify-center">
            <div className="w-4 h-4 bg-[#FF00FF]"></div>
          </div>
          <span className="text-3xl font-bold tracking-tighter text-white uppercase">SYS<span className="text-[#00FFFF] ml-1">.CRASH</span></span>
        </div>
        <div className="flex gap-8 text-lg uppercase tracking-[0.2em] font-bold text-[#FF00FF]">
          <span className="cursor-crosshair bg-[#00FFFF] text-black px-2 py-1">EXE_RUN</span>
          <span className="hover:bg-[#FF00FF] hover:text-white transition-colors cursor-crosshair px-2 py-1" onClick={toggleAudio}>SND_CTL</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar: Game Stats */}
        <aside className="w-full md:w-72 border-r-4 border-[#00FFFF] bg-black p-6 flex flex-col gap-8 overflow-y-auto z-10">
          <div>
            <h3 className="text-2xl uppercase tracking-[0.2em] text-[#FF00FF] mb-6 font-bold bg-white text-center py-1">MEM_DUMP</h3>
            <div className="space-y-4 text-xl">
              <div className="flex justify-between items-center border-b-2 border-dashed border-[#00FFFF] pb-1">
                <span>BYTES_SNATCHED</span>
                <span className="font-bold text-white">{score.toString().padStart(4, '0')}</span>
              </div>
              <div className="w-full h-4 bg-black border-2 border-[#FF00FF] p-0.5">
                <div className="bg-[#FF00FF] h-full" style={{ width: `${Math.min(100, (score / 1000) * 100)}%` }}></div>
              </div>
              <div className="flex justify-between items-center border-b-2 border-dashed border-[#FF00FF] mt-4 pb-1">
                <span className="text-[#00FFFF]">PEAK_OVERFLOW</span>
                <span className="text-white">{highScore.toString().padStart(4, '0')}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-auto">
            <div className="p-4 border-2 border-white bg-black magenta-shadow">
              <p className="text-lg leading-tight text-[#00FFFF] uppercase">
                {">"} WARNING: DATA CORRUPTION IMMINENT. FEED CYCLE REQUIRED.
              </p>
            </div>
            
            <div className="mt-8 flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-[#FF00FF] bg-black text-[#00FFFF] flex items-center justify-center text-2xl mb-1 pt-1">W</div>
              <div className="flex gap-1">
                <div className="w-10 h-10 border-2 border-[#FF00FF] bg-black text-[#00FFFF] flex items-center justify-center text-2xl pt-1">A</div>
                <div className="w-10 h-10 border-2 border-[#FF00FF] bg-black text-[#00FFFF] flex items-center justify-center text-2xl pt-1">S</div>
                <div className="w-10 h-10 border-2 border-[#FF00FF] bg-black text-[#00FFFF] flex items-center justify-center text-2xl pt-1">D</div>
              </div>
              <span className="text-lg uppercase tracking-tighter text-white mt-4 bg-red-600 px-2 py-1">DIR_VECTORS</span>
              <span className="text-lg uppercase tracking-tighter text-[#00FFFF] mt-2 border-2 border-[#00FFFF] hover:bg-[#FF00FF] hover:border-[#FF00FF] hover:text-black cursor-crosshair transition-colors px-2 py-1" onClick={() => setIsPaused(p => !p)}>SPC(HALT)</span>
            </div>
          </div>
        </aside>

        {/* Center: Game Board */}
        <section className="flex-1 relative flex flex-col items-center justify-center bg-[#000] p-4 overflow-hidden z-0">
          <div className="relative p-2 border-4 border-[#00FFFF] bg-black cyan-shadow">
          <div 
            className="grid bg-[#111] gap-[1px]" 
            style={{ 
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              width: 'min(90vw, 400px)',
              height: 'min(90vw, 400px)'
            }}
          >
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
              const x = i % BOARD_SIZE;
              const y = Math.floor(i / BOARD_SIZE);
              
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = !isHead && snake.some(segment => segment.x === x && segment.y === y);
              const isFood = food.x === x && food.y === y;

              return (
                <div 
                  key={i} 
                  className={`
                    w-full h-full 
                    ${isHead ? 'bg-white z-10 scale-110 border-2 border-[#FF00FF]' : ''}
                    ${isBody ? 'bg-[#00FFFF]' : ''}
                    ${isFood ? 'bg-[#FF00FF] glitch-anim' : ''}
                  `}
                />
              );
            })}
          </div>

          {/* Overlays */}
          {(!isPlayingGame || gameOver) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 m-1 border-4 border-[#FF00FF]">
              <h2 className={`text-5xl font-bold mb-4 tracking-tighter bg-white px-2 py-1 ${gameOver ? 'text-[#FF00FF]' : 'text-[#00FFFF]'}`}>
                {gameOver ? 'FATAL_EXCEPTION' : 'AWAITING_CMD'}
              </h2>
              {gameOver && <p className="mb-6 text-white text-2xl tracking-widest bg-red-600 px-2 blink">0xDEADBEEF: {score}</p>}
              
              <button 
                onClick={resetGame}
                className={`
                  flex items-center gap-2 px-6 py-2 text-2xl font-bold tracking-widest uppercase transition-all
                  ${gameOver 
                    ? 'border-4 border-[#FF00FF] text-white bg-black hover:bg-[#FF00FF] hover:text-black cursor-crosshair' 
                    : 'border-4 border-[#00FFFF] text-white bg-black hover:bg-[#00FFFF] hover:text-black cursor-crosshair'
                  }
                `}
              >
                {gameOver ? <RefreshCcw size={24}/> : <Play size={24}/>}
                {gameOver ? 'FORCE_REBOOT' : 'EXEC()'}
              </button>
            </div>
          )}
          
          {isPaused && !gameOver && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 m-1">
              <h2 className="text-6xl font-bold tracking-widest text-[#FF00FF] animate-pulse bg-white px-4 py-2">HALT</h2>
            </div>
          )}
          </div>
        </section>

        {/* Right Sidebar: Music Player & Info */}
        <aside className="w-full md:w-72 border-l-4 border-[#FF00FF] bg-[#000] p-8 flex flex-col gap-10 overflow-y-auto z-10">
          <div>
            <h3 className="text-2xl uppercase tracking-[0.2em] text-[#00FFFF] mb-4 font-bold bg-[#FF00FF] text-black text-center py-1">AUDIO_BUFFER</h3>
            <div className="w-full aspect-square bg-[#000] p-2 mb-4 border-4 border-white flex items-center justify-center relative glitch-anim">
              <div className="absolute inset-0 overflow-hidden opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00FFFF_10px,#00FFFF_20px)]"></div>
              <div className="relative z-10 w-24 h-24 border-4 border-[#FF00FF] flex items-center justify-center bg-black">
                <div className={`w-16 h-16 border-4 border-[#00FFFF] ${isPlayingAudio ? 'animate-spin' : ''}`} style={{ animationDuration: '0.5s', animationDirection: 'reverse' }}></div>
              </div>
            </div>
            <p className="text-center text-xl font-bold text-white truncate px-2 bg-red-600 mt-2">{PLAYLIST[currentTrackIdx].title}</p>
            <p className="text-center text-lg text-[#FF00FF] mt-1 tracking-widest">
              VOL_LVL: {Math.round(volume * 100)}%
            </p>
          </div>

          <div className="flex flex-col gap-4">
             {/* Audio Element Hidden */}
            <audio 
              ref={audioRef}
              src={PLAYLIST[currentTrackIdx].url} 
              onEnded={handleTrackEnd}
            />

            <div className="flex items-center justify-center gap-6 text-white bg-black border-2 border-[#00FFFF] p-2">
              <button onClick={prevTrack} className="hover:text-[#FF00FF] transition-colors cursor-crosshair">
                <SkipBack size={28} />
              </button>
              
              <button 
                onClick={toggleAudio} 
                className="w-14 h-14 border-4 border-white bg-[#FF00FF] text-black flex items-center justify-center hover:bg-[#00FFFF] transition-colors cursor-crosshair shrink-0"
              >
                {isPlayingAudio ? <Pause fill="currentColor" size={28}/> : <Play fill="currentColor" size={28} className="ml-1"/>}
              </button>
              
              <button onClick={nextTrack} className="hover:text-[#FF00FF] transition-colors cursor-crosshair">
                <SkipForward size={28} />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[#00FFFF] mt-4 px-2">
              <Volume2 size={24} className="opacity-80" />
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-black border-2 border-[#FF00FF] appearance-none cursor-crosshair outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00FFFF]"
              />
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t-4 border-dashed border-[#00FFFF]">
            <h3 className="text-xl uppercase tracking-[0.1em] text-white bg-[#FF00FF] mb-4 text-center">SECTORS</h3>
            <div className="space-y-2">
              {PLAYLIST.map((track, idx) => (
                <div 
                  key={track.id} 
                  onClick={() => { setCurrentTrackIdx(idx); setIsPlayingAudio(true); }}
                  className={`group p-2 border-2 cursor-crosshair transition-colors ${idx === currentTrackIdx ? 'bg-[#00FFFF] text-black border-white' : 'border-[#FF00FF] text-[#00FFFF] hover:bg-[#FF00FF] hover:text-black'}`}
                >
                  <div className="text-lg font-bold mb-1">
                    IDX.{idx.toString(16).toUpperCase()}
                  </div>
                  <div className="text-xl font-bold truncate max-w-full">{track.title}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}
