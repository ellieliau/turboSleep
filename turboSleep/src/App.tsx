import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot
} from "recharts";
import "./App.css";

type AgeGroup =
  | "新生兒"
  | "嬰兒"
  | "學步兒童"
  | "學齡前兒童"
  | "學齡兒童"
  | "青少年"
  | "成年人"
  | "老年";

const depthBaseMap: Record<AgeGroup, string[]> = {
  "新生兒": ["REM", "N1", "N2", "N3", "N2", "N1", "REM"],
  "嬰兒": ["REM", "N1", "N2", "N3", "N2", "N1", "REM"],
  "學步兒童": ["N1", "N2", "N3", "N3", "N2", "N1", "REM"],
  "學齡前兒童": ["N1", "N2", "N3", "N3", "N2", "N1", "REM"],
  "學齡兒童": ["N1", "N2", "N3", "N3", "N2", "N1", "REM"],
  "青少年": ["N1", "N2", "N3", "N2", "N1", "REM"],
  "成年人": ["N1", "N2", "N3", "N2", "N1", "REM"],
  "老年": ["N1", "N2", "N2", "N1", "REM"]
};

const cycleMap: Record<AgeGroup, number> = {
  "新生兒": 50,
  "嬰兒": 70,
  "學步兒童": 75,
  "學齡前兒童": 90,
  "學齡兒童": 105,
  "青少年": 85,
  "成年人": 90,
  "老年": 85
};

const cycleRangeMap: Record<AgeGroup, [number, number]> = {
  "新生兒": [10, 14],
  "嬰兒": [9, 11],
  "學步兒童": [5, 7],
  "學齡前兒童": [4, 6],
  "學齡兒童": [5, 9],
  "青少年": [2, 7],
  "成年人": [2, 8],
  "老年": [4, 5]
};

const sleepHealthMap: Record<AgeGroup, [number, number, number]> = {
  "新生兒": [14, 17, 17],
  "嬰兒": [12, 15, 15],
  "學步兒童": [11, 14, 14],
  "學齡前兒童": [10, 13, 13],
  "學齡兒童": [9, 11, 11],
  "青少年": [7, 10, 10],
  "成年人": [6, 9, 9],
  "老年": [6, 8, 8]
};

function getAgeGroup(age: number): AgeGroup {
  if (age < 0.25) return "新生兒"; // 0-3個月
  if (age < 1) return "嬰兒"; // 4-11個月
  if (age < 3) return "學步兒童";
  if (age < 6) return "學齡前兒童";
  if (age < 14) return "學齡兒童";
  if (age < 18) return "青少年";
  if (age < 65) return "成年人";
  return "老年";
}

function format12Hour(hour: number, minute: number) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

function getSleepEmoji(hours: number, ageGroup: AgeGroup) {
  const [low, healthyMax] = sleepHealthMap[ageGroup];
  if (hours < low) return { emoji: "😢", color: "red", text: "極不健康" };
  if (hours < healthyMax) return { emoji: "😄", color: "green", text: "健康" };
  return { emoji: "😐", color: "orange", text: "不健康" };
}

export default function App() {
  const [age, setAge] = useState<number | "">("");
  const [mode, setMode] = useState("sleep");
  const [time, setTime] = useState("");
  const [chartData, setChartData] = useState<any[]>([]);
  const [wakeOptions, setWakeOptions] = useState<{ time: string; cycles: number; hours: number }[]>([]);
  const [result, setResult] = useState<string>("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [comment, setComment] = useState("");

  const handleAnalyze = () => {
    if (!time || age === "") return alert("請輸入年齡與時間！");
    const group = getAgeGroup(Number(age));
    const cycle = cycleMap[group];
    const [minCycle, maxCycle] = cycleRangeMap[group];
    const [h, m] = time.split(":").map(Number);
    const baseTime = h * 60 + m;

    const stages = depthBaseMap[group];
    const points: any[] = [];
    for (let i = 0; i <= maxCycle * cycle; i += 5) {
      const phase = (i % cycle) / cycle;
      const stage = stages[Math.floor(phase * stages.length)] ?? "N2";
      const t = mode === "sleep" ? baseTime + i : baseTime - i;
      const hh = Math.floor(((t / 60) + 24) % 24);
      const mm = Math.floor((t % 60 + 60) % 60);
      points.push({
        time: `${hh.toString().padStart(2,"0")}:${mm.toString().padStart(2,"0")}`,
        stage
      });
    }

    const wakeOpts: { time: string; cycles: number; hours: number }[] = [];
    for (let n = minCycle; n <= maxCycle; n++) {
      const totalMin = n * cycle;
      const t = mode === "sleep" ? baseTime + totalMin : baseTime - totalMin;
      const hh = Math.floor(((t / 60) + 24) % 24);
      const mm = Math.floor((t % 60 + 60) % 60);
      wakeOpts.push({
        time: `${hh.toString().padStart(2,"0")}:${mm.toString().padStart(2,"0")}`,
        cycles: n,
        hours: totalMin / 60
      });
    }

    setChartData(points);
    setWakeOptions(wakeOpts);

    const [low, healthyMax] = sleepHealthMap[group];
    setResult(`建議睡眠時長：${low}～${healthyMax} `);
  };

  const sendFeedback = async (emoji: string) => {
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbwEBih_z1KkiaTln-IyhxWmtNMoUcD8bOpXToUTZN7Gkv-5FAGFzCTnC8JCQQk75VlS/exec",
        {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            rating: emoji,
            comment: comment
          }), 
        }
      );
  
      console.log("feedback sent:", emoji, comment); 
      setFeedbackSent(true);
      setComment("");
    } catch (err) {
      console.error(err);
      alert("回饋送出失敗，請稍後再試！");
    }
  };
  

  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      <h1 className="text-2xl font-bold mb-4">睡眠週期建議系統</h1>

      {/* 輸入區 */}
      <div className="space-y-3">
        <div>
          <label>年齡：</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="border rounded p-1 w-24"
            placeholder="例如 16"
            min={0}
            max={120}
          />
        </div>

        <div>
          <label>模式：</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="border rounded p-1"
          >
            <option value="sleep">我要睡覺(估算起床時間)</option>
            <option value="wake">我要起床(估算睡覺時間)</option>
          </select>
        </div>

        <div>
          <label>{mode === "sleep" ? "現在時間：" : "預計起床時間："}</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="border rounded p-1"
          />
        </div>

        <button
          onClick={handleAnalyze}
          className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600"
        >
          分析
        </button>
      </div>

      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p>{result}</p>
        </div>
      )}

      {wakeOptions.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {wakeOptions.map(({ time, cycles, hours }) => {
            const group = getAgeGroup(Number(age));
            const { emoji, color } = getSleepEmoji(hours, group);
            return (
              <div className="suggestion-box" style={{ borderColor: color }} key={time}>
                {format12Hour(Number(time.split(":")[0]), Number(time.split(":")[1]))} {emoji} ({hours.toFixed(1)}h / {cycles} 週期)
              </div>
            );
          })}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-6 chart-wrapper" style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis
                type="category"
                dataKey="stage"
                domain={["REM","N1","N2","N3"]}
                reversed
                label={{ value: "睡眠階段", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Line type="monotone" dataKey="stage" stroke="#8884d8" dot={false} />

              {wakeOptions.map(({ time, hours }) => {
               const group = getAgeGroup(Number(age));
               const { color } = getSleepEmoji(hours, group); 
               return (
                 <ReferenceDot
                 key={time}
                 x={time}  
                 y="N1"
                 r={5}
                 fill={color}
                 stroke={color}
               />
             );
           })}

            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
     {chartData.length > 0 && !feedbackSent && (
  <div className="feedback-container animate-fadeIn">
    <p className="feedback-title">這個網站的數據對您的幫助有多大？</p>
    <div className="feedback-emojis">
      <button className="feedback-btn" onClick={() => sendFeedback("😄")}>
        <span className="emoji">😄</span>
        <span className="label">很有用</span>
      </button>
      <button className="feedback-btn" onClick={() => sendFeedback("😐")}>
        <span className="emoji">😐</span>
        <span className="label">普通</span>
      </button>
      <button className="feedback-btn" onClick={() => sendFeedback("😢")}>
        <span className="emoji">😢</span>
        <span className="label">沒幫助</span>
      </button>
    </div>
  </div>
)}

{chartData.length > 0 && feedbackSent && (
  <p className="feedback-thanks animate-fadeIn">💬 感謝您的回饋！</p>
)}

    </div>
  );
}
