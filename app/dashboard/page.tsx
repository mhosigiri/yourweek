"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth/authHelpers";
import Link from "next/link";
import NetworkStatus from "../components/ui/NetworkStatus";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import Button from "../components/ui/Button";
import { logOut, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

// Loading component for suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Days of the week
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Task type definition
interface Task {
  id: string;
  description: string;
  startTime: string;
  endTime: string;
  day: string;
}

// Interface for the task modal
interface TaskModalProps {
  day: string;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  tasks: Task[];
  onDeleteTask: (id: string) => void;
}

// Modal for adding tasks
const TaskModal: React.FC<TaskModalProps> = ({
  day,
  onClose,
  onAddTask,
  tasks,
  onDeleteTask,
}) => {
  const [newTask, setNewTask] = useState<Omit<Task, "id">>({
    description: "",
    startTime: "09:00",
    endTime: "10:00",
    day,
  });
  const [taskToCopy, setTaskToCopy] = useState<Task | null>(null);
  const [copyToDay, setCopyToDay] = useState<string>("");
  const [copyMessage, setCopyMessage] = useState<string>("");

  const handleAddTask = () => {
    onAddTask({
      ...newTask,
      id: Date.now().toString(),
    });
    setNewTask({
      ...newTask,
      description: "",
    });
  };
  
  const handleCopyConfirm = () => {
    if (!taskToCopy || !copyToDay) return;
    
    onAddTask({
      description: taskToCopy.description,
      startTime: taskToCopy.startTime,
      endTime: taskToCopy.endTime,
      day: copyToDay,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5)
    });
    
    setCopyMessage(`Task copied to ${copyToDay}!`);
    setTimeout(() => {
      setCopyMessage("");
      setTaskToCopy(null);
      setCopyToDay("");
    }, 2000);
  };
  
  const cancelCopy = () => {
    setTaskToCopy(null);
    setCopyToDay("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Copy Task Dialog */}
      {taskToCopy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-sm transform transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Copy Task</h3>
              <button
                onClick={cancelCopy}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-700">Task to copy:</p>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-medium text-gray-800">{taskToCopy.startTime} - {taskToCopy.endTime}</p>
                <p className="text-gray-600">{taskToCopy.description}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Copy to day:
              </label>
              <select
                value={copyToDay}
                onChange={(e) => setCopyToDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a day</option>
                {DAYS_OF_WEEK.filter(d => d !== day).map((otherDay) => (
                  <option key={otherDay} value={otherDay}>
                    {otherDay}
                  </option>
                ))}
              </select>
            </div>
            
            {copyMessage && (
              <div className="mb-4 text-sm font-medium px-3 py-2 rounded-md bg-green-100 text-green-800">
                {copyMessage}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelCopy}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleCopyConfirm}
                disabled={!copyToDay}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Copy Task
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {day}&apos;s Tasks
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={newTask.startTime}
                onChange={(e) =>
                  setNewTask({ ...newTask, startTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={newTask.endTime}
                onChange={(e) =>
                  setNewTask({ ...newTask, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Description
            </label>
            <input
              type="text"
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              placeholder="Enter task description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAddTask}
            disabled={!newTask.description.trim()}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add Task
          </button>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Tasks for {day}</h4>
          <div className="overflow-y-auto max-h-60 border border-gray-200 rounded-md">
            {tasks.filter((task) => task.day === day).length > 0 ? (
              <div className="divide-y divide-gray-200">
                {tasks
                  .filter((task) => task.day === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((task) => (
                    <div key={task.id} className="p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">
                          {task.startTime} - {task.endTime}
                        </span>
                        <div className="flex space-x-2">
                          {/* Copy button */}
                          <button
                            onClick={() => setTaskToCopy(task)}
                            className="text-blue-500 hover:text-blue-700"
                            aria-label="Copy task"
                          >
                            <svg 
                              className="h-5 w-5" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                              />
                            </svg>
                          </button>
                          
                          {/* Delete button */}
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Delete task"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 mt-1">{task.description}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No tasks yet for {day}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Heptagonal Prism Face Component
interface PrismFaceProps {
  day: string;
  position: [number, number, number];
  rotation: [number, number, number];
  onClick: () => void;
  isActive: boolean;
  index: number;
  tasks: Task[];
}

const PrismFace: React.FC<PrismFaceProps> = ({
  day,
  position,
  rotation,
  onClick,
  isActive,
  index,
  tasks,
}) => {
  const [hovered, setHovered] = useState(false);
  const faceRef = useRef<THREE.Mesh>(null);

  // Get task count for this day
  const taskCount = tasks.filter((task) => task.day === day).length;

  // Day-specific theme data
  const getDayTheme = () => {
    const themes = [
      {
        // Monday - Productive Blue
        bgColor: "#bae6fd",
        hoverColor: "#7dd3fc",
        activeColor: "#0ea5e9",
        gradient: ["#dbeafe", "#e0f7ff"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#0ea5e9"
              side={THREE.BackSide}
            />
            {/* Coffee cup icon simplified */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#0c4a6e"
              rotation={[0, 0, 0]}
            >
              ☕
            </Text>
          </mesh>
        ),
        titleColor: "#075985",
      },
      {
        // Tuesday - Growth Green
        bgColor: "#bbf7d0",
        hoverColor: "#86efac",
        activeColor: "#22c55e",
        gradient: ["#d1fae5", "#dcfce7"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#10b981"
              side={THREE.BackSide}
            />
            {/* Plant icon simplified */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#064e3b"
              rotation={[0, 0, 0]}
            >
              🌱
            </Text>
          </mesh>
        ),
        titleColor: "#047857",
      },
      {
        // Wednesday - Energy Yellow
        bgColor: "#fde68a",
        hoverColor: "#fcd34d",
        activeColor: "#eab308",
        gradient: ["#fef3c7", "#fef9c3"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#fbbf24"
              side={THREE.BackSide}
            />
            {/* Lightning bolt icon simplified */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#78350f"
              rotation={[0, 0, 0]}
            >
              ⚡
            </Text>
          </mesh>
        ),
        titleColor: "#92400e",
      },
      {
        // Thursday - Focus Red
        bgColor: "#fecaca",
        hoverColor: "#fca5a5",
        activeColor: "#ef4444",
        gradient: ["#fee2e2", "#fecaca"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#ef4444"
              side={THREE.BackSide}
            />
            {/* Target icon simplified */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#7f1d1d"
              rotation={[0, 0, 0]}
            >
              🎯
            </Text>
          </mesh>
        ),
        titleColor: "#b91c1c",
      },
      {
        // Friday - Fun Purple with sun
        bgColor: "#e9d5ff",
        hoverColor: "#d8b4fe",
        activeColor: "#a855f7",
        gradient: ["#f3e8ff", "#ede9fe"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#c084fc"
              side={THREE.BackSide}
            />
            {/* Sun icon for Friday */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#581c87"
              rotation={[0, 0, 0]}
            >
              ☀️
            </Text>
          </mesh>
        ),
        titleColor: "#7e22ce",
      },
      {
        // Saturday - Relax Orange
        bgColor: "#fed7aa",
        hoverColor: "#fdba74",
        activeColor: "#f97316",
        gradient: ["#ffedd5", "#fed7aa"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#fb923c"
              side={THREE.BackSide}
            />
            {/* Beach umbrella icon simplified */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#7c2d12"
              rotation={[0, 0, 0]}
            >
              🏖️
            </Text>
          </mesh>
        ),
        titleColor: "#c2410c",
      },
      {
        // Sunday - Calm Slate
        bgColor: "#e2e8f0",
        hoverColor: "#cbd5e1",
        activeColor: "#64748b",
        gradient: ["#f1f5f9", "#e2e8f0"],
        icon: (
          <mesh position={[0, 0.25, 0.06]} rotation={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshBasicMaterial
              transparent
              opacity={0.7}
              color="#94a3b8"
              side={THREE.BackSide}
            />
            {/* Book icon simplified */}
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.3}
              color="#334155"
              rotation={[0, 0, 0]}
            >
              📖
            </Text>
          </mesh>
        ),
        titleColor: "#475569",
      },
    ];

    return themes[index];
  };

  const theme = getDayTheme();

  // Get color based on state
  const getColor = () => {
    if (isActive) return theme.activeColor;
    if (hovered) return theme.hoverColor;
    return theme.bgColor;
  };

  // Using Object3D.matrixAutoUpdate ensures we get consistent transformations
  return (
    <group position={position} rotation={rotation} matrixAutoUpdate={true}>
      <mesh
        ref={faceRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <RoundedBox args={[1.5, 2.2, 0.1]} radius={0.05} smoothness={4}>
          <meshStandardMaterial
            color={getColor()}
            roughness={0.3}
            metalness={0.2}
            side={THREE.BackSide}
          />
        </RoundedBox>

        {/* Day Name */}
        <Text
          position={[0, 0.85, 0.06]}
          fontSize={0.22}
          color={theme.titleColor}
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          {day}
        </Text>

        {/* Day decorative icon */}
        {theme.icon}

        {/* Task count indicator */}
        <mesh position={[0, -0.3, 0.06]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial
            color={isActive ? theme.activeColor : theme.titleColor}
            side={THREE.BackSide}
          />
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            rotation={[0, 0, 0]}
            fontWeight="bold"
          >
            {taskCount}
          </Text>
        </mesh>

        {/* Task count label */}
        <Text
          position={[0, -0.6, 0.06]}
          fontSize={0.16}
          color={theme.titleColor}
          fontWeight="bold"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          {taskCount === 1 ? "task" : "tasks"}
        </Text>

        {isActive && (
          <mesh position={[0, -0.9, 0.06]}>
            <planeGeometry args={[1, 0.3]} />
            <meshBasicMaterial
              color="#3b82f6"
              transparent
              opacity={0.9}
              side={THREE.BackSide}
            />
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.16}
              color="white"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, 0]}
            >
              View Tasks
            </Text>
          </mesh>
        )}
      </mesh>
    </group>
  );
};

// Heptagonal Prism 3D Component
interface PrismProps {
  currentDayIndex: number;
  onDaySelect: (day: string) => void;
  tasks: Task[];
}

const HeptagonalPrism: React.FC<PrismProps> = ({
  currentDayIndex,
  onDaySelect,
  tasks,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);

  // Use React Three Fiber's animation frame hook for smoother animations
  useFrame((state) => {
    if (!groupRef.current) return;

    // 1. Handle the floating effect (only vertical movement)
    // Calculate a slow oscillation for a gentle floating effect
    const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    groupRef.current.position.y = floatY;

    // 2. Handle rotation animation - only around Y-axis
    const currentY = groupRef.current.rotation.y;
    const targetY = targetRotation.current;

    // Calculate the shortest path to the target rotation
    let deltaY = targetY - currentY;

    // Normalize the rotation to be between -PI and PI
    while (deltaY > Math.PI) deltaY -= 2 * Math.PI;
    while (deltaY < -Math.PI) deltaY += 2 * Math.PI;

    // Apply a smooth easing
    const step = deltaY * 0.08;

    // Only modify the Y rotation, leave X and Z at 0
    groupRef.current.rotation.y += step;

    // Ensure no unwanted rotations
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;
  });

  // Set target rotation when current day changes
  useEffect(() => {
    // Calculate the target rotation angle for the current day
    // We multiply by -1 to rotate clockwise (since positive rotation is counterclockwise)
    targetRotation.current = -(currentDayIndex * ((2 * Math.PI) / 7));
  }, [currentDayIndex]);

  return (
    <group ref={groupRef}>
      {DAYS_OF_WEEK.map((day, index) => {
        // Calculate position and rotation for each face of the heptagonal prism
        const angle = (index * 2 * Math.PI) / 7;
        const radius = 2.5; // Distance from the center

        const x = radius * Math.sin(angle);
        const z = radius * Math.cos(angle);

        // Position in 3D space
        const position: [number, number, number] = [x, 0, z];

        // Set rotation to face outward from the center
        // Since we're using BackSide materials, we need to face the backs toward the viewer
        const rotationY = angle;

        // Ensure rotation is ONLY around Y-axis for strict direction rotation
        const rotation: [number, number, number] = [0, rotationY, 0];

        return (
          <PrismFace
            key={day}
            day={day}
            position={position}
            rotation={rotation}
            onClick={() => onDaySelect(day)}
            isActive={index === currentDayIndex}
            index={index}
            tasks={tasks}
          />
        );
      })}
    </group>
  );
};

// Schedule Display props interface
interface ScheduleDisplayProps {
  tasks: Task[];
}

// Schedule Display Component
const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ tasks }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>({});

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Organize tasks by day
  useEffect(() => {
    console.log("Schedule Display received tasks:", tasks);
    
    const now = new Date();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDay = dayNames[now.getDay()];

    // Create an object with all days as keys and empty arrays as values
    const organized: Record<string, Task[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      organized[day] = [];
    });

    // Don't proceed if tasks is empty or not an array
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      console.log("No tasks to organize");
      setTasksByDay(organized);
      return;
    }

    // Filter out tasks that have already ended today
    const validTasks = tasks.filter((task) => {
      if (!task || !task.day || !task.endTime) {
        console.log("Invalid task found:", task);
        return false;
      }
      
      if (task.day !== currentDay) return true;

      try {
        const [hours, minutes] = task.endTime.split(":").map(Number);
        const taskEndTime = new Date();
        taskEndTime.setHours(hours, minutes, 0, 0);
        return taskEndTime > now;
      } catch (e) {
        console.error("Error processing task time:", e);
        return false;
      }
    });

    // Organize tasks by day
    validTasks.forEach((task) => {
      if (!organized[task.day]) {
        organized[task.day] = [];
      }
      organized[task.day].push(task);
    });

    // Sort tasks within each day by start time
    Object.keys(organized).forEach((day) => {
      organized[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    console.log("Organized tasks by day:", organized);
    setTasksByDay(organized);
  }, [tasks, currentTime]);

  // Determine if a task is currently active
  const isTaskActive = (task: Task) => {
    const now = new Date();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDay = dayNames[now.getDay()];

    if (task.day !== currentDay) return false;

    const [startHours, startMinutes] = task.startTime.split(":").map(Number);
    const [endHours, endMinutes] = task.endTime.split(":").map(Number);

    const taskStartTime = new Date();
    taskStartTime.setHours(startHours, startMinutes, 0, 0);

    const taskEndTime = new Date();
    taskEndTime.setHours(endHours, endMinutes, 0, 0);

    return now >= taskStartTime && now <= taskEndTime;
  };

  // Get the formatted date for a specific day
  const getFormattedDate = (dayName: string) => {
    const now = new Date();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDayIndex = dayNames.indexOf(dayNames[now.getDay()]);
    const targetDayIndex = dayNames.indexOf(dayName);

    // Calculate days to add (can be negative if target day is before current day)
    let daysToAdd = targetDayIndex - currentDayIndex;
    if (daysToAdd < 0) daysToAdd += 7; // Wrap around to next week

    const date = new Date();
    date.setDate(now.getDate() + daysToAdd);

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get day-specific theme color
  const getDayColor = (day: string) => {
    const dayIndex = DAYS_OF_WEEK.indexOf(day);
    const colors = [
      "#0ea5e9", // Monday - blue
      "#22c55e", // Tuesday - green
      "#eab308", // Wednesday - yellow
      "#ef4444", // Thursday - red
      "#a855f7", // Friday - purple
      "#f97316", // Saturday - orange
      "#64748b", // Sunday - slate
    ];
    return colors[dayIndex] || "#3b82f6";
  };

  // Check if there are any tasks scheduled
  const hasAnyTasks = Object.values(tasksByDay).some(
    (dayTasks) => dayTasks.length > 0
  );

  return (
    <div className="mt-10 bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Your Upcoming Schedule
        </h2>
        <div className="text-gray-500 font-medium">
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {hasAnyTasks ? (
        <>
          {/* Desktop view (table) - hidden on mobile */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {DAYS_OF_WEEK.map((day) => {
                    const isCurrentDay =
                      day ===
                      [
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ][new Date().getDay()];
                    const dayColor = getDayColor(day);

                    return (
                      <th
                        key={day}
                        scope="col"
                        className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          isCurrentDay
                            ? "bg-blue-50 border-b-2"
                            : "text-gray-500 border-b"
                        }`}
                        style={{
                          borderBottomColor: isCurrentDay
                            ? dayColor
                            : undefined,
                          color: isCurrentDay ? dayColor : undefined,
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{day}</span>
                          <span className="text-xs font-normal opacity-75">
                            {getFormattedDate(day)}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="divide-x divide-gray-100">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayTasks = tasksByDay[day] || [];
                    const isEmpty = dayTasks.length === 0;
                    const dayColor = getDayColor(day);

                    return (
                      <td
                        key={day}
                        className="px-2 py-2 align-top"
                        style={{ minHeight: "120px" }}
                      >
                        {isEmpty ? (
                          <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
                            No tasks
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayTasks.map((task) => {
                              const isActive = isTaskActive(task);
                              const lightColor = `${dayColor}20`;

                              return (
                                <div
                                  key={task.id}
                                  className={`p-2 rounded text-xs ${
                                    isActive
                                      ? "border-l-2 bg-opacity-10"
                                      : "hover:bg-gray-50"
                                  }`}
                                  style={{
                                    backgroundColor: isActive
                                      ? lightColor
                                      : undefined,
                                    borderLeftColor: isActive
                                      ? dayColor
                                      : undefined,
                                  }}
                                >
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={`font-medium ${
                                        isActive
                                          ? "text-gray-900"
                                          : "text-gray-700"
                                      }`}
                                      style={{
                                        color: isActive ? dayColor : undefined,
                                      }}
                                    >
                                      {task.startTime} - {task.endTime}
                                    </span>
                                    {isActive && (
                                      <span
                                        className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                                        style={{ backgroundColor: dayColor }}
                                      >
                                        Now
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`mt-1 text-xs ${
                                      isActive ? "font-medium" : "font-normal"
                                    } text-gray-600`}
                                  >
                                    {task.description}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile view (timeline) */}
          <div className="md:hidden space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const dayTasks = tasksByDay[day] || [];
              const isEmpty = dayTasks.length === 0;
              const dayColor = getDayColor(day);
              const isCurrentDay =
                day ===
                [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ][new Date().getDay()];

              // Skip empty days for cleaner mobile view
              if (isEmpty) return null;

              return (
                <div
                  key={day}
                  className="rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div
                    className="py-2 px-3 font-medium flex justify-between items-center"
                    style={{
                      backgroundColor: isCurrentDay
                        ? `${dayColor}10`
                        : "#f9fafb",
                      borderBottom: `1px solid ${
                        isCurrentDay ? dayColor : "#e5e7eb"
                      }`,
                    }}
                  >
                    <div className="flex flex-col">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isCurrentDay ? dayColor : "#374151" }}
                      >
                        {day}
                      </span>
                      <span className="text-xs opacity-75">
                        {getFormattedDate(day)}
                      </span>
                    </div>
                    {isCurrentDay && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="py-1 divide-y divide-gray-100">
                    {dayTasks.map((task, index) => {
                      const isActive = isTaskActive(task);
                      const lightColor = `${dayColor}20`;
                      const isLast = index === dayTasks.length - 1;

                      return (
                        <div
                          key={task.id}
                          className={`relative pl-8 pr-3 py-2.5 ${
                            isLast ? "" : "pb-3.5"
                          }`}
                        >
                          {/* Timeline dot */}
                          <div
                            className="absolute left-3.5 top-3 w-3 h-3 rounded-full z-10"
                            style={{
                              backgroundColor: isActive ? dayColor : "#d1d5db",
                            }}
                          />

                          {/* Timeline line */}
                          {!isLast && (
                            <div
                              className="absolute left-4.5 top-6 w-0.5 h-full"
                              style={{ backgroundColor: "#e5e7eb" }}
                            />
                          )}

                          <div
                            className={`rounded-md p-2 ${
                              isActive ? "bg-opacity-10" : ""
                            }`}
                            style={{
                              backgroundColor: isActive
                                ? lightColor
                                : undefined,
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span
                                className="text-sm font-medium"
                                style={{
                                  color: isActive ? dayColor : "#4b5563",
                                }}
                              >
                                {task.startTime} - {task.endTime}
                              </span>
                              {isActive && (
                                <span
                                  className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: dayColor }}
                                >
                                  Now
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {task.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-gray-500 mb-1">No upcoming tasks scheduled</p>
          <p className="text-gray-400 text-sm">
            Start by adding tasks to your week
          </p>
        </div>
      )}
    </div>
  );
};

// Dashboard Scene props interface
interface DashboardSceneProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

// Dashboard 3D Scene
const DashboardScene: React.FC<DashboardSceneProps> = ({
  tasks,
  onAddTask,
  onDeleteTask,
}) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const rotateToPreviousDay = () => {
    setCurrentDayIndex((prev) => (prev + 1) % 7);
  };

  const rotateToNextDay = () => {
    setCurrentDayIndex((prev) => (prev - 1 + 7) % 7);
  };

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
  };

  const closeModal = () => {
    setSelectedDay(null);
  };

  return (
    <div className="relative">
      {/* 3D Canvas */}
      <div className="h-[500px] bg-gradient-to-b from-blue-50 to-gray-50 rounded-lg overflow-hidden shadow-xl">
        <Canvas
          camera={{
            position: [0, 0, 7.5], // Slightly further back to ensure we see all sides
            fov: 45,
            near: 0.1,
            far: 1000,
          }}
          dpr={[1, 2]} // Responsive pixel ratio
        >
          <color attach="background" args={["#f8fafc"]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <spotLight
            position={[0, 10, 0]}
            angle={0.3}
            penumbra={1}
            intensity={0.5}
            castShadow
          />

          <Suspense fallback={null}>
            {/* Lock rotation strictly to Y-axis only */}
            <group rotation={[0, 0, 0]}>
              {/* No PresentationControls - we'll control rotation directly */}
              <HeptagonalPrism
                currentDayIndex={currentDayIndex}
                onDaySelect={handleDaySelect}
                tasks={tasks}
              />
            </group>
          </Suspense>
        </Canvas>

        {/* Navigation Controls */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <button
            onClick={rotateToNextDay}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous day"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <button
            onClick={rotateToPreviousDay}
            className="p-4 bg-white rounded-full shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next day"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Current Day Indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-md">
          <div className="text-gray-800 font-semibold">
            {DAYS_OF_WEEK[currentDayIndex]}
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {selectedDay && (
        <TaskModal
          day={selectedDay}
          onClose={closeModal}
          onAddTask={onAddTask}
          tasks={tasks}
          onDeleteTask={onDeleteTask}
        />
      )}
    </div>
  );
};

// Dashboard content component
const DashboardContent = () => {
  const { user, isOnline } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [savedTasks, setSavedTasks] = useState<Task[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check for unsaved changes by comparing tasks with savedTasks
  useEffect(() => {
    // Simple check to determine if the current tasks differ from the saved tasks
    const tasksString = JSON.stringify(tasks);
    const savedTasksString = JSON.stringify(savedTasks);
    
    setHasUnsavedChanges(tasksString !== savedTasksString);
  }, [tasks, savedTasks]);

  // Load tasks from Firestore with real-time sync
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (!user?.uid) return;
    
    try {
      // First try loading from localStorage as a fallback
      const storedTasks = localStorage.getItem(`tasks_${user.uid}`);
      if (storedTasks) {
        try {
          const parsedTasks = JSON.parse(storedTasks);
          setTasks(parsedTasks);
          setSavedTasks(parsedTasks);
        } catch (e) {
          console.error("Error parsing stored tasks", e);
        }
      }
      
      // Set up real-time listener for tasks
      console.log("Setting up real-time sync for tasks...");
      const taskDoc = doc(db, "tasks", user.uid);
      
      unsubscribe = onSnapshot(
        taskDoc,
        (doc) => {
          if (doc.exists()) {
            const taskData = doc.data();
            if (taskData.tasks) {
              console.log("Received updated tasks via real-time sync");
              setTasks(taskData.tasks);
              setSavedTasks(taskData.tasks);
              // Update localStorage with the latest data
              localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(taskData.tasks));
              // Reset any previous error state
              if (saveStatus === "error") {
                setSaveStatus("idle");
              }
            }
          } else {
            console.log("No tasks document exists in Firestore yet");
          }
        },
        (error) => {
          console.error("Error in real-time task listener:", error);
          // If we get an error due to being offline, we'll keep using local data
          if (error.code === "failed-precondition" || error.message.includes("offline")) {
            console.log("Offline mode - using local data");
          }
        }
      );
    } catch (error) {
      console.error("Critical error setting up tasks sync:", error);
      // If everything fails, we've already loaded from localStorage as fallback
    }
    
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      if (unsubscribe) {
        console.log("Cleaning up real-time task listener");
        unsubscribe();
      }
    };
  }, [user?.uid, saveStatus]);

  const handleAddTask = (newTask: Task) => {
    // Add the task locally
    setTasks((prev) => [...prev, newTask]);
    
    // If online, auto-save to sync with other devices
    if (isOnline) {
      // Schedule a save after a short delay to allow for batching multiple quick changes
      const timeoutId = setTimeout(() => handleSaveWeek(), 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleUpdateTask = (id: string, updatedTask: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updatedTask } : task))
    );
    
    // If online, auto-save to sync with other devices
    if (isOnline) {
      // Schedule a save after a short delay
      const timeoutId = setTimeout(() => handleSaveWeek(), 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    
    // If online, auto-save to sync with other devices
    if (isOnline) {
      // Schedule a save after a short delay
      const timeoutId = setTimeout(() => handleSaveWeek(), 1000);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSaveWeek = async () => {
    if (!user?.uid) {
      console.error("Cannot save: User not authenticated");
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }
    
    // Set status to saving
    setSaveStatus("saving");
    
    // First, save to localStorage immediately for quick local persistence
    localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(tasks));
    console.log("Saved tasks to localStorage for offline support");
    
    // Improved Firestore save function with better error handling
    const saveToFirestore = async (attempt = 1) => {
      const maxRetries = 3;
      
      try {
        // Verify tasks are in the correct format
        if (!Array.isArray(tasks)) {
          throw new Error("Tasks must be an array");
        }
        
        // IMPORTANT: Always use the user's UID as the document ID
        // This ensures cross-device sync will work correctly with Firestore security rules
        const uid = user.uid;
        const taskDoc = doc(db, "tasks", uid);
        console.log(`Saving tasks to Firestore document: tasks/${uid}`);
        
        // Create a deep copy of the tasks to avoid any potential issues
        // with references or non-serializable objects
        const tasksCopy = JSON.parse(JSON.stringify(tasks));
        
        // Save data with merge option to preserve any fields we don't know about
        await setDoc(taskDoc, {
          tasks: tasksCopy,
          updatedAt: serverTimestamp(),
          userId: uid
        }, { merge: true });
        
        console.log("Successfully saved tasks to Firestore");
        
        // Update both task states to ensure UI is consistent
        setTasks(tasksCopy);
        setSavedTasks(tasksCopy);
        
        // Show success status
        setSaveStatus("success");
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      } catch (error) {
        console.error(`Error saving tasks to Firestore (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
          console.log(`Retrying in ${Math.round(delay/1000)} seconds...`);
          
          // Use setTimeout with a new function to avoid closure issues
          setTimeout(() => saveToFirestore(attempt + 1), delay);
        } else {
          console.error("All attempts to save to Firestore failed:", error);
          setSaveStatus("error");
          
          // Reset status after 3 seconds
          setTimeout(() => {
            setSaveStatus("idle");
          }, 3000);
        }
      }
    };
    
    // Start the save process with retry logic
    saveToFirestore();
  };

  const handleLogout = async (): Promise<void> => {
    try {
      // Clear the session cookie
      clearSessionCookie();
      // Log out from Firebase
      await logOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          {/* Desktop header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-blue-600 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3"
                />
              </svg>
              <span className="hidden sm:inline">{user?.displayName}</span>
            </h1>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex space-x-4 items-center">
              <Link
                href="/profile"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Profile
              </Link>
              <Link
                href="/search"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Search Users
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button - Only visible on mobile */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={toggleMobileMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation Menu - Only visible when open */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 py-3 border-t border-gray-200 space-y-1">
              <div className="flex items-center px-2 py-2 text-sm font-medium text-gray-900">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                    {user?.displayName?.charAt(0) || "U"}
                  </div>
                  <span>{user?.displayName}</span>
                </div>
              </div>
              <Link
                href="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </div>
              </Link>
              <Link
                href="/search"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Search Users
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </div>
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                Social-Plan
              </h2>
              <p className="mt-1 text-gray-500">
                Plan your week with our interactive 3D scheduler together with
                friends
              </p>
            </div>

            {/* 3D Heptagonal Prism Interface */}
            <div className="p-6">
              <DashboardScene
                tasks={tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
              />
            </div>

            {/* Save Button with Sync Status */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col items-center">
                <div className="flex items-center w-full justify-between mb-3 px-2">
                  {/* Left side - Sync status */}
                  <div className="flex items-center text-sm text-gray-600">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 mr-1.5 ${isOnline ? "text-green-500" : "text-yellow-500"}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d={isOnline 
                          ? "M5 12h14M12 5l7 7-7 7" // Online arrow
                          : "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" // Offline symbol
                        } 
                      />
                    </svg>
                    <span>{isOnline ? "Real-time sync active" : "Offline mode"}</span>
                  </div>
                  
                  {/* Right side - Last sync time (only if we implemented it) */}
                  <div className="text-xs text-gray-500">
                    {isOnline && "Changes sync across devices automatically"}
                  </div>
                </div>
                
                <button
                  onClick={handleSaveWeek}
                  disabled={saveStatus === "saving" || (!hasUnsavedChanges && saveStatus !== "error")}
                  className={`mx-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors shadow-md hover:shadow-lg
                  ${saveStatus === "saving" 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : hasUnsavedChanges || saveStatus === "error"
                      ? "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      : "bg-gray-400 cursor-not-allowed"}`}
                >
                  {saveStatus === "saving" ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                        />
                      </svg>
                      Save Unsaved Changes
                    </>
                  ) : saveStatus === "error" ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Retry Saving
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      All Changes Saved
                    </>
                  )}
                </button>
                
                {/* Success Message */}
                {saveStatus === "success" && (
                  <div className="mt-3 text-sm font-medium px-4 py-2 rounded-md bg-green-100 text-green-800 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Tasks saved successfully to database!
                  </div>
                )}
                
                {/* Error Message */}
                {saveStatus === "error" && (
                  <div className="mt-3 text-sm font-medium px-4 py-2 rounded-md bg-red-100 text-red-800 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Error saving to database. Tasks saved locally.
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Display */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Upcoming Schedule
                </h2>
                <div className="text-gray-500 font-medium">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {Array.isArray(tasks) && tasks.length > 0 ? (
                <>
                  {/* Desktop view (table) - hidden on mobile */}
                  <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {DAYS_OF_WEEK.map((day) => {
                            const isCurrentDay =
                              day ===
                              [
                                "Sunday",
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                              ][new Date().getDay()];
                            const dayColor = (() => {
                              const dayIndex = DAYS_OF_WEEK.indexOf(day);
                              const colors = [
                                "#0ea5e9", // Monday - blue
                                "#22c55e", // Tuesday - green
                                "#eab308", // Wednesday - yellow
                                "#ef4444", // Thursday - red
                                "#a855f7", // Friday - purple
                                "#f97316", // Saturday - orange
                                "#64748b", // Sunday - slate
                              ];
                              return colors[dayIndex] || "#3b82f6";
                            })();

                            return (
                              <th
                                key={day}
                                scope="col"
                                className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                  isCurrentDay
                                    ? "bg-blue-50 border-b-2"
                                    : "text-gray-500 border-b"
                                }`}
                                style={{
                                  borderBottomColor: isCurrentDay
                                    ? dayColor
                                    : undefined,
                                  color: isCurrentDay ? dayColor : undefined,
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold">{day}</span>
                                  <span className="text-xs font-normal opacity-75">
                                    {(() => {
                                      const now = new Date();
                                      const dayNames = [
                                        "Sunday",
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                      ];
                                      const currentDayIndex = dayNames.indexOf(dayNames[now.getDay()]);
                                      const targetDayIndex = dayNames.indexOf(day);
                                      
                                      // Calculate days to add
                                      let daysToAdd = targetDayIndex - currentDayIndex;
                                      if (daysToAdd < 0) daysToAdd += 7;
                                      
                                      const date = new Date();
                                      date.setDate(now.getDate() + daysToAdd);
                                      
                                      return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      });
                                    })()}
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="divide-x divide-gray-100">
                          {DAYS_OF_WEEK.map((day) => {
                            const dayTasks = tasks.filter(task => task.day === day);
                            const isEmpty = dayTasks.length === 0;
                            const dayColor = (() => {
                              const dayIndex = DAYS_OF_WEEK.indexOf(day);
                              const colors = [
                                "#0ea5e9", // Monday - blue
                                "#22c55e", // Tuesday - green
                                "#eab308", // Wednesday - yellow
                                "#ef4444", // Thursday - red
                                "#a855f7", // Friday - purple
                                "#f97316", // Saturday - orange
                                "#64748b", // Sunday - slate
                              ];
                              return colors[dayIndex] || "#3b82f6";
                            })();
                            
                            return (
                              <td
                                key={day}
                                className="px-2 py-2 align-top"
                                style={{ minHeight: "120px" }}
                              >
                                {isEmpty ? (
                                  <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
                                    No tasks
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {dayTasks
                                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                      .map((task) => {
                                        const lightColor = `${dayColor}20`;
                                        return (
                                          <div
                                            key={task.id}
                                            className={`p-2 rounded text-xs hover:bg-gray-50`}
                                            style={{
                                              backgroundColor: undefined,
                                              borderLeft: `2px solid ${dayColor}`
                                            }}
                                          >
                                            <div className="flex justify-between items-center">
                                              <span
                                                className="font-medium text-gray-700"
                                              >
                                                {task.startTime} - {task.endTime}
                                              </span>
                                            </div>
                                            <div
                                              className="mt-1 text-xs font-normal text-gray-600"
                                            >
                                              {task.description}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile view - simplify it for this fix */}
                  <div className="md:hidden space-y-4">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayTasks = tasks.filter(task => task.day === day);
                      if (dayTasks.length === 0) return null;
                      
                      return (
                        <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 py-2 px-3 font-medium border-b border-gray-200">
                            {day}
                          </div>
                          <div className="p-3 space-y-2">
                            {dayTasks
                              .sort((a, b) => a.startTime.localeCompare(b.startTime))
                              .map(task => (
                                <div key={task.id} className="p-2 bg-gray-50 rounded">
                                  <div className="font-medium">{task.startTime} - {task.endTime}</div>
                                  <div className="text-gray-600 mt-1">{task.description}</div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500 mb-1">No upcoming tasks scheduled</p>
                  <p className="text-gray-400 text-sm">
                    Start by adding tasks to your week
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main dashboard component with suspense
export default function Dashboard(): React.ReactNode {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <DashboardContent />
        <NetworkStatus />
      </Suspense>
    </ProtectedRoute>
  );
}
