import { useState, useEffect, useRef } from "react";
import { Star, Plus, X, Sparkles, Trash2, RotateCcw, Archive, ChevronDown } from "lucide-react";

const STORAGE_KEY = "kirakira-bucket-list-v1";

const PALETTE = [
  { name: "sky", bg: "bg-sky-100", border: "border-sky-200", text: "text-sky-500", fill: "bg-sky-300", chip: "bg-sky-200" },
  { name: "pink", bg: "bg-pink-100", border: "border-pink-200", text: "text-pink-500", fill: "bg-pink-300", chip: "bg-pink-200" },
  { name: "purple", bg: "bg-purple-100", border: "border-purple-200", text: "text-purple-500", fill: "bg-purple-300", chip: "bg-purple-200" },
  { name: "amber", bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-500", fill: "bg-amber-300", chip: "bg-amber-200" },
  { name: "emerald", bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-500", fill: "bg-emerald-300", chip: "bg-emerald-200" },
  { name: "rose", bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-500", fill: "bg-rose-300", chip: "bg-rose-200" },
];

const EMOJI_RULES = [
  { keywords: ["食べ", "グルメ", "ごはん", "ご飯", "料理", "レストラン", "スイーツ", "お菓子", "ケーキ", "カフェ", "食事"], emoji: "🍽️" },
  { keywords: ["飲", "お酒", "ワイン", "ビール", "カクテル"], emoji: "🍷" },
  { keywords: ["旅", "観光", "海外"], emoji: "✈️" },
  { keywords: ["本", "読書", "小説"], emoji: "📚" },
  { keywords: ["映画", "ドラマ"], emoji: "🎬" },
  { keywords: ["音楽", "ライブ", "コンサート"], emoji: "🎵" },
  { keywords: ["服", "ファッション", "コーデ"], emoji: "👗" },
  { keywords: ["美容", "コスメ", "メイク", "スキンケア"], emoji: "💄" },
  { keywords: ["運動", "スポーツ", "筋トレ", "ジム", "ヨガ"], emoji: "🏃" },
  { keywords: ["勉強", "学び", "資格", "スクール"], emoji: "📖" },
  { keywords: ["お金", "貯金", "投資"], emoji: "💰" },
  { keywords: ["家", "インテリア", "部屋"], emoji: "🏠" },
  { keywords: ["ペット", "犬", "猫", "動物"], emoji: "🐾" },
  { keywords: ["恋愛", "結婚", "デート"], emoji: "💕" },
  { keywords: ["仕事", "キャリア", "転職"], emoji: "💼" },
  { keywords: ["健康", "美容"], emoji: "🌿" },
  { keywords: ["ゲーム"], emoji: "🎮" },
  { keywords: ["写真", "カメラ"], emoji: "📷" },
  { keywords: ["車", "ドライブ"], emoji: "🚗" },
  { keywords: ["自然", "キャンプ", "アウトドア", "山", "海"], emoji: "🏕️" },
  { keywords: ["欲し", "買い物", "ショッピング"], emoji: "🎁" },
];

const pickEmoji = (name) => {
  const rule = EMOJI_RULES.find((r) => r.keywords.some((k) => name.includes(k)));
  return rule ? rule.emoji : "🌟";
};

// ブラウザ標準のUUID生成（対応していない古い環境向けのフォールバック付き）
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const buildInitialCategories = () => [
  {
    id: uid(),
    name: "旅行",
    emoji: "✈️",
    palette: PALETTE[0],
    items: [
      { id: uid(), text: "（例）京都の紅葉を見に行く", checked: true, detail: "烏丸あたりに泊まる" },
      { id: uid(), text: "（例）ニューヨークで自由の女神を見る", checked: false, detail: "" },
    ],
  },
  {
    id: uid(),
    name: "欲しいもの",
    emoji: "🎁",
    palette: PALETTE[1],
    items: [
      { id: uid(), text: "（例）新しいカメラ", checked: false, detail: "" },
      { id: uid(), text: "（例）North Faceのリュック", checked: true, detail: "" },
    ],
  },
];

// 保存データにはpalette情報は含めず、名前から再度色を割り当てる
const paletteForIndex = (i) => PALETTE[i % PALETTE.length];

const loadCategories = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialCategories();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return buildInitialCategories();
    return parsed.map((c, i) => ({ ...c, palette: paletteForIndex(i) }));
  } catch {
    return buildInitialCategories();
  }
};

export default function App() {
  const [categories, setCategories] = useState(loadCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [draftItems, setDraftItems] = useState({});
  const [burstId, setBurstId] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [toast, setToast] = useState(null); // { message, onUndo }
  const toastTimerRef = useRef(null);
  const [trash, setTrash] = useState([]); // 削除済みアイテム/カテゴリーの保管場所（アーカイブ）
  const [trashOpen, setTrashOpen] = useState(false);

  // カテゴリーが変わるたびにブラウザに保存（paletteは除いて保存）
  useEffect(() => {
    const toSave = categories.map(({ palette, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [categories]);

  const showToast = (message, onUndo) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, onUndo });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  };

  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  const insertAt = (arr, index, value) => [...arr.slice(0, index), value, ...arr.slice(index)];

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const palette = paletteForIndex(categories.length);
    setCategories([...categories, { id: uid(), name, emoji: pickEmoji(name), palette, items: [] }]);
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const deleteCategory = (catId) => {
    const index = categories.findIndex((c) => c.id === catId);
    if (index === -1) return;
    const removed = categories[index];
    setCategories(categories.filter((c) => c.id !== catId));
    const trashId = uid();
    setTrash((cur) => [{ id: trashId, type: "category", label: removed.name, category: removed }, ...cur]);
    showToast(`「${removed.name}」を削除しました`, () => {
      setCategories((cur) => insertAt(cur, index, removed));
      setTrash((cur) => cur.filter((t) => t.id !== trashId));
      dismissToast();
    });
  };

  const addItem = (catId) => {
    const text = (draftItems[catId] || "").trim();
    if (!text) return;
    setCategories(
      categories.map((c) =>
        c.id === catId ? { ...c, items: [...c.items, { id: uid(), text, checked: false, detail: "" }] } : c
      )
    );
    setDraftItems({ ...draftItems, [catId]: "" });
  };

  const toggleItem = (catId, itemId) => {
    setCategories(
      categories.map((c) => {
        if (c.id !== catId) return c;
        return {
          ...c,
          items: c.items.map((it) => {
            if (it.id !== itemId) return it;
            if (!it.checked) {
              setBurstId(itemId);
              setTimeout(() => setBurstId((cur) => (cur === itemId ? null : cur)), 600);
            }
            return { ...it, checked: !it.checked };
          }),
        };
      })
    );
  };

  const toggleExpand = (itemId) => {
    setExpandedItems((cur) => {
      const next = new Set(cur);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const updateItemDetail = (catId, itemId, detail) => {
    setCategories((cur) =>
      cur.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((it) => (it.id === itemId ? { ...it, detail } : it)) }
          : c
      )
    );
  };

  const deleteItem = (catId, itemId) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const index = cat.items.findIndex((it) => it.id === itemId);
    if (index === -1) return;
    const removed = cat.items[index];
    setCategories(
      categories.map((c) => (c.id === catId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c))
    );
    const trashId = uid();
    setTrash((cur) => [
      { id: trashId, type: "item", label: removed.text, catId, catName: cat.name, item: removed },
      ...cur,
    ]);
    showToast(`「${removed.text}」を削除しました`, () => {
      setCategories((cur) =>
        cur.map((c) => (c.id === catId ? { ...c, items: insertAt(c.items, index, removed) } : c))
      );
      setTrash((cur) => cur.filter((t) => t.id !== trashId));
      dismissToast();
    });
  };

  // アーカイブから復元する
  const restoreFromTrash = (trashId) => {
    const entry = trash.find((t) => t.id === trashId);
    if (!entry) return;
    if (entry.type === "category") {
      setCategories((cur) => [...cur, entry.category]);
    } else {
      setCategories((cur) => {
        const catExists = cur.some((c) => c.id === entry.catId);
        if (catExists) {
          return cur.map((c) => (c.id === entry.catId ? { ...c, items: [...c.items, entry.item] } : c));
        }
        // 元のカテゴリーがもう無い場合は、同じ名前で作り直す
        const palette = paletteForIndex(cur.length);
        return [
          ...cur,
          { id: uid(), name: entry.catName, emoji: pickEmoji(entry.catName), palette, items: [entry.item] },
        ];
      });
    }
    setTrash((cur) => cur.filter((t) => t.id !== trashId));
  };

  const permanentlyDelete = (trashId) => {
    setTrash((cur) => cur.filter((t) => t.id !== trashId));
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: "'Quicksand', sans-serif",
        background: "linear-gradient(135deg, #FDF6FF 0%, #F5F0FF 35%, #FFF6F0 100%)",
      }}
    >
      <style>{`
        @keyframes pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @keyframes sparkle {
          0% { opacity: 1; transform: translateY(0) scale(0.6) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-22px) scale(1.1) rotate(40deg); }
        }
        .pop { animation: pop 0.35s ease; }
        .sparkle-burst { animation: sparkle 0.6s ease forwards; }

        @keyframes puku {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.04); }
        }
        @keyframes kira-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.7) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.15) rotate(15deg); }
        }
        .title-puku {
          display: inline-block;
          animation: puku 1.6s ease-in-out infinite;
        }
        .title-kira {
          color: #b48ee0;
          background: linear-gradient(
            90deg,
            #c9a3f0 0%, #f5a3d9 20%, #ffd39a 40%, #a3e0f5 60%, #c9a3f0 80%, #f5a3d9 100%
          );
          background-size: 250% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: kira-shimmer 10s linear infinite;
        }
        .title-twinkle {
          display: inline-block;
          animation: twinkle 2.8s ease-in-out infinite;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(-2deg); }
        }
        .cloud-badge {
          animation: wiggle 2.4s ease-in-out infinite;
        }
      `}</style>

      <div className="max-w-xl mx-auto px-5 py-10">
        {/* ヘッダー */}
        <div className="relative text-center mb-9">
          <Sparkles className="w-4 h-4 text-purple-300 title-twinkle absolute" style={{ top: "-2px", left: "18%", animationDelay: "0s" }} />
          <Sparkles className="w-3 h-3 text-pink-300 title-twinkle absolute" style={{ top: "6px", right: "16%", animationDelay: "1.4s" }} />
          <Sparkles className="w-3 h-3 text-amber-300 title-twinkle absolute" style={{ top: "38%", left: "6%", animationDelay: "0.7s" }} />
          <Sparkles className="w-4 h-4 text-purple-200 title-twinkle absolute" style={{ top: "34%", right: "5%", animationDelay: "2.1s" }} />
          <Sparkles className="w-3 h-3 text-pink-200 title-twinkle absolute" style={{ bottom: "6px", left: "26%", animationDelay: "0s" }} />
          <Sparkles className="w-3 h-3 text-purple-300 title-twinkle absolute" style={{ bottom: "0px", right: "24%", animationDelay: "1.4s" }} />

          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="relative inline-block pt-5 pl-3">
              <div
                className="cloud-badge absolute z-10 bg-white/90 text-purple-400 shadow-sm flex items-center justify-center"
                style={{
                  top: "-0.6rem",
                  left: "-0.9rem",
                  padding: "0.15rem 0.55rem",
                  fontSize: "0.65rem",
                  borderRadius: "50% 50% 45% 55% / 60% 65% 40% 45%",
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  fontWeight: 800,
                }}
              >
                きらきら
              </div>
              <div className="absolute bg-white/90 rounded-full z-10" style={{ width: "0.45rem", height: "0.45rem", top: "0.7rem", left: "-0.3rem" }} />
              <div className="absolute bg-white/90 rounded-full z-10" style={{ width: "0.25rem", height: "0.25rem", top: "1.15rem", left: "-0.55rem" }} />

              <h1 className="text-3xl" style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 900 }}>
                {"バケットリスト".split("").map((char, i) => (
                  <span key={i} className="title-puku title-kira" style={{ animationDelay: `${i * 0.08}s` }}>
                    {char}
                  </span>
                ))}
              </h1>
            </div>
          </div>
          <p className="text-sm text-purple-300">やりたいこと・欲しいものを、そっと書き留めて</p>
          <p
            className="text-xs text-pink-300 mt-1 tracking-wide"
            style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif", fontStyle: "italic" }}
          >
            Wishes come true ✨
          </p>
        </div>

        {/* カテゴリーカード */}
        <div className="space-y-6">
          {categories.map((cat) => {
            const total = cat.items.length;
            const done = cat.items.filter((i) => i.checked).length;
            const p = cat.palette;

            return (
              <div key={cat.id} className={`rounded-3xl border ${p.border} ${p.bg} p-5 shadow-sm`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.emoji}</span>
                    <h2 className={`text-lg ${p.text}`} style={{ fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 700 }}>
                      {cat.name}
                    </h2>
                    <span className="text-xs text-gray-400">
                      {done}/{total}
                    </span>
                  </div>
                  <button onClick={() => deleteCategory(cat.id)} className="text-gray-300 hover:text-gray-500 transition-colors" aria-label="カテゴリーを削除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  {cat.items.length === 0 && (
                    <p className="text-sm text-gray-400 italic py-2">まだ何もありません。夢を追加してみましょう ✨</p>
                  )}
                  {cat.items.map((item) => {
                    const isExpanded = expandedItems.has(item.id);
                    return (
                      <div key={item.id} className="group bg-white/70 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <button onClick={() => toggleItem(cat.id, item.id)} className={`shrink-0 relative ${burstId === item.id ? "pop" : ""}`} aria-label="チェック">
                            <Star className={`w-5 h-5 ${item.checked ? `${p.text} fill-current` : "text-gray-300"}`} />
                            {burstId === item.id && <Sparkles className="w-4 h-4 text-amber-300 absolute -top-2 -right-2 sparkle-burst" />}
                          </button>
                          <button onClick={() => toggleExpand(item.id)} className="flex-1 flex items-center gap-1 text-left">
                            <span className={`flex-1 text-sm text-gray-600 ${item.checked ? "line-through text-gray-400 opacity-50" : ""}`}>{item.text}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-gray-300 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                          <button onClick={() => deleteItem(cat.id, item.id)} className="text-gray-300 hover:text-gray-500 transition-opacity shrink-0" aria-label="削除">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-2.5 pl-11">
                            <input
                              value={item.detail || ""}
                              onChange={(e) => updateItemDetail(cat.id, item.id, e.target.value)}
                              placeholder="詳細メモ（例: 烏丸に泊まる）"
                              className="w-full text-xs bg-white/80 rounded-lg px-2.5 py-1.5 outline-none placeholder:text-gray-300 text-gray-500 focus:ring-2 focus:ring-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    value={draftItems[cat.id] || ""}
                    onChange={(e) => setDraftItems({ ...draftItems, [cat.id]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addItem(cat.id)}
                    placeholder="新しい夢を追加..."
                    className="flex-1 text-sm bg-white/70 rounded-xl px-3 py-2 outline-none placeholder:text-gray-300 text-gray-600 focus:ring-2 focus:ring-white"
                  />
                  <button onClick={() => addItem(cat.id)} className={`${p.chip} rounded-xl px-3 flex items-center justify-center hover:brightness-95 transition`} aria-label="追加">
                    <Plus className={`w-4 h-4 ${p.text}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* カテゴリー追加 */}
        <div className="mt-6">
          {showAddCategory ? (
            <div className="flex gap-2 bg-white/60 rounded-2xl p-2 border border-purple-100">
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="新しいカテゴリー名（例: 学びたいこと）"
                className="flex-1 text-sm bg-transparent outline-none px-2 text-gray-600 placeholder:text-gray-300"
              />
              <button onClick={addCategory} className="bg-purple-200 text-purple-500 text-sm rounded-xl px-4 py-2 hover:brightness-95 transition">
                追加
              </button>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName("");
                }}
                className="text-gray-300 hover:text-gray-500 px-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCategory(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-200 rounded-2xl py-3 text-purple-300 hover:bg-white/40 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              カテゴリーを追加
            </button>
          )}
        </div>

        <p className="text-center text-xs text-purple-200 mt-8">✨ このブラウザに自動で保存されます</p>
      </div>

      {/* 削除の取り消しトースト */}
      {toast && (
        <div className="fixed left-1/2 bottom-6 z-50 flex items-center gap-3 bg-white shadow-lg rounded-full pl-4 pr-2 py-2" style={{ transform: "translateX(-50%)" }}>
          <span className="text-sm text-gray-600 truncate" style={{ maxWidth: "55vw" }}>{toast.message}</span>
          <button onClick={toast.onUndo} className="flex items-center gap-1 bg-purple-100 text-purple-500 text-sm font-bold rounded-full px-3 py-1.5 hover:bg-purple-200 transition shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
            元に戻す
          </button>
          <button onClick={dismissToast} className="text-gray-300 hover:text-gray-500 pr-1 shrink-0" aria-label="閉じる">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 端っこの小さなアーカイブ箱 */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start">
        {trashOpen && (
          <div className="mb-2 w-60 max-h-72 overflow-y-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
            <p className="text-xs text-gray-400 px-2 pt-1 pb-2">アーカイブ</p>
            {trash.length === 0 ? (
              <p className="text-xs text-gray-300 px-2 pb-2">空っぽです</p>
            ) : (
              <div className="space-y-1">
                {trash.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-2 py-1.5">
                    <span className="text-xs shrink-0">{entry.type === "category" ? "📁" : "・"}</span>
                    <span className="flex-1 text-xs text-gray-500 truncate">{entry.label}</span>
                    <button onClick={() => restoreFromTrash(entry.id)} className="text-purple-400 hover:text-purple-600 shrink-0" aria-label="復元">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => permanentlyDelete(entry.id)} className="text-gray-300 hover:text-rose-400 shrink-0" aria-label="完全に削除">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setTrashOpen((v) => !v)}
          className="relative w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          aria-label="アーカイブを開く"
        >
          <Archive className="w-4 h-4" />
          {trash.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-300 text-white rounded-full text-[10px] leading-none w-4 h-4 flex items-center justify-center">
              {trash.length > 9 ? "9+" : trash.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
