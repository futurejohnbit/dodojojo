import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, Plus, Star, Award, TrendingUp, 
    AlertCircle, ChevronRight, Trophy, Trash2,
    Shield, Medal, History, UserPlus, X, Save,
    BookOpen, Clock, SortAsc, SortDesc, CheckSquare,
    Edit2
} from 'lucide-react';

import { 
    signInAnonymously, 
    onAuthStateChanged,
    signInWithCustomToken,
    User
} from 'firebase/auth';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp,
    query,
    orderBy,
    arrayUnion,
    writeBatch
} from 'firebase/firestore';

import { auth, db } from './firebase';

// --- Configuration Handling ---
const appId = (window as any).__app_id || 'default-app-id';
const CLASS_ID = 'default-class'; // 共用班級 ID，確保跨裝置同步

// --- Rank System Definition (1500分制) ---
const RANKS = [
    { title: "列兵", score: 0, color: "bg-gray-500", icon: "v1", category: "士兵" },
    { title: "上等兵", score: 20, color: "bg-gray-600", icon: "v2", category: "士兵" },
    { title: "下士", score: 60, color: "bg-green-600", icon: "bar1", category: "士官" },
    { title: "中士", score: 120, color: "bg-green-700", icon: "bar2", category: "士官" },
    { title: "上士", score: 200, color: "bg-green-800", icon: "bar3", category: "士官" },
    { title: "軍士長", score: 300, color: "bg-emerald-700", icon: "bar4", category: "士官" },
    { title: "少尉", score: 450, color: "bg-blue-500", icon: "star1", category: "尉官" },
    { title: "中尉", score: 600, color: "bg-blue-600", icon: "star2", category: "尉官" },
    { title: "上尉", score: 750, color: "bg-blue-700", icon: "star3", category: "尉官" },
    { title: "少校", score: 900, color: "bg-indigo-600", icon: "lines_star1", category: "校官" },
    { title: "中校", score: 1050, color: "bg-indigo-700", icon: "lines_star2", category: "校官" },
    { title: "上校", score: 1200, color: "bg-indigo-800", icon: "lines_star3", category: "校官" },
    { title: "大校", score: 1300, color: "bg-indigo-900", icon: "lines_star4", category: "校官" },
    { title: "少將", score: 1400, color: "bg-yellow-600", icon: "wheat_star1", category: "將官" },
    { title: "中將", score: 1450, color: "bg-yellow-700", icon: "wheat_star2", category: "將官" },
    { title: "上將", score: 1500, color: "bg-yellow-800", icon: "wheat_star3", category: "將官" },
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
        { label: "出位", points: -5, icon: "🚶‍♂️" },
        { label: "干擾課堂", points: -15, icon: "🚫" },
    ]
};

// --- Components ---

const RankBadge = ({ rankData, className = "w-12 h-12" }: { rankData: any, className?: string }) => {
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

const getRankInfo = (score: number) => {
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

const calculateProgress = (score: number, currentRank: any, nextRank: any) => {
    if (!nextRank) return 100;
    const range = nextRank.score - currentRank.score;
    const gained = score - currentRank.score;
    return Math.min(100, Math.max(0, (gained / range) * 100));
};

const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// --- Main App ---

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState('score'); // 'score', 'name', 'createdAt'
    
    // Modal States
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    // const [isRankGuideOpen, setIsRankGuideOpen] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);

    // Form States
    const [newStudentName, setNewStudentName] = useState("");
    const [customPoints, setCustomPoints] = useState(0);
    const [customReason, setCustomReason] = useState("");
    const [editingName, setEditingName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);

    // Bulk Custom Form
    const [bulkCustomPoints, setBulkCustomPoints] = useState(0);
    const [bulkCustomReason, setBulkCustomReason] = useState("");

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = (window as any).__initial_auth_token;
                if (token) {
                    await signInWithCustomToken(auth, token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err: any) {
                console.error("Auth Error:", err);
                setError(err.message);
                setLoading(false);
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
                setError(null);
            }
        }, (err: any) => {
            setError(err.message);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // 如果有錯誤或沒有使用者，不嘗試讀取資料
        if (!user) return;

        // 使用 CLASS_ID 來作為 collection 路徑，確保所有裝置讀取同一份資料
        const studentsRef = collection(db, 'artifacts', appId, 'classes', CLASS_ID, 'students');
        const q = query(studentsRef); 
        
        const unsubStudents = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(data);
            
            if (selectedStudent) {
                const updatedSelected = data.find(s => s.id === selectedStudent.id);
                if (updatedSelected) setSelectedStudent(updatedSelected);
            }
            setLoading(false);
        }, (err) => {
            console.error("Data error:", err);
            setError("無法讀取資料，請檢查 Firebase 權限設定 (Firestore Rules)。");
            setLoading(false);
        });
        
        return () => unsubStudents();
    }, [user, selectedStudent?.id]);

    const sortedStudents = useMemo(() => {
        const sorted = [...students];
        if (sortBy === 'score') {
            sorted.sort((a, b) => b.score - a.score);
        } else if (sortBy === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
        } else if (sortBy === 'createdAt') {
            sorted.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tA - tB; // Oldest first
            });
        }
        return sorted;
    }, [students, sortBy]);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudentName.trim()) return;
        
        try {
            await addDoc(collection(db, 'artifacts', appId, 'classes', CLASS_ID, 'students'), {
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
        } catch (error: any) {
            console.error("Error adding student:", error);
            alert("新增失敗: " + error.message);
        }
    };

    const updatePoints = async (student: any, amount: number, reason: string) => {
        const newScore = Math.max(0, student.score + amount);
        const studentRef = doc(db, 'artifacts', appId, 'classes', CLASS_ID, 'students', student.id);
        await updateDoc(studentRef, {
            score: newScore,
            lastAction: reason,
            lastUpdated: serverTimestamp(),
            history: arrayUnion({
                reason: reason,
                points: amount,
                timestamp: new Date().toISOString()
            })
        });
    };

    const handleBulkUpdate = async (amount: number, reason: string) => {
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        selectedIds.forEach(id => {
            const student = students.find(s => s.id === id);
            if (student) {
                const newScore = Math.max(0, student.score + amount);
                const studentRef = doc(db, 'artifacts', appId, 'classes', CLASS_ID, 'students', id);
                
                batch.update(studentRef, {
                    score: newScore,
                    lastAction: reason,
                    lastUpdated: serverTimestamp(),
                    history: arrayUnion({
                        reason: reason,
                        points: amount,
                        timestamp: timestamp
                    })
                });
            }
        });

        try {
            await batch.commit();
            setIsBulkActionModalOpen(false);
            setSelectedIds([]);
            setIsBulkMode(false);
            // Clear custom inputs
            setBulkCustomPoints(0);
            setBulkCustomReason("");
        } catch (error) {
            console.error("Bulk update failed:", error);
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if(!confirm("確定要將此士兵除名嗎？此操作無法復原。")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'classes', CLASS_ID, 'students', studentId));
            setSelectedStudent(null);
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleNameUpdate = async () => {
        if(!selectedStudent || !editingName.trim()) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'classes', CLASS_ID, 'students', selectedStudent.id), {
                name: editingName
            });
            setIsEditingName(false);
        } catch (error) {
            console.error("Name update failed", error);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
                <div className="max-w-md text-center bg-slate-800 p-8 rounded-2xl border border-red-500/50 shadow-2xl">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-2">系統連線錯誤</h2>
                    <p className="text-slate-400 mb-6 text-sm">{error}</p>
                    <div className="bg-slate-900 p-4 rounded text-left text-xs font-mono text-slate-500 overflow-x-auto whitespace-pre-wrap break-all">
                        請檢查 Firebase 設定是否正確。
                    </div>
                </div>
            </div>
        );
    }

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
            
            {/* Sidebar */}
            <aside className="w-full md:w-80 bg-slate-800 text-slate-100 flex flex-col shadow-2xl z-10 shrink-0">
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
                        {[...students].sort((a,b) => b.score - a.score).slice(0, 10).map((student, index) => {
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

                <div className="p-4 bg-slate-900 border-t border-slate-700">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl flex items-center justify-center transition-all font-bold shadow-lg shadow-indigo-900/50"
                    >
                        <UserPlus className="mr-2" size={20} /> 新兵入伍
                    </button>
                    <div className="mt-3 flex gap-2">
                         <button 
                            onClick={() => setIsBulkMode(!isBulkMode)}
                            className={`flex-1 p-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${isBulkMode ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            <CheckSquare size={16} className="mr-1" /> 批量操作
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">部隊名單</h2>
                        <p className="text-slate-500 text-sm">共 {students.length} 位士兵在列</p>
                    </div>
                    
                    <div className="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border border-slate-200">
                        <button 
                            onClick={() => setSortBy('score')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center ${sortBy === 'score' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Trophy size={14} className="mr-1" /> 積分
                        </button>
                        <button 
                            onClick={() => setSortBy('name')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center ${sortBy === 'name' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <SortAsc size={14} className="mr-1" /> 姓名
                        </button>
                        <button 
                            onClick={() => setSortBy('createdAt')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center ${sortBy === 'createdAt' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Clock size={14} className="mr-1" /> 加入時間
                        </button>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {isBulkMode && selectedIds.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center">
                            <div className="bg-yellow-100 p-2 rounded-full mr-3 text-yellow-700 font-bold w-10 h-10 flex items-center justify-center">
                                {selectedIds.length}
                            </div>
                            <span className="font-medium text-yellow-900">已選擇士兵</span>
                        </div>
                        <button 
                            onClick={() => setIsBulkActionModalOpen(true)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors"
                        >
                            執行獎懲
                        </button>
                    </div>
                )}

                {/* Students Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedStudents.map(student => {
                        const { currentRank, nextRank } = getRankInfo(student.score);
                        const progress = calculateProgress(student.score, currentRank, nextRank);
                        const isSelected = selectedIds.includes(student.id);

                        return (
                            <div 
                                key={student.id}
                                onClick={() => isBulkMode ? toggleSelection(student.id) : setSelectedStudent(student)}
                                className={`
                                    relative bg-white rounded-2xl p-6 shadow-sm border transition-all cursor-pointer group hover:-translate-y-1
                                    ${isBulkMode 
                                        ? (isSelected ? 'border-yellow-500 ring-2 ring-yellow-500/50 bg-yellow-50' : 'border-slate-200 hover:border-yellow-300')
                                        : 'border-slate-200 hover:shadow-xl hover:border-indigo-200'
                                    }
                                `}
                            >
                                {isBulkMode && (
                                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-slate-300 bg-white'}`}>
                                        {isSelected && <CheckSquare size={14} className="text-white" />}
                                    </div>
                                )}

                                <div className="flex flex-col items-center mb-4">
                                    <RankBadge rankData={currentRank} className="w-20 h-20 mb-3" />
                                    <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded mt-1">
                                        {currentRank.title}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-3xl font-bold text-slate-800 font-mono">{student.score}</span>
                                        <span className="text-xs text-slate-400 mb-1">/ {nextRank ? nextRank.score : 'MAX'}</span>
                                    </div>
                                    
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    
                                    <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
                                        <span>最新動態:</span>
                                        <span className="font-medium truncate max-w-[100px] text-slate-600">{student.lastAction || '無'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center">
                                <UserPlus className="mr-2 text-indigo-600" /> 新兵入伍
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudent}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">姓名</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="輸入學生姓名"
                                    value={newStudentName}
                                    onChange={e => setNewStudentName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">取消</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">確認入伍</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Action Modal */}
            {isBulkActionModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-slate-800">
                                批量操作 ({selectedIds.length} 人)
                            </h3>
                            <button onClick={() => setIsBulkActionModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full">
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center uppercase tracking-wide">
                                    <Award size={16} className="mr-2"/> 批量獎勵
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {BEHAVIORS.positive.map((b, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleBulkUpdate(b.points, b.label)}
                                            className="flex flex-col items-center justify-center p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 active:scale-95 transition-all"
                                        >
                                            <span className="text-2xl mb-1">{b.icon}</span>
                                            <span className="font-medium text-green-800">{b.label}</span>
                                            <span className="text-xs font-bold text-green-600 bg-green-200 px-2 py-0.5 rounded-full mt-1">+{b.points}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h3 className="text-sm font-bold text-slate-600 mb-3">自定義批量調整</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="原因"
                                        className="flex-1 p-2 border rounded-lg text-sm"
                                        value={bulkCustomReason}
                                        onChange={e => setBulkCustomReason(e.target.value)}
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="+/- 分數"
                                        className="w-24 p-2 border rounded-lg text-sm"
                                        value={bulkCustomPoints}
                                        onChange={e => setBulkCustomPoints(Number(e.target.value))}
                                    />
                                    <button 
                                        onClick={() => {
                                            if(bulkCustomReason && bulkCustomPoints !== 0) {
                                                handleBulkUpdate(bulkCustomPoints, bulkCustomReason);
                                            }
                                        }}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 flex items-center"
                                    >
                                        <Save size={18} className="mr-1"/> 應用
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50 rounded-t-2xl">
                            <div className="flex items-center space-x-4 w-full">
                                <div className="relative shrink-0">
                                    <RankBadge rankData={getRankInfo(selectedStudent.score).currentRank} className="w-16 h-16" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditingName ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                className="text-2xl font-bold text-slate-800 border-b-2 border-indigo-500 focus:outline-none bg-transparent w-full"
                                                defaultValue={selectedStudent.name}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={handleNameUpdate} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"><Save size={18}/></button>
                                            <button onClick={() => setIsEditingName(false)} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={18}/></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center group">
                                            <h2 className="text-2xl font-bold text-slate-800 truncate mr-2">{selectedStudent.name}</h2>
                                            <button onClick={() => { setIsEditingName(true); setEditingName(selectedStudent.name); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity">
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-slate-500 font-medium">
                                        {getRankInfo(selectedStudent.score).currentRank.title} • {selectedStudent.score} 分
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors shrink-0 ml-2">
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center uppercase tracking-wide">
                                    <Award size={16} className="mr-2"/> 表彰 (加分)
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {BEHAVIORS.positive.map((b, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => updatePoints(selectedStudent, b.points, b.label)}
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
                                            onClick={() => updatePoints(selectedStudent, b.points, b.label)}
                                            className="flex flex-col items-center justify-center p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 active:scale-95 transition-all"
                                        >
                                            <span className="text-2xl mb-1">{b.icon}</span>
                                            <span className="font-medium text-red-800">{b.label}</span>
                                            <span className="text-xs font-bold text-red-600 bg-red-200 px-2 py-0.5 rounded-full mt-1">{b.points}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

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
                                                updatePoints(selectedStudent, customPoints, customReason);
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

                            <div className="border-t border-slate-200 pt-6">
                                <h3 className="text-sm font-bold text-slate-500 mb-4 flex items-center uppercase tracking-wide">
                                    <Clock size={16} className="mr-2"/> 履歷檔案 (歷史記錄)
                                </h3>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                    {selectedStudent.history && selectedStudent.history.length > 0 ? (
                                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {[...selectedStudent.history].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((item: any, idx: number) => (
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

                        <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-between items-center">
                            <button onClick={() => handleDeleteStudent(selectedStudent.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center px-2 py-1">
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

export default App;
