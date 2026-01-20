import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function Dashboard() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [workout, setWorkout] = useState("");
  const [data, setData] = useState([]);

  const userId = auth.currentUser.uid;

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return 0;
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  };

  const fetchData = async () => {
    const q = query(collection(db, "workouts"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const sortedData = snapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setData(sortedData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addEntry = async () => {
    const bmi = calculateBMI(weight, height);
    await addDoc(collection(db, "workouts"), {
      userId,
      weight,
      height,
      bmi,
      workout,
      date: new Date().toISOString().split("T")[0],
    });
    setWeight("");
    setHeight("");
    setWorkout("");
    fetchData();
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => signOut(auth)}
          className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          type="number"
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="number"
          placeholder="Height (cm)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Workout"
          value={workout}
          onChange={(e) => setWorkout(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          onClick={addEntry}
          className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
        >
          Add Entry
        </button>
      </div>

      <LineChart width={700} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="weight" stroke="#8884d8" />
        <Line type="monotone" dataKey="bmi" stroke="#82ca9d" />
      </LineChart>
    </div>
  );
}
