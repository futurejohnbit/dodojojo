import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Star, Award, TrendingUp, 
  AlertCircle, ChevronRight, Trophy, Trash2,
  Shield, Medal, History, UserPlus, X, Save,
  BookOpen, Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy,
  arrayUnion
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Rank System Definition (Based on Chinese Military Ranks simplified) ---
// Tiers: 士兵 (Soldiers), 士官 (NCOs), 尉官 (Lieutenants), 校官 (Field Officers), 將官 (Generals)
const RANKS = [
  { title: "列兵", score: 0, color: "bg-gray-500", icon: "v1", category: "士兵" },
  { title: "上等兵", score: 50, color: "bg-gray-600", icon: "v2", category: "士兵" },
  { title: "下士", score: 150, color: "bg-green-600", icon: "bar1", category: "士官" },
  { title: "中士", score: 300, color: "bg-green-700", icon: "bar2", category: "士官" },
  { title: "上士", score: 500, color: "bg-green-800", icon: "bar3", category: "士官" },
  { title: "四級軍士長", score: 800, color: "bg-emerald-700", icon: "bar4", category: "士官" },
  { title: "少尉", score: 1200, color: "bg-blue-500", icon: "star1", category: "尉官" },
  { title: "中尉", score: 1700, color: "bg-blue-600", icon: "star2", category: "尉官" },
  { title: "上尉", score: 2300, color: "bg-blue-700", icon: "star3", category: "尉官" },
  { title: "少校", score: 3000, color: "bg-indigo-600", icon: "lines_star1", category: "校官" },
  { title: "中校", score: 4000, color: "bg-indigo-700", icon: "lines_star2", category: "校官" },
  { title: "上校", score: 5500, color: "bg-indigo-800", icon: "lines_star3", category: "校官" },
  { title: "大校", score: 7500, color: "bg-indigo-900", icon: "lines_star4", category: "校官" },
  { title: "少將", score: 10000, color: "bg-yellow-600", icon: "wheat_star1", category: "將官" },
  { title: "中將", score: 15000, color: "bg-yellow-700", icon: "wheat_star2", category: "將官" },
  { title: "上將", score: 25000, color: "bg-yellow-800", icon: "wheat_star3", category: "將官" },
];

const BEHAVIORS = {
  positive: [
    { label: "積極發言", points: 5, icon: "🗣️" },
    { label: "完成作業", points: 10, icon: "📝" },
    { label: "幫助同學", points: 15, icon: "🤝" },
    { label: "小組合作", points: 10, icon: "👥" },
    { label: "特殊貢獻", points: 20, icon: "🌟" },
    { label: "考試滿分", points: 50, icon: "💯" },
  ],
  negative: [
    { label: "上課講話", points: -5, icon: "🤫" },
    { label: "作業缺交", points: -10, icon: "❌" },
    { label: "遲到", points: -5, icon: "⏰" },
    { label: "干擾課堂", points: -15, icon: "🚫" },
  ]
};

// --- Component: Rank Badge Visualizer ---
const RankBadge = ({ rankData, className = "w-12 h-12" }) => {
  const { icon, color } = rankData;
  
  const InnerDesign = () => {
    if (icon === 'v1') return <div className="text-white font-bold text-xs"><ChevronRight className="rotate-[-90deg]" /></div>;
    if (icon === 'v2') return <div className="flex flex-col -space-y-2 text-white"><ChevronRight className="rotate-[-90deg]" /><ChevronRight className="rotate-[-90deg]" /></div>;
    
    if (icon.startsWith('bar')) {
      const count = parseInt(icon.replace('bar', ''));
      return (
        <div className="flex flex-col space-y-1 justify-center items-center h-full">
           {[...Array(count)].map((_, i) => (
             <div key={i} className="w-6 h-1 bg-yellow-400 shadow-sm" />
           ))}
        </div>
      );
    }
    
    if (icon.startsWith('star')) {
      const count = parseInt(icon.replace('star', ''));
      return (
        <div className="flex space-x-0.5 justify-center items-center h-full">
           {[...Array(count)].map((_, i) => (
             <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
           ))}
        </div>
      );
    }

    if (icon.startsWith('lines_star')) {
       const count = parseInt(icon.replace('lines_star', ''));
       return (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="w-full h-1/2 flex items-center justify-center space-x-0.5 border-b border-yellow-400/30">
             {[...Array(count)].map((_, i) => (
               <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
             ))}
          </div>
          <div className="w-full h-1/2 bg-indigo-900/30 flex items-center justify-center">
             <div className="w-0.5 h-full bg-yellow-400"></div>
             <div className="w-0.5 h-full bg-yellow-400 ml-1"></div>
          </div>
        </div>
       )
    }

    if (icon.startsWith('wheat')) {
        const count = parseInt(icon.replace('wheat_star', ''));
        return (
          <div className="relative flex items-center justify-center w-full h-full">
             <div className="absolute opacity-30 w-8 h-8 rounded-full border-2 border-yellow-400"></div>
             <div className="flex space-x-0.5 z-10">
                {[...Array(count)].map((_, i) => (
                <Star key={i} size={10} className="fill-yellow-400 text-yellow-400" />
                ))}
             </div>
          </div>
        )
    }

    return null;
  };

  return (
    <div className={`${className} ${color} rounded-md shadow-lg flex items-center justify-center border-2 border-yellow-400/50 relative overflow-hidden`}>
      <InnerDesign />
    </div>
  );
};

// --- Helper Functions ---
const getRankInfo = (score) => {
  let currentRank = RANKS[0];
  let nextRank = RANKS[1] || null;

  for (let i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].score) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || null;
    } else {
      break;
    }
  }
  return { currentRank, nextRank };
};

const calculateProgress = (score, currentRank, nextRank) => {
  if (!nextRank) return 100;
  const range = nextRank.score - currentRank.score;
  const gained = score - currentRank.score;
  return Math.min(100, Math.max(0, (gained / range) * 100));
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// --- Main Application Component ---
export default function HonorLegionApp() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRankGuideOpen, setIsRankGuideOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [customPoints, setCustomPoints] = useState(0);
  const [customReason, setCustomReason] = useState("");

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Students Listener
    const studentsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'students');
    const q = query(studentsRef); 
    
    const unsubStudents = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.score - a.score); 
      setStudents(data);
      // Update selectedStudent if it's currently open to reflect changes immediately
      if (selectedStudent) {
        const updatedSelected = data.find(s => s.id === selectedStudent.id);
        if (updatedSelected) setSelectedStudent(updatedSelected);
      }
      setLoading(false);
    }, (err) => console.error("Data error:", err));
    
    return () => unsubStudents();
  }, [user, selectedStudent?.id]); // Depend on ID to keep modal fresh


  // --- Actions ---

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'students'), {
        name: newStudentName,
        score: 0,
        createdAt: serverTimestamp(),
        lastAction: "入伍報到",
        history: [{
           reason: "入伍報到",
           points: 0,
           timestamp: new Date().toISOString()
        }]
      });
      setNewStudentName("");
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding student:", error);
    }
  };

  const updatePoints = async (amount, reason) => {
    if (!selectedStudent || !user) return;
    
    const newScore = Math.max(0, selectedStudent.score + amount);
    
    try {
      const studentRef = doc(db, 'artifacts', appId, 'users', user.uid, 'students', selectedStudent.id);
      await updateDoc(studentRef, {
        score: newScore,
        lastAction: reason,
        lastUpdated: serverTimestamp(),
        // Add entry to history array
        history: arrayUnion({
            reason: reason,
            points: amount,
            timestamp: new Date().toISOString()
        })
      });
      // Modal closes or stays open? Let's keep it open so they see the effect
      // setSelectedStudent(null); 
    } catch (error) {
      console.error("Error updating points:", error);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if(!confirm("確定要將此士兵除名嗎？此操作無法復原。")) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'students', studentId));
        setSelectedStudent(null);
    } catch (error) {
        console.error("Delete failed", error);
    }
  };

  // --- Render Helpers ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center animate-pulse">
          <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold tracking-widest">系統連線中...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col md:flex-row">
      
      {/* Sidebar / Leaderboard */}
      <aside className="w-full md:w-80 bg-slate-800 text-slate-100 flex flex-col shadow-2xl z-10">
        <div className="p-6 bg-slate-900 border-b border-slate-700">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-yellow-500 p-2 rounded-lg text-slate-900">
                <Trophy size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-wider">榮譽軍團</h1>
          </div>
          <p className="text-xs text-slate-400">Class Dojo 軍事化管理系統</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
            <TrendingUp size={14} className="mr-2" /> 戰力排行榜
          </h3>
          <div className="space-y-3">
            {students.slice(0, 10).map((student, index) => {
              const { currentRank } = getRankInfo(student.score);
              return (
                <div key={student.id} className="flex items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${index < 3 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-600 text-slate-300'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{student.name}</div>
                    <div className="text-xs text-slate-400">{currentRank.title}</div>
                  </div>
                  <div className="text-yellow-400 font-mono font-bold">
                    {student.score}
                  </div>
                </div>
              );
            })}
            {students.length === 0 && (
              <p className="text-center text-slate-500 py-4 text-sm">目前沒有士兵數據</p>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="p-4 border-t border-slate-700 bg-slate-900 space-y-3">
          <button 
            onClick={() => setIsRankGuideOpen(true)}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center justify-center transition-all text-sm"
          >
            <BookOpen size={16} className="mr-2" />
            軍銜手冊
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-indigo-900/50"
          >
            <UserPlus size={18} className="mr-2" />
            徵召新兵
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100">
        
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={20}/></div>
                <div><div className="text-2xl font-bold">{students.length}</div><div className="text-xs text-slate-500">總人數</div></div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
                 <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Star size={20}/></div>
                 <div>
                    <div className="text-2xl font-bold">
                        {students.reduce((acc, curr) => acc + curr.score, 0)}
                    </div>
                    <div className="text-xs text-slate-500">總戰力積分</div>
                 </div>
            </div>
        </div>

        {/* Student Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {students.map((student) => {
            const { currentRank, nextRank } = getRankInfo(student.score);
            const progress = calculateProgress(student.score, currentRank, nextRank);
            
            return (
              <div 
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 cursor-pointer group overflow-hidden relative"
              >
                {/* Rank Badge Header */}
                <div className={`h-20 ${currentRank.color} flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all"></div>
                    <RankBadge rankData={currentRank} className="w-14 h-14 scale-125 shadow-xl transform group-hover:scale-150 transition-transform duration-300" />
                </div>
                
                {/* Content */}
                <div className="p-4 text-center">
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{student.name}</h3>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 bg-slate-100 inline-block px-2 py-0.5 rounded">
                    {currentRank.title}
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2 mb-3">
                      <span className="text-2xl font-mono font-bold text-slate-700">{student.score}</span>
                      <span className="text-xs text-slate-400">PTS</span>
                  </div>

                  {/* Progress Bar */}
                  {nextRank ? (
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-1 overflow-hidden">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  ) : (
                    <div className="w-full bg-yellow-100 text-yellow-700 text-xs py-1 rounded font-bold">已達最高軍階</div>
                  )}
                  
                  {nextRank && (
                     <p className="text-[10px] text-slate-400 text-right w-full">
                        距離 {nextRank.title}: {nextRank.score - student.score} 分
                     </p>
                  )}
                </div>
                
                {/* Last Action Tooltip/Footer */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                    <History size={10} className="mr-1" />
                    <span className="truncate max-w-[120px]">{student.lastAction || "無記錄"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Rank Guide Modal */}
      {isRankGuideOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center">
                   <BookOpen className="mr-3 text-yellow-500"/> 
                   軍銜晉升手冊
                </h2>
                <button onClick={() => setIsRankGuideOpen(false)} className="p-2 hover:bg-slate-700 rounded-full">
                   <X size={24} />
                </button>
             </div>
             <div className="p-6 overflow-y-auto bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {RANKS.map((rank, i) => (
                     <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 shrink-0">
                           <RankBadge rankData={rank} className="w-12 h-12" />
                        </div>
                        <div>
                           <div className="text-xs text-slate-400 font-bold mb-0.5">{rank.category}</div>
                           <div className="font-bold text-slate-800">{rank.title}</div>
                           <div className="text-xs text-indigo-600 font-mono font-bold">{rank.score} 積分</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <UserPlus className="mr-2 text-indigo-600"/> 徵召新兵
            </h2>
            <form onSubmit={handleAddStudent}>
              <input
                type="text"
                placeholder="輸入學生姓名..."
                autoFocus
                className="w-full p-3 border-2 border-slate-200 rounded-xl mb-4 focus:outline-none focus:border-indigo-500 text-lg"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
              />
              <div className="flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-200"
                >
                  確認徵召
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action / Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center space-x-4">
                 <div className="relative">
                     <RankBadge rankData={getRankInfo(selectedStudent.score).currentRank} className="w-16 h-16" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedStudent.name}</h2>
                    <p className="text-slate-500 font-medium">
                        {getRankInfo(selectedStudent.score).currentRank.title} • {selectedStudent.score} 分
                    </p>
                 </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Body - Actions */}
            <div className="p-6 overflow-y-auto">
              
              <div className="mb-8">
                <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center uppercase tracking-wide">
                    <Award size={16} className="mr-2"/> 表彰 (加分)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BEHAVIORS.positive.map((b, i) => (
                        <button 
                            key={i}
                            onClick={() => updatePoints(b.points, b.label)}
                            className="flex flex-col items-center justify-center p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 active:scale-95 transition-all"
                        >
                            <span className="text-2xl mb-1">{b.icon}</span>
                            <span className="font-medium text-green-800">{b.label}</span>
                            <span className="text-xs font-bold text-green-600 bg-green-200 px-2 py-0.5 rounded-full mt-1">+{b.points}</span>
                        </button>
                    ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center uppercase tracking-wide">
                    <AlertCircle size={16} className="mr-2"/> 紀律提醒 (扣分)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BEHAVIORS.negative.map((b, i) => (
                        <button 
                            key={i}
                            onClick={() => updatePoints(b.points, b.label)}
                            className="flex flex-col items-center justify-center p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 active:scale-95 transition-all"
                        >
                            <span className="text-2xl mb-1">{b.icon}</span>
                            <span className="font-medium text-red-800">{b.label}</span>
                            <span className="text-xs font-bold text-red-600 bg-red-200 px-2 py-0.5 rounded-full mt-1">{b.points}</span>
                        </button>
                    ))}
                </div>
              </div>

              {/* Custom Action */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8">
                  <h3 className="text-sm font-bold text-slate-600 mb-3">自定義調整</h3>
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="原因 (例: 運動會第一名)"
                        className="flex-1 p-2 border rounded-lg text-sm"
                        value={customReason}
                        onChange={e => setCustomReason(e.target.value)}
                      />
                      <input 
                        type="number" 
                        placeholder="+/- 分數"
                        className="w-24 p-2 border rounded-lg text-sm"
                        value={customPoints}
                        onChange={e => setCustomPoints(Number(e.target.value))}
                      />
                      <button 
                        onClick={() => {
                            if(customReason && customPoints !== 0) {
                                updatePoints(customPoints, customReason);
                                setCustomReason("");
                                setCustomPoints(0);
                            }
                        }}
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                      >
                          <Save size={18} />
                      </button>
                  </div>
              </div>

              {/* History Section - NEW */}
              <div className="border-t border-slate-200 pt-6">
                 <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center uppercase tracking-wide">
                    <Clock size={16} className="mr-2"/> 履歷檔案 (歷史記錄)
                 </h3>
                 <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    {selectedStudent.history && selectedStudent.history.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                           {[...selectedStudent.history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((item, idx) => (
                               <div key={idx} className="p-3 flex justify-between items-center hover:bg-white transition-colors">
                                   <div className="flex items-center">
                                       <span className={`w-2 h-2 rounded-full mr-3 ${item.points >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                       <span className="text-sm font-medium text-slate-700">{item.reason}</span>
                                   </div>
                                   <div className="flex items-center space-x-4">
                                       <span className="text-xs text-slate-400">{formatDate(item.timestamp)}</span>
                                       <span className={`text-sm font-bold w-12 text-right ${item.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                           {item.points > 0 ? '+' : ''}{item.points}
                                       </span>
                                   </div>
                               </div>
                           ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            尚無履歷記錄
                        </div>
                    )}
                 </div>
              </div>

            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-between items-center">
                <button 
                    onClick={() => handleDeleteStudent(selectedStudent.id)}
                    className="text-red-500 hover:text-red-700 text-sm flex items-center px-2 py-1"
                >
                    <Trash2 size={14} className="mr-1"/> 除名
                </button>
                <div className="text-xs text-slate-400">
                    ID: {selectedStudent.id.substring(0,8)}...
                </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
