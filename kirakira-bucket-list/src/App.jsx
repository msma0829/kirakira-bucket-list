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
